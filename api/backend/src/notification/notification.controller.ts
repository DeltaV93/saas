import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { validateSessionAndPermissions } from '../utils/authentication.helper';

@Controller('notification')
export class NotificationController {
  @Get('status')
  getStatus(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization token is required');
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    validateSessionAndPermissions(token, 'user');

    return { status: 'Notification service is running' };
  }
}
