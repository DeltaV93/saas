import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import * as Mixpanel from 'mixpanel';
import { logError } from '../utils/logging.helper';

// Mock dependencies
jest.mock('mixpanel', () => ({
  init: jest.fn().mockReturnValue({
    track: jest.fn().mockResolvedValue(true),
    people: {
      set: jest.fn().mockResolvedValue(true),
    },
  }),
}));

jest.mock('../utils/logging.helper', () => ({
  logError: jest.fn(),
}));

jest.mock('../utils/authentication.helper', () => ({
  validateSessionAndPermissions: jest.fn().mockReturnValue({
    id: 'user123',
    role: 'user',
  }),
}));

/**
 * Generate realistic mock user engagement data for testing
 */
function generateMockUserData(numUsers = 5) {
  const userTypes = ['free', 'basic', 'premium', 'enterprise'];
  const deviceTypes = ['desktop', 'mobile', 'tablet'];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  const countries = ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN'];
  const referrers = ['Google', 'Facebook', 'Twitter', 'Direct', 'Newsletter', 'Partner'];
  
  return Array(numUsers).fill(null).map((_, i) => ({
    userId: `user-${i+1000}`,
    email: `user${i+1000}@example.com`,
    plan: userTypes[Math.floor(Math.random() * userTypes.length)],
    sessions: Array(Math.floor(Math.random() * 5) + 1).fill(null).map((_, j) => ({
      sessionId: `session-${i}-${j}`,
      device: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
      browser: browsers[Math.floor(Math.random() * browsers.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      referrer: referrers[Math.floor(Math.random() * referrers.length)],
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      duration: Math.floor(Math.random() * 3600) + 60, // 1-60 minutes in seconds
      events: Array(Math.floor(Math.random() * 10) + 3).fill(null).map(() => generateRandomEvent())
    }))
  }));
}

/**
 * Generate random analytics events
 */
function generateRandomEvent() {
  const eventTypes = [
    'page_view', 'button_click', 'form_submit', 'signup', 'login', 
    'subscription_change', 'feature_usage', 'error', 'search', 'download'
  ];
  
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const timestamp = new Date(Date.now() - Math.floor(Math.random() * 60 * 60 * 1000)).toISOString();
  
  // Base properties all events will have
  const baseProps = {
    timestamp,
    eventType,
  };
  
  // Add event-specific properties
  switch (eventType) {
    case 'page_view':
      return {
        ...baseProps,
        page: ['home', 'pricing', 'dashboard', 'settings', 'profile'][Math.floor(Math.random() * 5)],
        referrer: ['direct', 'search', 'social', 'email'][Math.floor(Math.random() * 4)],
        loadTime: Math.floor(Math.random() * 5000) + 500, // 500-5500ms
      };
    case 'button_click':
      return {
        ...baseProps,
        buttonId: ['submit', 'cancel', 'upgrade', 'save', 'delete'][Math.floor(Math.random() * 5)],
        page: ['home', 'pricing', 'dashboard', 'settings', 'profile'][Math.floor(Math.random() * 5)],
      };
    case 'form_submit':
      return {
        ...baseProps,
        formId: ['contact', 'signup', 'settings', 'payment'][Math.floor(Math.random() * 4)],
        success: Math.random() > 0.2, // 80% success rate
        fieldCount: Math.floor(Math.random() * 10) + 2,
        timeToComplete: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
      };
    case 'signup':
      return {
        ...baseProps,
        method: ['email', 'google', 'facebook', 'github'][Math.floor(Math.random() * 4)],
        plan: ['free', 'basic', 'premium', 'enterprise'][Math.floor(Math.random() * 4)],
        referral: Math.random() > 0.7, // 30% referral rate
      };
    case 'login':
      return {
        ...baseProps,
        method: ['email', 'google', 'facebook', 'github'][Math.floor(Math.random() * 4)],
        success: Math.random() > 0.1, // 90% success rate
        newDevice: Math.random() > 0.7, // 30% new device
      };
    case 'subscription_change':
      return {
        ...baseProps,
        oldPlan: ['free', 'basic', 'premium'][Math.floor(Math.random() * 3)],
        newPlan: ['basic', 'premium', 'enterprise'][Math.floor(Math.random() * 3)],
        annual: Math.random() > 0.5, // 50% annual
        discount: Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 5 : 0, // 30% have discounts
      };
    case 'feature_usage':
      return {
        ...baseProps,
        feature: ['export', 'reports', 'automation', 'integration', 'api'][Math.floor(Math.random() * 5)],
        duration: Math.floor(Math.random() * 600) + 10, // 10-610 seconds
        success: Math.random() > 0.15, // 85% success rate
      };
    case 'error':
      return {
        ...baseProps,
        errorCode: [400, 401, 403, 404, 500, 503][Math.floor(Math.random() * 6)],
        message: ['Not found', 'Unauthorized', 'Server error', 'Invalid request'][Math.floor(Math.random() * 4)],
        context: ['api', 'frontend', 'payment', 'authentication'][Math.floor(Math.random() * 4)],
      };
    case 'search':
      return {
        ...baseProps,
        query: ['pricing', 'feature', 'help', 'contact', 'integration'][Math.floor(Math.random() * 5)],
        resultCount: Math.floor(Math.random() * 20),
        clickedResult: Math.random() > 0.3, // 70% click through rate
      };
    case 'download':
      return {
        ...baseProps,
        fileType: ['pdf', 'csv', 'zip', 'report'][Math.floor(Math.random() * 4)],
        fileSize: Math.floor(Math.random() * 10000) + 50, // 50-10050 KB
        success: Math.random() > 0.05, // 95% success rate
      };
    default:
      return baseProps;
  }
}

describe('Dashboard Module with Realistic Mock Data', () => {
  let service: DashboardService;
  let controller: DashboardController;
  let mockMixpanel;
  let mockUsers;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    mockMixpanel = {
      track: jest.fn().mockResolvedValue(true),
      people: {
        set: jest.fn().mockResolvedValue(true),
      },
    };
    
    (Mixpanel.init as jest.Mock).mockReturnValue(mockMixpanel);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: {
            trackEvent: jest.fn().mockImplementation((event, properties) => {
              mockMixpanel.track(event, properties);
              return Promise.resolve();
            }),
            trackUserEngagement: jest.fn().mockImplementation((userId, event, properties) => {
              mockMixpanel.people.set(userId, properties);
              mockMixpanel.track(event, { distinct_id: userId, ...properties });
              return Promise.resolve();
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    controller = module.get<DashboardController>(DashboardController);
    
    // Generate realistic mock user data
    mockUsers = generateMockUserData(5);
    
    // Set environment variable for tests
    process.env.MIXPANEL_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.MIXPANEL_TOKEN;
  });

  it('should process a realistic user session with multiple events', async () => {
    const mockUser = mockUsers[0];
    const mockSession = mockUser.sessions[0];
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // Track session start
    await controller.trackEvent('session_start', {
      userId: mockUser.userId,
      sessionId: mockSession.sessionId,
      device: mockSession.device,
      browser: mockSession.browser,
      country: mockSession.country,
      referrer: mockSession.referrer,
    }, mockRequest as any);

    // Track each event in the session
    for (const event of mockSession.events) {
      await controller.trackEvent(event.eventType, {
        userId: mockUser.userId,
        sessionId: mockSession.sessionId,
        ...event,
      }, mockRequest as any);
    }

    // Track session end
    await controller.trackEvent('session_end', {
      userId: mockUser.userId,
      sessionId: mockSession.sessionId,
      duration: mockSession.duration,
      eventCount: mockSession.events.length,
    }, mockRequest as any);

    // Verify tracking
    expect(mockMixpanel.track).toHaveBeenCalledTimes(mockSession.events.length + 2); // +2 for session start/end
    expect(validateSessionAndPermissions).toHaveBeenCalledTimes(mockSession.events.length + 2);
  });

  it('should handle user profile updates through engagement tracking', async () => {
    const mockUser = mockUsers[0];
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    const userProperties = {
      $email: mockUser.email,
      $name: `Test User ${mockUser.userId}`,
      plan: mockUser.plan,
      signupDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      totalSessions: mockUser.sessions.length,
      browser: mockUser.sessions[0].browser,
      device: mockUser.sessions[0].device,
      country: mockUser.sessions[0].country,
    };

    await controller.trackUserEngagement(
      mockUser.userId,
      'user_profile_update',
      userProperties,
      mockRequest as any
    );

    expect(mockMixpanel.people.set).toHaveBeenCalledWith(mockUser.userId, userProperties);
    expect(mockMixpanel.track).toHaveBeenCalledWith('user_profile_update', {
      distinct_id: mockUser.userId,
      ...userProperties,
    });
  });

  it('should track multiple users concurrently without interference', async () => {
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // Spy on service methods instead of relying on mock calls
    const trackEventSpy = jest.spyOn(service, 'trackEvent');
    const trackUserEngagementSpy = jest.spyOn(service, 'trackUserEngagement');

    // Create a batch of tracking operations for all users
    const trackingPromises = mockUsers.flatMap(user => {
      const session = user.sessions[0];
      return [
        // Start session
        controller.trackEvent('session_start', {
          userId: user.userId,
          sessionId: session.sessionId,
          timestamp: new Date().toISOString(),
        }, mockRequest as any),
        
        // Track first event
        controller.trackEvent(session.events[0].eventType, {
          userId: user.userId,
          sessionId: session.sessionId,
          ...session.events[0],
        }, mockRequest as any),
        
        // Update user profile
        controller.trackUserEngagement(user.userId, 'login', {
          plan: user.plan,
          device: session.device,
        }, mockRequest as any)
      ];
    });

    // Execute all tracking operations concurrently
    await Promise.all(trackingPromises);

    // Should track events for all users
    expect(trackEventSpy).toHaveBeenCalledTimes(mockUsers.length * 2); // Each user has 2 trackEvent calls
    expect(trackUserEngagementSpy).toHaveBeenCalledTimes(mockUsers.length); // Each user has 1 trackUserEngagement call

    // Verify no errors were logged
    expect(logError).not.toHaveBeenCalled();
    
    // Verify tracking for the first user's data as a sample check
    expect(trackEventSpy).toHaveBeenCalledWith('session_start', expect.objectContaining({
      userId: mockUsers[0].userId,
    }));
    
    expect(trackUserEngagementSpy).toHaveBeenCalledWith(
      mockUsers[0].userId,
      'login',
      expect.objectContaining({
        plan: mockUsers[0].plan,
      })
    );
  });

  it('should build a comprehensive funnel of user conversion', async () => {
    const mockUser = mockUsers[0];
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // Conversion funnel steps
    const funnelSteps = [
      { event: 'page_view', properties: { page: 'landing_page', referrer: 'google', userId: mockUser.userId } },
      { event: 'signup_start', properties: { method: 'email', userId: mockUser.userId } },
      { event: 'form_submit', properties: { formId: 'signup', success: true, userId: mockUser.userId } },
      { event: 'signup_complete', properties: { plan: 'free', userId: mockUser.userId } },
      { event: 'email_verification', properties: { success: true, userId: mockUser.userId } },
      { event: 'first_login', properties: { device: 'desktop', userId: mockUser.userId } },
      { event: 'onboarding_start', properties: { step: 1, userId: mockUser.userId } },
      { event: 'onboarding_complete', properties: { completion: 100, userId: mockUser.userId } },
      { event: 'feature_usage', properties: { feature: 'dashboard', userId: mockUser.userId } },
      { event: 'subscription_change', properties: { oldPlan: 'free', newPlan: 'premium', userId: mockUser.userId } }
    ];

    // Track each step in the funnel
    for (const step of funnelSteps) {
      await controller.trackEvent(step.event, step.properties, mockRequest as any);
    }

    // Record user conversion
    await controller.trackUserEngagement(mockUser.userId, 'conversion', {
      initialPlan: 'free',
      convertedPlan: 'premium',
      daysToConversion: 7,
      revenue: 99.99
    }, mockRequest as any);

    // Verify tracking of all funnel steps
    expect(mockMixpanel.track).toHaveBeenCalledTimes(funnelSteps.length + 1); // +1 for user engagement
    expect(mockMixpanel.people.set).toHaveBeenCalledTimes(1);

    // Verify each step was tracked with the right event name
    funnelSteps.forEach(step => {
      expect(mockMixpanel.track).toHaveBeenCalledWith(step.event, step.properties);
    });
  });

  it('should handle batch processing of historical event data', async () => {
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // Flatten all user sessions and events for bulk processing
    const allEvents = mockUsers.flatMap(user => 
      user.sessions.flatMap(session => 
        session.events.map(event => ({
          ...event,
          userId: user.userId,
          sessionId: session.sessionId,
        }))
      )
    );

    // Process in batches of 10
    const BATCH_SIZE = 10;
    let processed = 0;
    
    for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
      const batch = allEvents.slice(i, i + BATCH_SIZE);
      
      const trackingPromises = batch.map(event => 
        controller.trackEvent(event.eventType, {
          ...event,
          processed_in_batch: true,
          batch_timestamp: new Date().toISOString(),
        }, mockRequest as any)
      );
      
      await Promise.all(trackingPromises);
      processed += batch.length;
    }

    // Verify all events were processed
    expect(mockMixpanel.track).toHaveBeenCalledTimes(allEvents.length);
    expect(processed).toBe(allEvents.length);
  });

  it('should handle analytics for error conditions gracefully', async () => {
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // Simulate error events
    const errorEvents = [
      { type: 'api_error', code: 500, message: 'Internal server error', component: 'user_service' },
      { type: 'validation_error', code: 400, message: 'Invalid input', component: 'form_handler' },
      { type: 'auth_error', code: 401, message: 'Unauthorized', component: 'auth_service' },
      { type: 'payment_error', code: 402, message: 'Payment required', component: 'billing_service' },
      { type: 'not_found', code: 404, message: 'Resource not found', component: 'data_service' },
    ];

    // Track each error
    for (const error of errorEvents) {
      await controller.trackEvent('error', {
        error_type: error.type,
        error_code: error.code,
        error_message: error.message,
        component: error.component,
        timestamp: new Date().toISOString(),
        user_id: mockUsers[0].userId,
      }, mockRequest as any);
    }

    // Verify all errors were tracked
    expect(mockMixpanel.track).toHaveBeenCalledTimes(errorEvents.length);
    
    // Verify error details were included
    expect(mockMixpanel.track).toHaveBeenCalledWith('error', expect.objectContaining({
      error_type: 'api_error',
      error_code: 500,
    }));
  });

  it('should handle complex nested user behavior patterns', async () => {
    const mockUser = mockUsers[0];
    const mockRequest = {
      headers: { authorization: 'Bearer valid-token' },
    };

    // Simulate a complex user workflow with nested actions
    const workflow = {
      main_action: 'project_creation',
      timestamp: new Date().toISOString(),
      user_id: mockUser.userId,
      project: {
        id: 'proj-123',
        name: 'Test Project',
        template: 'marketing',
        settings: {
          privacy: 'private',
          collaboration: true,
          notifications: {
            email: true,
            push: false,
            frequency: 'daily'
          }
        }
      },
      steps_completed: [
        { step: 'info', duration: 45, success: true },
        { step: 'team', duration: 120, success: true },
        { step: 'settings', duration: 30, success: true },
        { step: 'integrations', duration: 60, success: false }
      ],
      total_duration: 255,
      completion_rate: 75
    };

    await controller.trackEvent('complex_workflow', workflow, mockRequest as any);

    // Verify the complex event was tracked with all nested data
    expect(mockMixpanel.track).toHaveBeenCalledWith('complex_workflow', workflow);
  });
}); 