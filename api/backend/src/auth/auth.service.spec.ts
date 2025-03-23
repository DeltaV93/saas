import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ExecutionContext } from '@nestjs/common';

// Mocking JwtAuthGuard
const mockJwtAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    return true;
  },
};

// Mocking JwtService
const mockJwtService = {
  sign: jest.fn(() => 'mockJwtToken'),
};

// Mocking User Repository
const mockUserRepository = {
  findOne: jest.fn().mockResolvedValue({
    id: 1,
    username: 'testuser',
    password: 'hashedpassword',
  }),
  save: jest.fn().mockResolvedValue({
    id: 1,
    username: 'newuser',
    password: 'hashedpassword',
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return a JWT token for valid credentials', async () => {
      const result = await service.login({ username: 'testuser', password: 'testpassword' });
      expect(result).toEqual({ accessToken: 'mockJwtToken' });
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw an error for invalid credentials', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue(null);
      try {
        await service.login({ username: 'wronguser', password: 'wrongpassword' });
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
      }
    });
  });

  describe('register', () => {
    it('should register a new user and return user data', async () => {
      const result = await service.register({ username: 'newuser', password: 'newpassword' });
      expect(result).toEqual({ id: 1, username: 'newuser', password: 'hashedpassword' });
      expect(mockUserRepository.save).toHaveBeenCalledWith({ username: 'newuser', password: 'newpassword' });
    });

    it('should throw an error if user already exists', async () => {
      jest.spyOn(mockUserRepository, 'findOne').mockResolvedValue({ id: 1, username: 'existinguser', password: 'hashedpassword' });
      try {
        await service.register({ username: 'existinguser', password: 'password' });
      } catch (error) {
        expect(error.message).toBe('User already exists');
      }
    });
  });
});
