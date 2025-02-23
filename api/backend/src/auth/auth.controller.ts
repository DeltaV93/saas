import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import { successResponse, errorResponse } from '../utils/api-response.helper';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body('email') email: string, @Body('password') password: string) {
    return this.authService.signup(email, password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    return this.authService.login(email, password);
  }

  @Post('google-signup')
  async googleSignup(@Body('token') token: string) {
    return this.authService.googleSignup(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    try {
      // Get user from request after JWT validation
      const user = req['user'];
      if (!user || !user.id) {
        throw new Error('User not found in request');
      }

      const userInfo = await this.authService.getUserInfo(user.id);
      return successResponse(userInfo);
    } catch (error) {
      // Log error for monitoring
      console.error('Error in getMe:', error);
      return errorResponse('Failed to get user information');
    }
  }
}
