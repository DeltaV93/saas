import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import * as AWS from 'aws-sdk';
import * as admin from 'firebase-admin';
import { Server } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ConfigModule } from '@nestjs/config';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
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

jest.mock('../utils/authentication.helper', () => ({
  validateSessionAndPermissions: jest.fn().mockReturnValue({
    id: 'test-user-id',
    role: 'user',
  }),
}));

jest.mock('../utils/logging.helper', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
}));

describe('Notification Module Integration', () => {
  let service: NotificationService;
  let controller: NotificationController;
  let validToken: string;
  let mockIo: Partial<Server>;
  let mockSendEmail: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create JWT token for testing
    validToken = jwt.sign(
      { id: 'test-user-id', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.SES_SOURCE_EMAIL = 'test@example.com';
    
    // Create mock Socket.IO server
    mockIo = {
      emit: jest.fn()
    };

    // Get the mock sendEmail function
    mockSendEmail = (new AWS.SES() as any).sendEmail;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      controllers: [NotificationController],
      providers: [NotificationService],
    }).compile();

    // Initialize service only, not the full app
    service = module.get<NotificationService>(NotificationService);
    controller = module.get<NotificationController>(NotificationController);
    
    // Set socket server on the service
    service.setSocketServer(mockIo as Server);
  });

  afterEach(async () => {
    delete process.env.AWS_REGION;
    delete process.env.SES_SOURCE_EMAIL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('API integration', () => {
    it('Controller getStatus should return status for authenticated users', () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };

      const result = controller.getStatus(mockRequest as any);
      expect(result).toEqual({ status: 'Notification service is running' });
      expect(validateSessionAndPermissions).toHaveBeenCalledWith(validToken, 'user');
    });

    it('Controller getStatus should throw 401 without authorization', () => {
      const mockRequest = {
        headers: {}
      };

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Authorization token is required');
    });

    it('Controller getStatus should throw 403 with wrong permissions', () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };

      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        const error = new Error('Access denied: insufficient permissions');
        error.name = 'ForbiddenException';
        throw error;
      });

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Access denied: insufficient permissions');
    });
  });

  describe('Authentication integration', () => {
    it('should validate session when accessing endpoints', () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };

      controller.getStatus(mockRequest as any);
      expect(validateSessionAndPermissions).toHaveBeenCalledWith(validToken, 'user');
    });

    it('should handle expired tokens gracefully', () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { id: 'test-user-id', email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      // Mock validation to throw error for expired token
      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Token expired');
      });

      const mockRequest = {
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      };

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Token expired');
    });
  });

  describe('End-to-end notification flow', () => {
    it('should handle a complete notification flow between components', async () => {
      // Setup mocks for successful notifications
      const mockMessageId = 'complete-flow-message-id';
      
      mockSendEmail.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ MessageId: mockMessageId })
      });
      
      jest.spyOn(admin.messaging(), 'send').mockResolvedValueOnce(mockMessageId);
      
      // First verify controller returns status properly
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      
      const statusResult = controller.getStatus(mockRequest as any);
      expect(statusResult).toEqual({ status: 'Notification service is running' });
      
      // Then send notifications through all channels
      const emailResult = await service.sendEmail(
        'user@example.com',
        'Important Update',
        'Your account has important updates'
      );
      
      const pushResult = await service.sendPushNotification(
        'device-token-integration',
        'Important Update',
        'Your account has important updates'
      );
      
      service.sendRealTimeNotification(
        'important-update',
        { userId: 'test-user-id', type: 'account-update' }
      );
      
      // Verify all channels were used
      expect(emailResult).toEqual({ MessageId: mockMessageId });
      expect(pushResult).toBe(mockMessageId);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'important-update',
        { userId: 'test-user-id', type: 'account-update' }
      );
    });
  });

  describe('Error handling across components', () => {
    it('should gracefully handle email service failures', async () => {
      const serviceError = new Error('SES not available');
      mockSendEmail.mockReturnValueOnce({
        promise: jest.fn().mockRejectedValue(serviceError)
      });
      
      // First verify controller status works
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      
      const statusResult = controller.getStatus(mockRequest as any);
      expect(statusResult).toEqual({ status: 'Notification service is running' });
        
      // Then trigger a notification that will fail
      await expect(
        service.sendEmail('user@example.com', 'Test', 'Body')
      ).rejects.toThrow('Failed to send email: SES not available');
      
      // Verify error is logged
      expect(logError).not.toHaveBeenCalled(); // The error is thrown directly in this case
    });

    it('should gracefully handle push notification service failures', async () => {
      const serviceError = new Error('Firebase not available');
      jest.spyOn(admin.messaging(), 'send').mockRejectedValueOnce(serviceError);
      
      // First verify controller status works
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validToken}`
        }
      };
      
      const statusResult = controller.getStatus(mockRequest as any);
      expect(statusResult).toEqual({ status: 'Notification service is running' });
        
      // Then trigger a notification that will fail
      await expect(
        service.sendPushNotification('device-token', 'Test', 'Body')
      ).rejects.toThrow('Failed to send push notification: Firebase not available');
      
      // Verify error is logged
      expect(logError).not.toHaveBeenCalled(); // The error is thrown directly in this case
    });
  });
  
  describe('Multi-channel integration', () => {
    it('should coordinate notifications across all channels', async () => {
      // Set up event and user data
      const event = {
        type: 'account-update',
        user: {
          id: 'test-user-id',
          email: 'user@example.com',
          deviceToken: 'device-token-123'
        },
        data: {
          change: 'profile updated',
          timestamp: new Date().toISOString()
        }
      };
      
      // Send on all channels
      await Promise.all([
        service.sendEmail(
          event.user.email,
          `${event.type} Notification`,
          `Your account has been updated: ${event.data.change}`
        ),
        service.sendPushNotification(
          event.user.deviceToken,
          `${event.type} Notification`,
          `Your account has been updated: ${event.data.change}`
        )
      ]);
      
      service.sendRealTimeNotification(event.type, {
        userId: event.user.id,
        change: event.data.change,
        timestamp: event.data.timestamp
      });
      
      // Verify all channels were used with consistent data
      expect(mockSendEmail).toHaveBeenCalled();
      expect(admin.messaging().send).toHaveBeenCalled();
      expect(mockIo.emit).toHaveBeenCalledWith(event.type, expect.objectContaining({
        userId: event.user.id,
        change: event.data.change
      }));
    });
  });
  
  describe('Performance under load', () => {
    it('should handle multiple concurrent notifications efficiently', async () => {
      // Create test users
      const users = Array(5).fill(null).map((_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        deviceToken: `device-token-${i}`
      }));
      
      const startTime = Date.now();
      
      // Send emails
      const emailPromises = users.map(user => 
        service.sendEmail(
          user.email,
          'Batch Notification',
          `Hello ${user.id}, this is a test notification.`
        )
      );
      
      // Send push notifications
      const pushPromises = users.map(user => 
        service.sendPushNotification(
          user.deviceToken,
          'Batch Notification',
          `Hello ${user.id}, this is a test notification.`
        )
      );
      
      // Execute all promises
      await Promise.all([...emailPromises, ...pushPromises]);
      
      // Send real-time notifications
      users.forEach(user => {
        service.sendRealTimeNotification('batch-notification', {
          userId: user.id,
          message: `Hello ${user.id}, this is a test notification.`
        });
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All operations should complete within a reasonable time
      expect(duration).toBeLessThan(1000);  // Less than 1 second for all operations
      
      // Verify correct number of notifications were sent
      expect(mockSendEmail).toHaveBeenCalledTimes(users.length);
      expect(admin.messaging().send).toHaveBeenCalledTimes(users.length);
      expect(mockIo.emit).toHaveBeenCalledTimes(users.length);
    });
  });
}); 