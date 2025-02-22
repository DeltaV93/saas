import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { validateSessionAndPermissions } from '../utils/authentication.helper';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('track-event')
  async trackEvent(@Body('event') event: string, @Body('properties') properties: Record<string, any>, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    this.dashboardService.trackEvent(event, properties);
    return { message: 'Event tracked successfully' };
  }

  @Post('track-user-engagement')
  async trackUserEngagement(@Body('userId') userId: string, @Body('event') event: string, @Body('properties') properties: Record<string, any>, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    this.dashboardService.trackUserEngagement(userId, event, properties);
    return { message: 'User engagement tracked successfully' };
  }
}
