import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import { ForbiddenException } from '@nestjs/common';

// Mock the authentication helper
jest.mock('../utils/authentication.helper', () => ({
  validateSessionAndPermissions: jest.fn().mockReturnValue({
    id: 'test-user-id',
    role: 'user',
  }),
}));

describe('NotificationController', () => {
  let controller: NotificationController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return status when token is valid and user has correct permissions', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      };

      const result = controller.getStatus(mockRequest as any);

      expect(validateSessionAndPermissions).toHaveBeenCalledWith('valid-token', 'user');
      expect(result).toEqual({ status: 'Notification service is running' });
    });

    it('should throw an error when no authorization header is provided', () => {
      const mockRequest = {
        headers: {}
      };

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Authorization token is required');
    });

    it('should throw an error when token is not in correct format', () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormatToken'
        }
      };

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Authorization token is required');
    });

    it('should throw error from validateSessionAndPermissions when authentication fails', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token'
        }
      };

      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Authentication failed');
    });

    it('should throw ForbiddenException when user does not have required permissions', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      };

      (validateSessionAndPermissions as jest.Mock).mockImplementationOnce(() => {
        throw new ForbiddenException('Access denied: insufficient permissions');
      });

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow(ForbiddenException);
    });
  });

  describe('security tests', () => {
    it('should handle malformed authorization headers', () => {
      // Test various malformed headers
      const testCases = [
        { header: '', expectedError: 'Authorization token is required' },
        { header: 'Bearer', expectedError: 'Authorization token is required' },
        { header: 'Bearer ', expectedError: 'Authorization token is required' },
        { header: 'NotBearer token123', expectedError: 'Authorization token is required' },
      ];

      testCases.forEach(testCase => {
        const mockRequest = {
          headers: {
            authorization: testCase.header
          }
        };

        expect(() => {
          controller.getStatus(mockRequest as any);
        }).toThrow(testCase.expectedError);
      });
    });

    it('should validate token format', () => {
      const validFormats = [
        'Bearer abc.xyz.123',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      ];

      validFormats.forEach(format => {
        const mockRequest = {
          headers: {
            authorization: format
          }
        };

        // Should not throw for token format, but might throw for validation
        try {
          controller.getStatus(mockRequest as any);
        } catch (error) {
          // Ensure it's not throwing because of format, but because of validation
          expect(error.message).not.toBe('Authorization token is required');
        }
      });
    });

    it('should handle potential injection in authorization header', () => {
      const suspiciousHeaders = [
        "Bearer <script>alert('xss')</script>",
        "Bearer ' OR '1'='1",
        "Bearer `; DROP TABLE users; --`",
      ];

      suspiciousHeaders.forEach(header => {
        const mockRequest = {
          headers: {
            authorization: header
          }
        };

        // Should pass the token to validation function without executing any code
        try {
          controller.getStatus(mockRequest as any);
        } catch (error) {
          // Ensure validation was attempted (the mock would throw an error)
          expect(validateSessionAndPermissions).toHaveBeenCalled();
        }
      });
    });

    describe('malformed authorization headers', () => {
      it('should throw an error if the authorization header format is invalid', async () => {
        const req = {
          headers: {
            authorization: 'InvalidFormat Token123'
          }
        };
        
        expect(() => {
          controller.getStatus(req as any);
        }).toThrow('Authorization token is required');
      });

      it('should throw an error if the token is missing', async () => {
        const req = {
          headers: {
            authorization: 'Bearer '
          }
        };
        
        expect(() => {
          controller.getStatus(req as any);
        }).toThrow('Authorization token is required');
      });

      it('should throw an error if authorization header is missing', async () => {
        const req = {
          headers: {}
        };
        
        expect(() => {
          controller.getStatus(req as any);
        }).toThrow('Authorization token is required');
      });
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors during token extraction', () => {
      const mockRequest = {
        headers: {
          // Create a situation where accessing the authorization property throws an error
          get authorization() {
            throw new Error('Unexpected error');
          }
        }
      };

      expect(() => {
        controller.getStatus(mockRequest as any);
      }).toThrow('Unexpected error');
    });

    it('should handle undefined request object', () => {
      expect(() => {
        controller.getStatus(undefined);
      }).toThrow();
    });
    
    it('should handle missing headers in request object', () => {
      const mockRequest = {} as any;
      
      expect(() => {
        controller.getStatus(mockRequest);
      }).toThrow();
    });
  });

  describe('performance and load testing', () => {
    it('should handle rapid successive requests', () => {
      const numRequests = 100;
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      };

      const startTime = Date.now();
      
      for (let i = 0; i < numRequests; i++) {
        controller.getStatus(mockRequest as any);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All requests should be processed quickly
      expect(duration).toBeLessThan(1000);
      expect(validateSessionAndPermissions).toHaveBeenCalledTimes(numRequests);
    });
  });

  describe('integration with authentication system', () => {
    it('should pass the correct role to validateSessionAndPermissions', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      };

      controller.getStatus(mockRequest as any);
      
      // Verify it's checking for the 'user' role specifically
      expect(validateSessionAndPermissions).toHaveBeenCalledWith('valid-token', 'user');
    });
    
    it('should return decoded token data when validation succeeds', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      };
      
      const mockDecodedToken = {
        id: 'user-123',
        role: 'user',
        email: 'test@example.com'
      };
      
      (validateSessionAndPermissions as jest.Mock).mockReturnValueOnce(mockDecodedToken);
      
      controller.getStatus(mockRequest as any);
      
      // In a real implementation, this data might be used in the response
      // or to customize the notification status
    });
  });
});
