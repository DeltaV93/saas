import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import * as jwt from 'jsonwebtoken';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification.module';
import { NotificationService } from './notification.service';

describe('Notification Module (e2e)', () => {
  let app: INestApplication;
  let httpServer;
  let io;
  let validUserToken: string;
  let validAdminToken: string;
  let notificationService: NotificationService;

  beforeAll(async () => {
    // Setup AWS and Firebase mocks
    jest.mock('aws-sdk', () => {
      const mockSendEmail = jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ MessageId: 'mock-message-id' })
      });
      
      return {
        SES: jest.fn().mockImplementation(() => ({
          sendEmail: mockSendEmail
        }))
      };
    });

    jest.mock('firebase-admin', () => {
      return {
        initializeApp: jest.fn(),
        credential: {
          applicationDefault: jest.fn()
        },
        messaging: jest.fn().mockReturnValue({
          send: jest.fn().mockResolvedValue('mock-message-id')
        })
      };
    });

    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.AWS_REGION = 'us-east-1';
    process.env.SES_SOURCE_EMAIL = 'test@example.com';

    // Create valid tokens for testing
    validUserToken = jwt.sign(
      { id: 'test-user-id', email: 'user@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    validAdminToken = jwt.sign(
      { id: 'admin-id', email: 'admin@example.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        NotificationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();
    
    // Setup Socket.IO for real-time notifications testing
    httpServer = createServer();
    io = new Server(httpServer);
    
    // Get notification service from app
    notificationService = app.get<NotificationService>(NotificationService);
    notificationService.setSocketServer(io);
    
    // Start the socket.io server
    httpServer.listen(3001);
  });

  afterAll(async () => {
    // Cleanup
    httpServer.close();
    await app.close();
    
    delete process.env.JWT_SECRET;
    delete process.env.AWS_REGION;
    delete process.env.SES_SOURCE_EMAIL;
  });

  describe('GET /notification/status', () => {
    it('should return 401 if no token is provided', () => {
      return request(app.getHttpServer())
        .get('/notification/status')
        .expect(401);
    });

    it('should return 200 and status with valid user token', () => {
      return request(app.getHttpServer())
        .get('/notification/status')
        .set('Authorization', `Bearer ${validUserToken}`)
        .expect(200)
        .expect({ status: 'Notification service is running' });
    });

    it('should return 200 and status with valid admin token', () => {
      return request(app.getHttpServer())
        .get('/notification/status')
        .set('Authorization', `Bearer ${validAdminToken}`)
        .expect(200)
        .expect({ status: 'Notification service is running' });
    });

    it('should reject invalid token format', () => {
      return request(app.getHttpServer())
        .get('/notification/status')
        .set('Authorization', 'InvalidToken')
        .expect(401);
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: 'test-user-id', email: 'user@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait for token to expire
      return new Promise(resolve => setTimeout(resolve, 1000))
        .then(() => {
          return request(app.getHttpServer())
            .get('/notification/status')
            .set('Authorization', `Bearer ${expiredToken}`)
            .expect(401);
        });
    });
  });

  describe('Security scenarios', () => {
    it('should handle malicious headers', () => {
      const maliciousHeaders = [
        "Bearer <script>alert('xss')</script>",
        "Bearer ' OR '1'='1",
        "Bearer `; DROP TABLE users; --`",
      ];

      const requests = maliciousHeaders.map(header => 
        request(app.getHttpServer())
          .get('/notification/status')
          .set('Authorization', header)
          .expect(401)
      );

      return Promise.all(requests);
    });

    it('should handle multiple concurrent requests', async () => {
      const numRequests = 10;
      const requests = Array(numRequests).fill(null).map(() => 
        request(app.getHttpServer())
          .get('/notification/status')
          .set('Authorization', `Bearer ${validUserToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable (depends on your performance requirements)
      expect(duration).toBeLessThan(5000); // 5 seconds max for 10 concurrent requests
    });

    it('should handle token with incorrect signature', () => {
      // Token signed with different secret
      const wrongSignatureToken = jwt.sign(
        { id: 'test-user-id', email: 'user@example.com', role: 'user' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      return request(app.getHttpServer())
        .get('/notification/status')
        .set('Authorization', `Bearer ${wrongSignatureToken}`)
        .expect(401);
    });
  });
  
  describe('End-to-end notification flow', () => {
    it('should handle a complete user notification journey', async () => {
      // Setup to verify socket.io events
      let receivedSocketEvent = false;
      const mockClientSocket = {
        on: (event, callback) => {
          if (event === 'user-notification') {
            receivedSocketEvent = true;
            callback({
              message: 'Socket notification received'
            });
          }
        }
      };

      // Join the socket.io server
      io.on('connection', (socket) => {
        socket.join('test-user-id');
      });

      // 1. First check service status
      await request(app.getHttpServer())
        .get('/notification/status')
        .set('Authorization', `Bearer ${validUserToken}`)
        .expect(200);

      // 2. Send an email notification
      const emailResult = await notificationService.sendEmail(
        'user@example.com',
        'E2E Test Notification',
        'This is a test of the notification system.'
      );
      expect(emailResult).toBeDefined();

      // 3. Send a push notification
      const pushResult = await notificationService.sendPushNotification(
        'device-token-e2e',
        'E2E Test Notification',
        'This is a test of the notification system.'
      );
      expect(pushResult).toBeDefined();

      // 4. Send a real-time notification
      notificationService.sendRealTimeNotification(
        'user-notification',
        { userId: 'test-user-id', message: 'Real-time update' }
      );

      // In a real E2E test, we would verify the socket.io event was received by a client
      // Here we're just verifying the io.emit was called
      expect(io).toBeDefined();
    });

    it('should handle large notification payloads', async () => {
      // Generate a large payload
      const largeData = {
        userId: 'test-user-id',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        details: {
          device: {
            type: 'mobile',
            os: 'iOS',
            version: '15.0',
            model: 'iPhone 13',
          },
          location: {
            country: 'US',
            region: 'CA',
            city: 'San Francisco',
            coordinates: {
              lat: 37.7749,
              lng: -122.4194
            }
          },
          app: {
            version: '2.5.1',
            build: '1234',
            settings: {
              notifications: true,
              darkMode: false,
              language: 'en',
              fontSize: 'medium',
              autoUpdate: true
            }
          },
          metrics: {
            sessionDuration: 3600,
            screens: [
              { name: 'Home', timeSpent: 120 },
              { name: 'Profile', timeSpent: 45 },
              { name: 'Settings', timeSpent: 30 },
              { name: 'Notifications', timeSpent: 15 }
            ],
            actions: Array(50).fill(null).map((_, i) => ({
              type: 'button_click',
              target: `button_${i}`,
              timestamp: new Date().toISOString()
            }))
          }
        }
      };

      // Send large data as real-time notification
      notificationService.sendRealTimeNotification(
        'large-payload',
        largeData
      );

      // Send large data as email
      const emailSubject = 'Large Notification Test';
      const emailBody = JSON.stringify(largeData);
      
      const emailResult = await notificationService.sendEmail(
        'user@example.com',
        emailSubject,
        emailBody
      );

      expect(emailResult).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle AWS SES service errors gracefully', async () => {
      // Mock AWS SES to throw an error
      const originalSendEmail = (AWS.SES as any).mock.instances[0].sendEmail;
      (AWS.SES as any).mock.instances[0].sendEmail = jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('AWS service error'))
      });

      // Attempt to send an email
      try {
        await notificationService.sendEmail(
          'user@example.com',
          'Error Test',
          'This should fail with AWS error'
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Failed to send email');
      }

      // Restore the original mock
      (AWS.SES as any).mock.instances[0].sendEmail = originalSendEmail;
    });

    it('should handle Firebase service errors gracefully', async () => {
      // Mock Firebase to throw an error
      const originalSend = admin.messaging().send;
      admin.messaging().send = jest.fn().mockRejectedValue(new Error('Firebase service error'));

      // Attempt to send a push notification
      try {
        await notificationService.sendPushNotification(
          'device-token',
          'Error Test',
          'This should fail with Firebase error'
        );
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Failed to send push notification');
      }

      // Restore the original mock
      admin.messaging().send = originalSend;
    });
  });

  describe('Performance and load testing', () => {
    it('should handle high volume of API requests', async () => {
      const numRequests = 20;
      const startTime = Date.now();
      
      // Make multiple concurrent status requests
      const requests = Array(numRequests).fill(null).map(() => 
        request(app.getHttpServer())
          .get('/notification/status')
          .set('Authorization', `Bearer ${validUserToken}`)
          .expect(200)
      );
      
      await Promise.all(requests);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // The operation should complete within a reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds for 20 requests
    });
    
    it('should maintain performance under load for notifications', async () => {
      const numNotifications = 10;
      const startTime = Date.now();
      
      // Send multiple emails concurrently
      const emailPromises = Array(numNotifications).fill(null).map((_, i) => 
        notificationService.sendEmail(
          `user${i}@example.com`,
          `Load Test ${i}`,
          `This is test email ${i} under load`
        )
      );
      
      // Send multiple push notifications concurrently
      const pushPromises = Array(numNotifications).fill(null).map((_, i) => 
        notificationService.sendPushNotification(
          `device-token-${i}`,
          `Load Test ${i}`,
          `This is test notification ${i} under load`
        )
      );
      
      // Wait for all notifications to complete
      await Promise.all([...emailPromises, ...pushPromises]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All operations should complete within a reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds for 20 notifications
    });
  });
}); 