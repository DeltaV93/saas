import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import * as Mixpanel from 'mixpanel';
import { logError } from '../utils/logging.helper';

// Mock external dependencies
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

// Mock environment variable
const originalEnv = process.env;

describe('DashboardService', () => {
  let service: DashboardService;
  let mockMixpanel;

  beforeEach(async () => {
    process.env = { ...originalEnv, MIXPANEL_TOKEN: 'test-token' };
    
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
      providers: [DashboardService],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize Mixpanel with the token from environment variables', () => {
      expect(Mixpanel.init).toHaveBeenCalledWith('test-token');
    });

    it('should log error when MIXPANEL_TOKEN is not defined', async () => {
      process.env.MIXPANEL_TOKEN = undefined;
      
      // Re-instantiate the service with empty token
      jest.clearAllMocks();
      await Test.createTestingModule({
        providers: [DashboardService],
      }).compile();

      expect(logError).toHaveBeenCalledWith('Failed to initialize Mixpanel', expect.any(Error));
    });
  });

  describe('trackEvent', () => {
    it('should track an event with properties', async () => {
      const event = 'button_click';
      const properties = { button_id: 'submit', page: 'signup' };

      await service.trackEvent(event, properties);

      expect(mockMixpanel.track).toHaveBeenCalledWith(event, properties);
    });

    it('should log error when tracking fails', async () => {
      const event = 'button_click';
      const properties = { button_id: 'submit', page: 'signup' };
      const error = new Error('Network error');

      mockMixpanel.track.mockRejectedValueOnce(error);

      await service.trackEvent(event, properties);

      expect(logError).toHaveBeenCalledWith(
        'Failed to track event',
        expect.objectContaining({
          event,
          properties,
          error,
        })
      );
    });

    it('should log error when Mixpanel is not initialized', async () => {
      // Simulate situation where Mixpanel is not initialized
      Object.defineProperty(service, 'mixpanel', { value: undefined });

      const event = 'button_click';
      const properties = { button_id: 'submit', page: 'signup' };

      await service.trackEvent(event, properties);

      expect(logError).toHaveBeenCalledWith(
        'Failed to track event',
        expect.objectContaining({
          event,
          properties,
          error: expect.any(Error),
        })
      );
    });

    it('should handle empty properties', async () => {
      const event = 'page_view';
      const properties = {};

      await service.trackEvent(event, properties);

      expect(mockMixpanel.track).toHaveBeenCalledWith(event, properties);
    });

    it('should handle complex nested properties', async () => {
      const event = 'user_action';
      const properties = {
        user: {
          id: '123',
          profile: {
            settings: {
              notifications: true,
            },
          },
        },
        timestamp: new Date().toISOString(),
      };

      await service.trackEvent(event, properties);

      expect(mockMixpanel.track).toHaveBeenCalledWith(event, properties);
    });
  });

  describe('trackUserEngagement', () => {
    it('should track user engagement with user id and properties', async () => {
      const userId = 'user123';
      const event = 'login';
      const properties = { location: 'homepage', device: 'mobile' };

      await service.trackUserEngagement(userId, event, properties);

      expect(mockMixpanel.people.set).toHaveBeenCalledWith(userId, properties);
      expect(mockMixpanel.track).toHaveBeenCalledWith(event, {
        distinct_id: userId,
        ...properties,
      });
    });

    it('should log error when user tracking fails', async () => {
      const userId = 'user123';
      const event = 'login';
      const properties = { location: 'homepage', device: 'mobile' };
      const error = new Error('API error');

      mockMixpanel.people.set.mockRejectedValueOnce(error);

      await service.trackUserEngagement(userId, event, properties);

      expect(logError).toHaveBeenCalledWith(
        'Failed to track user engagement',
        expect.objectContaining({
          userId,
          event,
          properties,
          error,
        })
      );
    });

    it('should log error when Mixpanel is not initialized', async () => {
      // Simulate situation where Mixpanel is not initialized
      Object.defineProperty(service, 'mixpanel', { value: undefined });

      const userId = 'user123';
      const event = 'login';
      const properties = { location: 'homepage', device: 'mobile' };

      await service.trackUserEngagement(userId, event, properties);

      expect(logError).toHaveBeenCalledWith(
        'Failed to track user engagement',
        expect.objectContaining({
          userId,
          event,
          properties,
          error: expect.any(Error),
        })
      );
    });

    it('should handle empty properties', async () => {
      const userId = 'user123';
      const event = 'session_start';
      const properties = {};

      await service.trackUserEngagement(userId, event, properties);

      expect(mockMixpanel.people.set).toHaveBeenCalledWith(userId, properties);
      expect(mockMixpanel.track).toHaveBeenCalledWith(event, {
        distinct_id: userId,
      });
    });

    it('should handle malformed user IDs gracefully', async () => {
      const userId = ''; // Empty user ID
      const event = 'login';
      const properties = { location: 'homepage' };

      await service.trackUserEngagement(userId, event, properties);

      // Should still attempt to track
      expect(mockMixpanel.people.set).toHaveBeenCalledWith(userId, properties);
      expect(mockMixpanel.track).toHaveBeenCalledWith(event, {
        distinct_id: userId,
        ...properties,
      });
    });

    it('should handle extremely large data sets', async () => {
      const userId = 'user123';
      const event = 'complex_action';
      const properties = {
        largeArray: Array(1000).fill('data'),
        nestedObjects: {
          level1: {
            level2: {
              level3: {
                level4: { data: 'deep data' },
              },
            },
          },
        },
      };

      await service.trackUserEngagement(userId, event, properties);

      expect(mockMixpanel.people.set).toHaveBeenCalledWith(userId, properties);
      expect(mockMixpanel.track).toHaveBeenCalledWith(event, {
        distinct_id: userId,
        ...properties,
      });
    });
  });

  // Scalability and performance tests
  describe('Performance and Scalability', () => {
    it('should handle multiple calls in quick succession', async () => {
      const events = Array(10).fill(null).map((_, i) => `event_${i}`);
      const properties = { data: 'test' };

      const promises = events.map(event => service.trackEvent(event, properties));
      await Promise.all(promises);

      expect(mockMixpanel.track).toHaveBeenCalledTimes(10);
    });

    it('should handle errors gracefully when tracking multiple events', async () => {
      const events = Array(5).fill(null).map((_, i) => `event_${i}`);
      const properties = { data: 'test' };

      // Make the third call fail
      mockMixpanel.track.mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve());

      const promises = events.map(event => service.trackEvent(event, properties));
      await Promise.all(promises);

      expect(mockMixpanel.track).toHaveBeenCalledTimes(5);
      expect(logError).toHaveBeenCalledWith(
        'Failed to track event',
        expect.objectContaining({
          event: 'event_2', // The third event (0-indexed)
          error: expect.any(Error),
        })
      );
    });
  });
});
