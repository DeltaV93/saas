import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '../utils/api-response.helper';
import * as express from 'express';
import * as session from 'express-session';

// Mock these modules to prevent errors
jest.mock('@supabase/supabase-js');
jest.mock('../utils/api-response.helper');
jest.mock('./jwt/jwt.guard', () => {
  return {
    JwtAuthGuard: jest.fn().mockImplementation(() => ({
      canActivate: jest.fn().mockReturnValue(true)
    }))
  };
});

// Mocking AuthService with correct method signatures
const mockAuthService = {
  signup: jest.fn().mockResolvedValue({
    id: 'user-id',
    email: 'test@example.com',
    role: 'user',
  }),
  login: jest.fn().mockResolvedValue({
    access_token: 'mockAccessToken',
  }),
  validateUser: jest.fn().mockResolvedValue({
    id: 'user-id',
    email: 'test@example.com',
    role: 'user',
  }),
  googleSignup: jest.fn().mockResolvedValue({ 
    status: 'success', 
    data: {
      id: 'user-id',
      email: 'test@example.com',
      role: 'user',
    }
  }),
  getUserInfo: jest.fn().mockResolvedValue({
    id: 'user-id',
    email: 'test@example.com',
    role: 'user',
    subscriptionType: 'free',
    subscriptionStatus: 'active',
  }),
  updateUserProfile: jest.fn().mockResolvedValue({
    id: 'user-id',
    email: 'test@example.com',
    name: 'Updated Name',
    role: 'user',
  }),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let app: INestApplication;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    role: 'user',
  };

  const mockRequest = () => {
    const req: Partial<express.Request> = {
      session: {
        user: null,
        destroy: jest.fn((callback) => callback(null)),
      } as any,
      headers: {
        authorization: 'Bearer token',
      },
    };
    return req;
  };

  beforeEach(async () => {
    (successResponse as jest.Mock).mockImplementation((data) => ({ status: 'success', data }));
    (errorResponse as jest.Mock).mockImplementation((message) => {
      throw { statusCode: 400, message };
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mock-jwt-token'),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    app = module.createNestApplication();
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
      })
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should call service.signup with correct parameters', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      await controller.signup(email, password);
      expect(authService.signup).toHaveBeenCalledWith(email, password);
    });
  });

  describe('login', () => {
    it('should return success response when credentials are valid', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const req = mockRequest();
      
      const result = await controller.login(email, password, req as express.Request);
      expect(authService.validateUser).toHaveBeenCalledWith(email, password);
      expect(req.session.user).toEqual({ id: mockUser.id, role: mockUser.role });
      expect(result).toEqual({ status: 'success', data: { message: 'Login successful' } });
    });

    it('should return error response when credentials are invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';
      const req = mockRequest();
      
      jest.spyOn(authService, 'validateUser').mockResolvedValueOnce(null);
      
      await expect(controller.login(email, password, req as express.Request))
        .rejects.toEqual({ statusCode: 400, message: 'Invalid credentials' });
    });
  });

  describe('googleSignup', () => {
    it('should call service.googleSignup with correct parameters', async () => {
      const token = 'google-token';
      
      await controller.googleSignup(token);
      expect(authService.googleSignup).toHaveBeenCalledWith(token);
    });
  });

  describe('getMe', () => {
    it('should return user information for authenticated user', async () => {
      const req = {
        user: { id: mockUser.id },
      } as any;
      
      const result = await controller.getMe(req);
      expect(authService.getUserInfo).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ status: 'success', data: expect.any(Object) });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile for authenticated user', async () => {
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      
      const req = {
        user: { id: mockUser.id },
      } as any;
      
      const result = await controller.updateProfile(req, updateData);
      expect(authService.updateUserProfile).toHaveBeenCalledWith(mockUser.id, updateData);
      expect(result).toEqual({ status: 'success', data: expect.any(Object) });
    });
  });

  describe('getSession', () => {
    it('should return session user data if session exists', async () => {
      const req = mockRequest();
      req.session.user = { id: mockUser.id, role: mockUser.role };
      
      const result = await controller.getSession(req as express.Request);
      expect(result).toEqual({ status: 'success', data: { id: mockUser.id, role: mockUser.role } });
    });
  });

  describe('logout', () => {
    it('should destroy session and return success message', async () => {
      const req = mockRequest();
      
      const result = await controller.logout(req as express.Request);
      expect(req.session.destroy).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success', data: { message: 'Logout successful' } });
    });
  });
});
