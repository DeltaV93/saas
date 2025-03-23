import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { successResponse, errorResponse } from '../utils/api-response.helper';

// Mocking JwtAuthGuard
const mockJwtAuthGuard = {
  canActivate: () => true, // Simplified mock that always returns true
};

// Mocking JwtService
const mockJwtService = {
  sign: jest.fn(() => 'mockJwtToken'),
};

// Mock api-response-helper functions
jest.mock('../utils/api-response.helper', () => ({
  successResponse: jest.fn((data) => ({ status: 'success', data })),
  errorResponse: jest.fn((message) => ({ statusCode: 400, message })),
}));

// Properly mock modules
jest.mock('@supabase/supabase-js');
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: jest.fn().mockReturnValue({
          email: 'test@example.com',
          sub: 'google-user-id',
        }),
      }),
    })),
  };
});

// Mock the JwtAuthGuard to prevent runtime errors
jest.mock('./jwt/jwt.guard', () => {
  return {
    JwtAuthGuard: jest.fn().mockImplementation(() => ({
      canActivate: jest.fn().mockReturnValue(true)
    })),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let mockSupabaseClient;
  let mockGoogleClient;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
  };

  beforeEach(async () => {
    mockSupabaseClient = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Get the mocked OAuth2Client instance
    mockGoogleClient = new OAuth2Client();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-jwt-token'),
          },
        },
      ],
    })
      // Remove the guard override since we're mocking the entire module
      .compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset mocks between tests
    (successResponse as jest.Mock).mockClear();
    (errorResponse as jest.Mock).mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should successfully sign up a user', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.signup(email, password);
      expect(result).toEqual(mockUser);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({ email, password });
    });

    it('should throw an error if signup fails', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {},
        error: { message: 'Signup failed' },
      });

      await expect(service.signup(email, password)).rejects.toThrow('Signup failed');
    });

    it('should handle weak passwords during signup', async () => {
      const email = 'test@example.com';
      const password = 'weak';

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {},
        error: { message: 'Password should be at least 6 characters' },
      });

      await expect(service.signup(email, password)).rejects.toThrow('Password should be at least 6 characters');
    });

    it('should handle duplicate email during signup', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {},
        error: { message: 'User already registered' },
      });

      await expect(service.signup(email, password)).rejects.toThrow('User already registered');
    });
  });

  describe('login', () => {
    it('should successfully login a user and return an access token', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.login(email, password);
      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({ email, password });
      expect(jwtService.sign).toHaveBeenCalledWith({ email: mockUser.email, sub: mockUser.id });
    });

    it('should throw an error if login fails', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.login(email, password)).rejects.toThrow('Invalid login credentials');
    });

    it('should handle non-existent user during login', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { message: 'Invalid login credentials' },
      });

      await expect(service.login(email, password)).rejects.toThrow('Invalid login credentials');
    });
  });

  describe('validateUser', () => {
    it('should validate user credentials and return user if valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.validateUser(email, password);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user credentials are invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: {},
        error: { message: 'Invalid login credentials' },
      });

      const result = await service.validateUser(email, password);
      expect(result).toBeNull();
    });
  });

  describe('googleSignup', () => {
    it('should successfully sign up a user with Google', async () => {
      const token = 'google-token';
      const userInfo = { email: 'google@example.com', id: 'google-id' };
      
      // Mock the private method
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue(userInfo);
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { ...mockUser, email: userInfo.email } },
        error: null,
      });

      await service.googleSignup(token);
      
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: userInfo.email,
        password: userInfo.id,
      });
      expect(successResponse).toHaveBeenCalled();
    });

    it('should handle invalid Google token', async () => {
      const token = 'invalid-token';
      
      // Mock the private method to throw an error
      jest.spyOn(service as any, 'verifyGoogleToken').mockRejectedValue(new Error('Invalid token'));
      
      await service.googleSignup(token);
      
      expect(errorResponse).toHaveBeenCalledWith('Invalid token');
    });

    it('should handle signup error with Google', async () => {
      const token = 'google-token';
      const userInfo = { email: 'existing@example.com', id: 'google-id' };
      
      // Mock the private method
      jest.spyOn(service as any, 'verifyGoogleToken').mockResolvedValue(userInfo);
      
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {},
        error: { message: 'User already registered' },
      });

      await service.googleSignup(token);
      
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: userInfo.email,
        password: userInfo.id,
      });
      expect(errorResponse).toHaveBeenCalledWith('User already registered');
    });
  });

  describe('getUserInfo', () => {
    it('should return user information', async () => {
      const userId = 'test-user-id';
      const userInfo = {
        id: userId,
        email: 'test@example.com',
        role: 'user',
        subscriptionType: 'free',
        subscriptionStatus: 'active',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: userInfo,
        error: null,
      });

      const result = await service.getUserInfo(userId);
      expect(result).toEqual(userInfo);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id, email, role, subscriptionType, subscriptionStatus');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should throw an error if user is not found', async () => {
      const userId = 'nonexistent-id';

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      await expect(service.getUserInfo(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const userId = 'test-user-id';
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      const updatedUser = { ...mockUser, ...updateData };

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedUser,
        error: null,
      });

      const result = await service.updateUserProfile(userId, updateData);
      expect(result).toEqual(updatedUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should throw an error if update fails', async () => {
      const userId = 'test-user-id';
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(service.updateUserProfile(userId, updateData)).rejects.toThrow('Failed to update user profile');
    });
  });
});
