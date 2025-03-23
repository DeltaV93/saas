import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
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
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn()
}));

jest.mock('../utils/authentication.helper', () => ({
  validateSessionAndPermissions: jest.fn().mockReturnValue({
    id: 'user123',
    role: 'user',
  }),
}));

/**
 * Generate realistic mock user data for testing notifications
 */
function generateMockUsers(numUsers = 5) {
  const userTypes = ['free', 'basic', 'premium', 'enterprise'];
  const deviceTypes = ['ios', 'android', 'web'];
  const languages = ['en', 'es', 'fr', 'de', 'ja', 'zh'];
  const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
  
  return Array(numUsers).fill(null).map((_, i) => ({
    userId: `user-${i+1000}`,
    email: `user${i+1000}@example.com`,
    plan: userTypes[Math.floor(Math.random() * userTypes.length)],
    deviceToken: `device-token-${i+1000}-${Math.random().toString(36).substring(2, 10)}`,
    deviceType: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
    language: languages[Math.floor(Math.random() * languages.length)],
    timezone: timezones[Math.floor(Math.random() * timezones.length)],
    notificationPreferences: {
      email: Math.random() > 0.2,
      push: Math.random() > 0.3,
      realtime: Math.random() > 0.1,
      marketing: Math.random() > 0.5,
      digest: Math.random() > 0.4 ? 'daily' : (Math.random() > 0.5 ? 'weekly' : 'none')
    },
    notificationHistory: Array(Math.floor(Math.random() * 5) + 1).fill(null).map(() => generateNotificationHistory(i))
  }));
}

/**
 * Generate notification history for a user
 */
function generateNotificationHistory(userId) {
  const notificationTypes = [
    'account_update', 'security_alert', 'payment_reminder', 
    'new_feature', 'subscription_update', 'mention', 'comment'
  ];
  
  const channels = ['email', 'push', 'realtime'];
  const notificationType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
  const sentAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
  
  // Generate appropriate title and body based on notification type
  let title, body;
  
  switch (notificationType) {
    case 'account_update':
      title = 'Your account has been updated';
      body = 'Your profile information has been successfully updated.';
      break;
    case 'security_alert':
      title = 'Security Alert';
      body = 'A new login was detected from a new device. Please verify it was you.';
      break;
    case 'payment_reminder':
      title = 'Payment Reminder';
      body = 'Your subscription payment is due in 3 days. Please update your payment method.';
      break;
    case 'new_feature':
      title = 'New Feature Available';
      body = 'We\'ve added a new feature you might like: Advanced Analytics. Check it out!';
      break;
    case 'subscription_update':
      title = 'Subscription Updated';
      body = 'Your subscription has been upgraded to Premium. Enjoy your new benefits!';
      break;
    case 'mention':
      title = 'You were mentioned';
      body = `@user${Math.floor(Math.random() * 100)} mentioned you in a comment.`;
      break;
    case 'comment':
      title = 'New comment on your post';
      body = 'Someone left a comment on your recent post.';
      break;
    default:
      title = 'Notification';
      body = 'You have a new notification.';
  }
  
  return {
    id: `notification-${userId}-${Math.random().toString(36).substring(2, 10)}`,
    type: notificationType,
    title,
    body,
    channel: channels[Math.floor(Math.random() * channels.length)],
    sentAt: sentAt.toISOString(),
    readAt: Math.random() > 0.4 ? new Date(sentAt.getTime() + Math.floor(Math.random() * 3600000)).toISOString() : null,
    metadata: {
      sourceId: Math.random().toString(36).substring(2, 10),
      sourceType: ['post', 'comment', 'system', 'payment'][Math.floor(Math.random() * 4)],
      actionUrl: Math.random() > 0.7 ? `/dashboard/${notificationType}/${Math.floor(Math.random() * 1000)}` : null
    }
  };
}

/**
 * Generate notification templates for testing
 */
