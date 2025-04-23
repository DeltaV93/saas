import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Request } from 'express';

// Mock the validateSessionAndPermissions function
jest.mock('./utils/authentication.helper', () => ({
  validateSessionAndPermissions: jest.fn(),
}));

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // Create a mock Request object
      const mockRequest = {
        headers: {
          authorization: 'Bearer fake-token',
        },
      } as Request;
      
      expect(appController.getHello(mockRequest)).toBe('Hello World!');
    });
  });
});
