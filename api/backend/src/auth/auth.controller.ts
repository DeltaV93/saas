import { Controller, Post, Body, UseGuards, Req, Get, Put } from '@nestjs/common';
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
}