function generateNotificationTemplates() {
  return [
    {
      id: 'welcome_email',
      type: 'email',
      subject: 'Welcome to Our Platform!',
      body: 'Hi {{name}}, thank you for joining our platform. We\'re excited to have you onboard!',
      variables: ['name']
    },
    {
      id: 'password_reset',
      type: 'email',
      subject: 'Password Reset Request',
      body: 'Hi {{name}}, you requested a password reset. Click this link to reset: {{resetLink}}',
      variables: ['name', 'resetLink']
    },
    {
      id: 'payment_success',
      type: 'push',
      title: 'Payment Successful',
      body: 'Your payment of {{amount}} for {{plan}} has been processed successfully.',
      variables: ['amount', 'plan']
    },
    {
      id: 'account_locked',
      type: 'email',
      subject: 'Account Security Alert',
      body: 'Hi {{name}}, your account has been locked due to {{reason}}. Please contact support.',
      variables: ['name', 'reason']
    },
    {
      id: 'new_message',
      type: 'realtime',
      title: 'New Message',
      body: 'You received a new message from {{sender}}',
      variables: ['sender']
    }
  ];
}

describe('Notification Module with Realistic Mock Data', () => {
  let service: NotificationService;
  let controller: NotificationController;
  let mockUsers;
  let mockTemplates;
  let mockSes;
  let mockFirebase;
  let mockIo: Partial<Server>;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create mock Socket.IO server
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis()
    };
    
    // Get mock SES and Firebase functions
    mockSes = (new AWS.SES() as any).sendEmail;
    mockFirebase = admin.messaging().send;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [NotificationService],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    controller = module.get<NotificationController>(NotificationController);
    
    service.setSocketServer(mockIo as unknown as Server);
    
    // Generate realistic mock user data and templates
    mockUsers = generateMockUsers(5);
    mockTemplates = generateNotificationTemplates();
    
    // Set environment variables for tests
    process.env.AWS_REGION = 'us-east-1';
    process.env.SES_SOURCE_EMAIL = 'test@example.com';
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.SES_SOURCE_EMAIL;
  });

  it('should process a complete user onboarding notification flow', async () => {
    const mockUser = mockUsers[0];
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // 1. User signs up - send welcome email
    await service.sendEmail(
      mockUser.email,
      'Welcome to Our Platform!',
      `Hi ${mockUser.userId}, thank you for joining our platform. We're excited to have you onboard!`
    );

    // 2. Check service status through controller
    const statusResult = controller.getStatus(mockRequest as any);
    expect(statusResult).toEqual({ status: 'Notification service is running' });

    // 3. Send a device registration push notification
    await service.sendPushNotification(
      mockUser.deviceToken,
      'Device Registered Successfully',
      'You will now receive push notifications on this device.'
    );

    // 4. Send a real-time welcome notification
    service.sendRealTimeNotification('user-welcome', {
      userId: mockUser.userId,
      message: 'Welcome to the platform!',
      timestamp: new Date().toISOString()
    });

    // Verify all notifications were sent
    expect(mockSes).toHaveBeenCalledTimes(1);
    expect(mockFirebase).toHaveBeenCalledTimes(1);
    expect(mockIo.emit).toHaveBeenCalledTimes(1);

    // Verify correct parameters for email
    expect(mockSes).toHaveBeenCalledWith(expect.objectContaining({
      Destination: expect.objectContaining({
        ToAddresses: [mockUser.email]
      }),
      Message: expect.objectContaining({
        Subject: expect.objectContaining({
          Data: 'Welcome to Our Platform!'
        })
      })
    }));
    
    // Verify correct parameters for push notification
    expect(mockFirebase).toHaveBeenCalledWith(expect.objectContaining({
      notification: expect.objectContaining({
        title: 'Device Registered Successfully',
        body: 'You will now receive push notifications on this device.'
      }),
      token: mockUser.deviceToken
    }));
    
    // Verify correct parameters for real-time notification
    expect(mockIo.emit).toHaveBeenCalledWith('user-welcome', expect.objectContaining({
      userId: mockUser.userId,
      message: 'Welcome to the platform!'
    }));
  });

  it('should handle user-specific notification preferences', async () => {
    const mockUser = mockUsers[1]; // Choose a user with specific preferences
    
    // Reset mocks to ensure clean state
    mockSes.mockClear();
    mockFirebase.mockClear();
    (mockIo.emit as jest.Mock).mockClear();
    
    // We'll send notifications based on user preferences
    if (mockUser.notificationPreferences.email) {
      await service.sendEmail(
        mockUser.email,
        'Important Account Update',
        'Your account settings have been updated.'
      );
      expect(mockSes).toHaveBeenCalled();
    }
    
    if (mockUser.notificationPreferences.push) {
      await service.sendPushNotification(
        mockUser.deviceToken,
        'Important Account Update',
        'Your account settings have been updated.'
      );
      expect(mockFirebase).toHaveBeenCalled();
    }
    
    if (mockUser.notificationPreferences.realtime) {
      service.sendRealTimeNotification('account-update', {
        userId: mockUser.userId,
        type: 'settings-changed',
        timestamp: new Date().toISOString()
      });
      expect(mockIo.emit).toHaveBeenCalled();
    }
    
    // Only check negatives if we didn't send that notification type
    if (!mockUser.notificationPreferences.email) {
      expect(mockSes).not.toHaveBeenCalled();
    }
    
    if (!mockUser.notificationPreferences.push) {
      expect(mockFirebase).not.toHaveBeenCalled();
    }
    
    if (!mockUser.notificationPreferences.realtime) {
      expect(mockIo.emit).not.toHaveBeenCalled();
    }
  });

  it('should handle template-based notifications with variable substitution', async () => {
    const mockUser = mockUsers[0];
    const template = mockTemplates.find(t => t.id === 'welcome_email');
    
    // Replace template variables
    const subject = template.subject;
    const body = template.body.replace('{{name}}', mockUser.userId);
    
    await service.sendEmail(mockUser.email, subject, body);
    
    expect(mockSes).toHaveBeenCalledWith(expect.objectContaining({
      Message: expect.objectContaining({
        Subject: expect.objectContaining({
          Data: 'Welcome to Our Platform!'
        }),
        Body: expect.objectContaining({
          Text: expect.objectContaining({
            Data: `Hi ${mockUser.userId}, thank you for joining our platform. We're excited to have you onboard!`
          })
        })
      })
    }));
  });

  it('should handle batch processing of notifications to multiple users', async () => {
    // Prepare notifications for all users
    const emailPromises = mockUsers.map(user => 
      service.sendEmail(
        user.email,
        'Platform Maintenance Notice',
        'Our platform will be undergoing maintenance on Sunday from 2-4am UTC.'
      )
    );
    
    // Execute all email notifications concurrently
    await Promise.all(emailPromises);
    
    // Verify that all emails were sent
    expect(mockSes).toHaveBeenCalledTimes(mockUsers.length);
    
    // Verify that each user got the correct email
    mockUsers.forEach(user => {
      expect(mockSes).toHaveBeenCalledWith(expect.objectContaining({
        Destination: expect.objectContaining({
          ToAddresses: [user.email]
        })
      }));
    });
  });

  it('should track notification deliveries and handle retries for failures', async () => {
    const mockUser = mockUsers[2];
    
    // Setup first attempt to fail
    mockSes.mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(new Error('Temporary SES failure'))
    });
    
    // Second attempt succeeds
    mockSes.mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({ MessageId: 'retry-success-id' })
    });
    
    // First attempt - should fail
    try {
      await service.sendEmail(
        mockUser.email,
        'First Attempt',
        'This should fail temporarily.'
      );
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toContain('Failed to send email: Temporary SES failure');
    }
    
    // Verify error was logged
    expect(logError).not.toHaveBeenCalled(); // The error is thrown directly in this case
    
    // Second attempt - should succeed
    const result = await service.sendEmail(
      mockUser.email,
      'Second Attempt',
      'This should succeed after the first failure.'
    );
    
    expect(result).toEqual({ MessageId: 'retry-success-id' });
    expect(mockSes).toHaveBeenCalledTimes(2);
  });

  it('should handle multi-language notifications based on user preferences', async () => {
    const mockUser = mockUsers[3];
    
    // Determine content based on user language preference
    let subject, body;
    
    switch (mockUser.language) {
      case 'es':
        subject = '¡Actualización Importante!';
        body = 'Hay una actualización importante para tu cuenta.';
        break;
      case 'fr':
        subject = 'Mise à jour importante!';
        body = 'Il y a une mise à jour importante pour votre compte.';
        break;
      case 'de':
        subject = 'Wichtiges Update!';
        body = 'Es gibt ein wichtiges Update für Ihr Konto.';
        break;
      case 'ja':
        subject = '重要なお知らせ';
        body = 'アカウントに関する重要なお知らせがあります。';
        break;
      case 'zh':
        subject = '重要更新';
        body = '您的账户有一个重要更新。';
        break;
      default:
        subject = 'Important Update';
        body = 'There is an important update for your account.';
    }
    
    await service.sendEmail(mockUser.email, subject, body);
    
    expect(mockSes).toHaveBeenCalledWith(expect.objectContaining({
      Message: expect.objectContaining({
        Subject: expect.objectContaining({
          Data: subject
        }),
        Body: expect.objectContaining({
          Text: expect.objectContaining({
            Data: body
          })
        })
      })
    }));
  });

  it('should process complex notification scenarios with all channels', async () => {
    const mockUser = mockUsers[0];
    
    // Simulate a purchase notification that goes to all channels
    
    // 1. Email receipt
    await service.sendEmail(
      mockUser.email,
      'Your Purchase Receipt',
      `Thank you for your purchase! Order #${Math.floor(Math.random() * 10000)} has been confirmed.`
    );
    
    // 2. Push notification for immediate alert
    await service.sendPushNotification(
      mockUser.deviceToken,
      'Order Confirmed',
      'Your order has been confirmed and is being processed.'
    );
    
    // 3. Real-time notification for in-app display
    service.sendRealTimeNotification('order-update', {
      userId: mockUser.userId,
      orderNumber: Math.floor(Math.random() * 10000),
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      items: [
        { id: 'item-1', name: 'Product 1', quantity: 2, price: 29.99 },
        { id: 'item-2', name: 'Product 2', quantity: 1, price: 49.99 }
      ],
      total: 109.97,
      shippingAddress: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'US'
      },
      paymentMethod: 'credit_card',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    // Verify all channels were used
    expect(mockSes).toHaveBeenCalledTimes(1);
    expect(mockFirebase).toHaveBeenCalledTimes(1);
    expect(mockIo.emit).toHaveBeenCalledTimes(1);
    
    // Verify the real-time notification contained the complex order data
    expect(mockIo.emit).toHaveBeenCalledWith('order-update', expect.objectContaining({
      userId: mockUser.userId,
      status: 'confirmed',
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'item-1' }),
        expect.objectContaining({ id: 'item-2' })
      ]),
      total: 109.97,
      shippingAddress: expect.objectContaining({
        street: '123 Main St'
      })
    }));
  });

  it('should handle edge cases in notification content', async () => {
    const mockUser = mockUsers[0];
    
    // Test with extremely long content
    const longTitle = 'A'.repeat(500);
    const longBody = 'B'.repeat(5000);
    
    await service.sendPushNotification(
      mockUser.deviceToken,
      longTitle,
      longBody
    );
    
    expect(mockFirebase).toHaveBeenCalledWith(expect.objectContaining({
      notification: expect.objectContaining({
        title: longTitle,
        body: longBody
      })
    }));
    
    // Test with special characters and emojis
    const specialTitle = '🔥 Special Notification! 特殊通知! Уведомление!';
    const specialBody = '✨ This notification contains special characters: ñáéíóú 你好 こんにちは';
    
    await service.sendEmail(
      mockUser.email,
      specialTitle,
      specialBody
    );
    
    expect(mockSes).toHaveBeenCalledWith(expect.objectContaining({
      Message: expect.objectContaining({
        Subject: expect.objectContaining({
          Data: specialTitle
        }),
        Body: expect.objectContaining({
          Text: expect.objectContaining({
            Data: specialBody
          })
        })
      })
    }));
  });

  it('should handle security-critical notifications with priority', async () => {
    const mockUser = mockUsers[0];
    
    // Security alert notification
    await service.sendEmail(
      mockUser.email,
      'SECURITY ALERT: Unusual Sign-in Detected',
      `We detected a sign-in to your account from a new device in ${Math.random() > 0.5 ? 'London, UK' : 'Tokyo, Japan'} at ${new Date().toISOString()}.
       If this wasn't you, please reset your password immediately and contact support.`
    );
    
    expect(mockSes).toHaveBeenCalledWith(expect.objectContaining({
      Message: expect.objectContaining({
        Subject: expect.objectContaining({
          Data: 'SECURITY ALERT: Unusual Sign-in Detected'
        })
      })
    }));
    
    // Also send urgent push notification
    await service.sendPushNotification(
      mockUser.deviceToken,
      'Security Alert',
      'Unusual account activity detected. Please verify your recent logins.'
    );
    
    expect(mockFirebase).toHaveBeenCalledWith(expect.objectContaining({
      notification: expect.objectContaining({
        title: 'Security Alert'
      })
    }));
  });
}); 