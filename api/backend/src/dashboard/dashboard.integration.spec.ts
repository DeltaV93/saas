import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import * as Mixpanel from 'mixpanel';
import { logError } from '../utils/logging.helper';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { APP_GUARD } from '@nestjs/core';

// Mocks
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
    id: 'test-user-id',
    role: 'user',
  }),
}));

describe('Dashboard Module Integration', () => {
  let dashboardService: DashboardService;
  let dashboardController: DashboardController;
  let mockMixpanel;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Mixpanel mock
    mockMixpanel = {
      track: jest.fn().mockResolvedValue(true),
      people: {
        set: jest.fn().mockResolvedValue(true),
      },
    };
    
    (Mixpanel.init as jest.Mock).mockReturnValue(mockMixpanel);
    
    // Create testing module with dependencies
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        AuthModule,
      ],
      controllers: [DashboardController],
      providers: [
        DashboardService,
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        }
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: jest.fn().mockImplementation(() => true),
    })
    .compile();

    dashboardService = module.get<DashboardService>(DashboardService);
    dashboardController = module.get<DashboardController>(DashboardController);

    // Set environment variable for tests
    process.env.MIXPANEL_TOKEN = 'test-token';
  });

  afterEach(() => {
    // Clean up
    delete process.env.MIXPANEL_TOKEN;
  });

  describe('Module initialization', () => {
    it('should have dashboard service initialized', () => {
      expect(dashboardService).toBeDefined();
    });

    it('should have dashboard controller initialized', () => {
      expect(dashboardController).toBeDefined();
    });

    it('should initialize Mixpanel with a token', () => {
      expect(Mixpanel.init).toHaveBeenCalled();
      // Check that init was called with a string parameter
      expect(typeof (Mixpanel.init as jest.Mock).mock.calls[0][0]).toBe('string');
    });
  });

  describe('Dashboard and Authentication integration', () => {
    it('should validate session when tracking events', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      await dashboardController.trackEvent('test_event', { test: 'property' }, mockRequest as any);

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('test-token', 'user');
      expect(mockMixpanel.track).toHaveBeenCalledWith('test_event', { test: 'property' });
    });

    it('should validate session when tracking user engagement', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      await dashboardController.trackUserEngagement(
        'test-user-id',
        'login',
        { source: 'homepage' },
        mockRequest as any
      );

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('test-token', 'user');
      expect(mockMixpanel.people.set).toHaveBeenCalledWith('test-user-id', { source: 'homepage' });
      expect(mockMixpanel.track).toHaveBeenCalledWith('login', {
        distinct_id: 'test-user-id',
        source: 'homepage',
      });
    });
  });

  describe('Error handling across modules', () => {
    it('should handle authentication failures gracefully', async () => {
      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };

      await expect(
        dashboardController.trackEvent('test_event', { test: 'property' }, mockRequest as any)
      ).rejects.toThrow('Authentication failed');

      // Should not track event if authentication fails
      expect(mockMixpanel.track).not.toHaveBeenCalled();
    });

    it('should handle mixpanel failures without crashing the application', async () => {
      mockMixpanel.track.mockRejectedValueOnce(new Error('Mixpanel error'));

      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      // Should not throw error to the client
      await dashboardController.trackEvent('test_event', { test: 'property' }, mockRequest as any);

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('test-token', 'user');
      expect(mockMixpanel.track).toHaveBeenCalledWith('test_event', { test: 'property' });
      expect(logError).toHaveBeenCalledWith(
        'Failed to track event',
        expect.objectContaining({
          event: 'test_event',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('Complex workflow scenarios', () => {
    it('should track a complete user workflow across modules', async () => {
      const userId = 'integration-test-user';
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      // Step 1: Track user visit
      await dashboardController.trackEvent('page_visit', {
        userId,
        page: 'product-page',
      }, mockRequest as any);

      // Step 2: Track user engagement
      await dashboardController.trackUserEngagement(
        userId,
        'product_interaction',
        { productId: 'product-123', action: 'view_details' },
        mockRequest as any
      );

      // Step 3: Track conversion
      await dashboardController.trackEvent('add_to_cart', {
        userId,
        productId: 'product-123',
        quantity: 1,
      }, mockRequest as any);

      // Verify all events were tracked
      expect(mockMixpanel.track).toHaveBeenCalledTimes(3);
      expect(mockMixpanel.people.set).toHaveBeenCalledTimes(1);

      // Check specific event data tracking
      expect(mockMixpanel.track).toHaveBeenCalledWith('page_visit', {
        userId,
        page: 'product-page',
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith('product_interaction', {
        distinct_id: userId,
        productId: 'product-123',
        action: 'view_details',
      });

      expect(mockMixpanel.track).toHaveBeenCalledWith('add_to_cart', {
        userId,
        productId: 'product-123',
        quantity: 1,
      });
    });
  });

  describe('Performance in integrated environment', () => {
    it('should handle multiple tracking operations efficiently', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      const startTime = Date.now();

      // Track 10 different events in quick succession
      const events = Array(10).fill(null).map((_, i) => `event_${i}`);
      
      for (const event of events) {
        await dashboardController.trackEvent(event, {
          testId: `benchmark-${event}`,
          timestamp: new Date().toISOString(),
        }, mockRequest as any);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(mockMixpanel.track).toHaveBeenCalledTimes(10);
      expect(totalTime).toBeLessThan(1000); // Should take less than 1 second for 10 operations
    });
  });

  describe('Environment configuration integration', () => {
    it('should handle missing Mixpanel token gracefully', async () => {
      // Remove the Mixpanel token
      delete process.env.MIXPANEL_TOKEN;

      // Re-initialize service to trigger the error
      const module: TestingModule = await Test.createTestingModule({
        providers: [DashboardService],
      }).compile();

      const newService = module.get<DashboardService>(DashboardService);

      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token',
        },
      };

      // Create a new controller with this service
      const controller = new DashboardController(newService);

      // Should not throw error to client but log it
      await controller.trackEvent('test_event', { test: 'property' }, mockRequest as any);

      expect(logError).toHaveBeenCalled();
    });
  });
}); 