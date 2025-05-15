import { Controller, Post, Body, UseGuards, Req, Get, Put } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { successResponse, errorResponse } from '../utils/api-response.helper';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body('email') email: string, @Body('password') password: string) {
    return this.authService.signup(email, password);
  }

  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string, @Req() req: Request) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return errorResponse('Invalid credentials');
    }
    req.session.user = { id: user.id, role: user.role };
    return successResponse({ message: 'Login successful' });
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

  @UseGuards(JwtAuthGuard)
  @Put('update-profile')
  async updateProfile(@Req() req: Request, @Body() updateData: { name: string; email: string }) {
    try {
      const userId = req['user'].id;
      const updatedUser = await this.authService.updateUserProfile(userId, updateData);
      return successResponse(updatedUser, 'Profile updated successfully');
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return errorResponse('Failed to update profile');
    }
  }

  @Get('session')
  async getSession(@Req() req: Request) {
    if (!req.session.user) {
      return errorResponse('No active session');
    }
    return successResponse(req.session.user);
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return errorResponse('Failed to logout');
      }
    });
    return successResponse({ message: 'Logout successful' });
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    try {
      if (!email) {
        return errorResponse('Email is required');
      }
      
      return this.authService.forgotPassword(email);
    } catch (error) {
      console.error('Error in forgotPassword endpoint:', error);
      return errorResponse('Failed to process forgot password request');
    }
  }

  @Post('reset-password')
  async resetPassword(
    @Body('password') password: string,
    @Body('token') token: string,
    @Body('refreshToken') refreshToken: string,
    @Req() req: Request
  ) {
    try {
      if (!password) {
        return errorResponse('Password is required');
      }
      
      if (!token) {
        return errorResponse('Reset token is required');
      }
      
      // Validate password requirements
      if (password.length < 8) {
        return errorResponse('Password must be at least 8 characters long');
      }
      
      if (!/[A-Z]/.test(password)) {
        return errorResponse('Password must contain at least one uppercase letter');
      }
      
      if (!/[a-z]/.test(password)) {
        return errorResponse('Password must contain at least one lowercase letter');
      }
      
      if (!/[0-9]/.test(password)) {
        return errorResponse('Password must contain at least one number');
      }
      
      if (!/[!@#$%^&*]/.test(password)) {
        return errorResponse('Password must contain at least one special character');
      }
      
      return this.authService.resetPassword(token, password, refreshToken);
    } catch (error) {
      console.error('Error in resetPassword endpoint:', error);
      return errorResponse('Failed to reset password');
    }
  }
}
