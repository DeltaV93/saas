import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { validateSessionAndPermissions } from '../utils/authentication.helper';

@Controller('notification')
export class NotificationController {
  @Get('status')
  getStatus(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    return { status: 'Notification service is running' };
  }
}
