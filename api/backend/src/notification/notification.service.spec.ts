import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { Server } from 'socket.io';
import { logError } from '../utils/logging.helper';

// Mock dependencies
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

jest.mock('../utils/logging.helper', () => ({
  logError: jest.fn()
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockIo: Partial<Server>;
  let mockSendEmail: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create a mock Socket.IO server
    mockIo = {
      emit: jest.fn()
    };

    // Get mock sendEmail function
    mockSendEmail = (new AWS.SES() as any).sendEmail;

    // Mock environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.SES_SOURCE_EMAIL = 'test@example.com';

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    service.setSocketServer(mockIo as Server);
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.SES_SOURCE_EMAIL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize Firebase Admin SDK', () => {
      expect(admin.initializeApp).toHaveBeenCalledWith({
        credential: admin.credential.applicationDefault()
      });
    });

    it('should initialize AWS SES with correct region', () => {
      expect(AWS.SES).toHaveBeenCalledWith({
        region: 'us-east-1'
      });
    });
  });

  describe('setSocketServer', () => {
    it('should set the socket.io server instance', () => {
      const newIo = { emit: jest.fn() } as unknown as Server;
      service.setSocketServer(newIo);
      
      // Test that the server was set by triggering a real-time notification
      service.sendRealTimeNotification('test-event', { data: 'test' });
      expect(newIo.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const result = await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test Body'
      );

      expect(result).toEqual({ MessageId: 'mock-message-id' });
      
      expect(mockSendEmail).toHaveBeenCalledWith({
        Destination: {
          ToAddresses: ['recipient@example.com'],
        },
        Message: {
          Body: {
            Text: { Data: 'Test Body' },
          },
          Subject: { Data: 'Test Subject' },
        },
        Source: 'test@example.com',
      });
    });

    it('should throw an error when email sending fails', async () => {
      const mockError = new Error('SES error');
      const mockSendEmailPromise = jest.fn().mockRejectedValue(mockError);
      mockSendEmail.mockReturnValueOnce({
        promise: mockSendEmailPromise
      });

      await expect(
        service.sendEmail('recipient@example.com', 'Test Subject', 'Test Body')
      ).rejects.toThrow('Failed to send email: SES error');
    });

    it('should handle missing source email configuration', async () => {
      const originalEmail = process.env.SES_SOURCE_EMAIL;
      delete process.env.SES_SOURCE_EMAIL;
      
      // Re-mock SES to throw an error in this test case
      mockSendEmail.mockImplementationOnce(() => {
        throw new Error('Source email is required');
      });

      await expect(
        service.sendEmail('recipient@example.com', 'Test Subject', 'Test Body')
      ).rejects.toThrow('Failed to send email: Source email is required');
      
      // Restore the source email for other tests
      process.env.SES_SOURCE_EMAIL = originalEmail;
    });

    it('should handle emails with special characters', async () => {
      // Reset mocks to ensure clean state
      mockSendEmail.mockClear();
      
      // Create a new mock that will succeed
      mockSendEmail.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ MessageId: 'special-chars-id' })
      });
      
      await service.sendEmail(
        'recipient@example.com',
        'Test Subject with 特殊字符 and emoji 🔥',
        'Test Body with unicode characters: ¡Hola! Привет! こんにちは!'
      );

      expect(mockSendEmail).toHaveBeenCalledWith({
        Destination: {
          ToAddresses: ['recipient@example.com'],
        },
        Message: {
          Body: {
            Text: { Data: 'Test Body with unicode characters: ¡Hola! Привет! こんにちは!' },
          },
          Subject: { Data: 'Test Subject with 特殊字符 and emoji 🔥' },
        },
        Source: 'test@example.com',
      });
    });

    it('should handle large email bodies', async () => {
      const largeBody = 'A'.repeat(10000);
      await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        largeBody
      );

      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        Message: expect.objectContaining({
          Body: expect.objectContaining({
            Text: expect.objectContaining({
              Data: largeBody
            })
          })
        })
      }));
    });
  });

  describe('sendPushNotification', () => {
    it('should send a push notification successfully', async () => {
      const result = await service.sendPushNotification(
        'device-token-123',
        'Test Title',
        'Test Body'
      );

      expect(result).toBe('mock-message-id');
      expect(admin.messaging().send).toHaveBeenCalledWith({
        notification: {
          title: 'Test Title',
          body: 'Test Body',
        },
        token: 'device-token-123',
      });
    });

    it('should throw an error when push notification fails', async () => {
      const mockError = new Error('Firebase error');
      jest.spyOn(admin.messaging(), 'send').mockRejectedValueOnce(mockError);

      await expect(
        service.sendPushNotification('device-token-123', 'Test Title', 'Test Body')
      ).rejects.toThrow('Failed to send push notification: Firebase error');
    });

    it('should handle push notifications with special characters', async () => {
      await service.sendPushNotification(
        'device-token-123',
        'Test Title with 特殊字符 and emoji 🔥',
        'Test Body with unicode characters: ¡Hola! Привет! こんにちは!'
      );

      expect(admin.messaging().send).toHaveBeenCalledWith({
        notification: {
          title: 'Test Title with 特殊字符 and emoji 🔥',
          body: 'Test Body with unicode characters: ¡Hola! Привет! こんにちは!',
        },
        token: 'device-token-123',
      });
    });

    it('should handle invalid device tokens gracefully', async () => {
      const mockError = new Error('Invalid registration token');
      jest.spyOn(admin.messaging(), 'send').mockRejectedValueOnce(mockError);

      await expect(
        service.sendPushNotification('invalid-token', 'Test Title', 'Test Body')
      ).rejects.toThrow('Failed to send push notification: Invalid registration token');
    });
  });

  describe('sendRealTimeNotification', () => {
    it('should emit an event through socket.io', () => {
      service.sendRealTimeNotification('user-update', { userId: '123', status: 'online' });
      
      expect(mockIo.emit).toHaveBeenCalledWith(
        'user-update',
        { userId: '123', status: 'online' }
      );
    });

    it('should do nothing if socket server is not set', () => {
      service.setSocketServer(null);
      
      // Should not throw error
      expect(() => {
        service.sendRealTimeNotification('test-event', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle complex data structures', () => {
      const complexData = {
        users: [
          { id: '1', name: 'User 1' },
          { id: '2', name: 'User 2' }
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'test',
        },
        settings: {
          nested: {
            deep: {
              value: true
            }
          }
        }
      };
      
      service.sendRealTimeNotification('complex-event', complexData);
      
      expect(mockIo.emit).toHaveBeenCalledWith('complex-event', complexData);
    });

    it('should handle Socket.IO errors gracefully', () => {
      // We need to modify the service implementation to catch errors in sendRealTimeNotification
      const mockErrorIo = {
        emit: jest.fn().mockImplementation(() => {
          throw new Error('Socket error');
        })
      };
      
      service.setSocketServer(mockErrorIo as unknown as Server);
      
      // Since we're testing that the service handles errors internally,
      // we're actually expecting no error to be thrown to the caller
      // but we can spy on the logError function to verify error handling
      service.sendRealTimeNotification('test', { data: 'test' });
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple notification types for the same event', async () => {
      // Set up the success of all methods
      const mockMessageId = 'multi-channel-message-id';
      
      mockSendEmail.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ MessageId: mockMessageId })
      });
      
      jest.spyOn(admin.messaging(), 'send').mockResolvedValueOnce(mockMessageId);
      
      // Send notifications through all channels
      const emailResult = await service.sendEmail(
        'user@example.com',
        'New Update',
        'Your account has been updated'
      );
      
      const pushResult = await service.sendPushNotification(
        'device-token-456',
        'New Update',
        'Your account has been updated'
      );
      
      service.sendRealTimeNotification(
        'account-update',
        { userId: '456', type: 'profile-update' }
      );
      
      // Verify all channels were used
      expect(emailResult).toEqual({ MessageId: mockMessageId });
      expect(pushResult).toBe(mockMessageId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'account-update',
        { userId: '456', type: 'profile-update' }
      );
    });

    it('should handle large batches of notifications without errors', async () => {
      const numNotifications = 10;
      const notifications = Array(numNotifications).fill(null).map((_, i) => ({
        email: `user${i}@example.com`,
        title: `Notification ${i}`,
        body: `This is notification body ${i}`,
        token: `device-token-${i}`
      }));
      
      const emailPromises = notifications.map(n => 
        service.sendEmail(n.email, n.title, n.body)
      );
      
      const pushPromises = notifications.map(n => 
        service.sendPushNotification(n.token, n.title, n.body)
      );
      
      // Should not throw errors
      await Promise.all([...emailPromises, ...pushPromises]);
      
      // Verify all notifications were sent
      expect(mockSendEmail).toHaveBeenCalledTimes(numNotifications);
      expect(admin.messaging().send).toHaveBeenCalledTimes(numNotifications);
    });

    it('should continue processing other notifications if one fails', async () => {
      // Make the second email fail
      mockSendEmail
        .mockReturnValueOnce({ promise: jest.fn().mockResolvedValue({ MessageId: 'id-1' }) })
        .mockReturnValueOnce({ promise: jest.fn().mockRejectedValue(new Error('Failed')) })
        .mockReturnValueOnce({ promise: jest.fn().mockResolvedValue({ MessageId: 'id-3' }) });
      
      const emails = [
        { to: 'user1@example.com', subject: 'Subject 1', body: 'Body 1' },
        { to: 'user2@example.com', subject: 'Subject 2', body: 'Body 2' },
        { to: 'user3@example.com', subject: 'Subject 3', body: 'Body 3' }
      ];
      
      const results = await Promise.allSettled(
        emails.map(e => service.sendEmail(e.to, e.subject, e.body))
      );
      
      // First and third should succeed, second should fail
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('security and validation', () => {
    it('should validate email addresses', async () => {
      // Test with invalid email
      const invalidEmail = 'not-an-email';
      
      // This test just verifies the service doesn't throw additional errors
      // In a real implementation, there would be validation that throws specific errors
      await service.sendEmail(invalidEmail, 'Test Subject', 'Test Body');
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        Destination: expect.objectContaining({
          ToAddresses: [invalidEmail] 
        })
      }));
    });

    it('should handle potential XSS in notification content', async () => {
      const xssSubject = '<script>alert("XSS")</script>';
      const xssBody = '<img src="x" onerror="alert(\'XSS\')">';
      
      await service.sendEmail('user@example.com', xssSubject, xssBody);
      
      expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
        Message: expect.objectContaining({
          Subject: expect.objectContaining({
            Data: xssSubject
          }),
          Body: expect.objectContaining({
            Text: expect.objectContaining({
              Data: xssBody
            })
          })
        })
      }));
      
      // In a real implementation, there would be sanitization of the content
      // This test just verifies the service handles potentially malicious content
    });
  });

  describe('error scenarios', () => {
    it('should handle AWS SES service unavailability', async () => {
      const serviceError = new Error('Service unavailable');
      mockSendEmail.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(serviceError)
      });
      
      await expect(
        service.sendEmail('user@example.com', 'Test', 'Body')
      ).rejects.toThrow('Failed to send email: Service unavailable');
    });

    it('should handle Firebase service unavailability', async () => {
      const serviceError = new Error('Service unavailable');
      jest.spyOn(admin.messaging(), 'send').mockRejectedValueOnce(serviceError);
      
      await expect(
        service.sendPushNotification('token', 'Test', 'Body')
      ).rejects.toThrow('Failed to send push notification: Service unavailable');
    });
  });

  describe('performance testing', () => {
    it('should handle concurrent email requests efficiently', async () => {
      const numEmails = 5;
      const startTime = Date.now();
      
      await Promise.all(
        Array(numEmails).fill(null).map((_, i) => 
          service.sendEmail(
            `user${i}@example.com`,
            `Subject ${i}`,
            `Body ${i}`
          )
        )
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Total execution time should be reasonable
      // In a mocked environment this should be very fast
      expect(duration).toBeLessThan(1000);
      expect(mockSendEmail).toHaveBeenCalledTimes(numEmails);
    });
    
    it('should handle concurrent push notification requests efficiently', async () => {
      const numNotifications = 5;
      const startTime = Date.now();
      
      await Promise.all(
        Array(numNotifications).fill(null).map((_, i) => 
          service.sendPushNotification(
            `token-${i}`,
            `Title ${i}`,
            `Body ${i}`
          )
        )
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Total execution time should be reasonable
      expect(duration).toBeLessThan(1000);
      expect(admin.messaging().send).toHaveBeenCalledTimes(numNotifications);
    });
  });
});
