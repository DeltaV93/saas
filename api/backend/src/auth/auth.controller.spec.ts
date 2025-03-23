import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { of } from 'rxjs';

// Mocking JwtAuthGuard
const mockJwtAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    return true;
  },
};

// Mocking AuthService
const mockAuthService = {
  login: jest.fn((dto) => {
    return {
      accessToken: 'mockAccessToken',
    };
  }),
  register: jest.fn((dto) => {
    return {
      id: 1,
      ...dto,
    };
  }),
};

// Mocking JwtService
const mockJwtService = {
  sign: jest.fn(() => 'mockJwtToken'),
};

// Mocking Prisma Service
const mockPrismaService = {
  user: {
    findUnique: jest.fn().mockResolvedValue({
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
    }),
    create: jest.fn().mockResolvedValue({
      id: 1,
      username: 'newuser',
      password: 'newpassword',
    }),
  },
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return an access token', async () => {
      const result = await controller.login({ username: 'testuser', password: 'testpassword' });
      expect(result).toEqual({ accessToken: 'mockAccessToken' });
      expect(authService.login).toHaveBeenCalledWith({ username: 'testuser', password: 'testpassword' });
    });

    it('should handle login errors', async () => {
      jest.spyOn(authService, 'login').mockImplementation(() => {
        throw new Error('Invalid credentials');
      });
      try {
        await controller.login({ username: 'wronguser', password: 'wrongpassword' });
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
      }
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await controller.register({ username: 'newuser', password: 'newpassword' });
      expect(result).toEqual({ id: 1, username: 'newuser', password: 'newpassword' });
      expect(authService.register).toHaveBeenCalledWith({ username: 'newuser', password: 'newpassword' });
    });

    it('should handle registration errors', async () => {
      jest.spyOn(authService, 'register').mockImplementation(() => {
        throw new Error('User already exists');
      });
      try {
        await controller.register({ username: 'existinguser', password: 'password' });
      } catch (error) {
        expect(error.message).toBe('User already exists');
      }
    });
  });
});
