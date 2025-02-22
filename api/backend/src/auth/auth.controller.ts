import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { validateSessionAndPermissions } from '../utils/authentication.helper';

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
}
