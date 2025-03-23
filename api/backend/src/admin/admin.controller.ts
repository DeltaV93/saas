import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import { restrictAccess } from '../utils/rbac.helper';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.listUsers();
  }

  @Put('users/:id')
  updateUser(@Param('id') userId: string, @Body() userData: any, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.updateUser(userId, userData);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') userId: string, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.deleteUser(userId);
  }

  @Post('tickets')
  createSupportTicket(@Body('userId') userId: string, @Body('issue') issue: string, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.createSupportTicket(userId, issue);
  }

  @Get('tickets')
  listSupportTickets(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.listSupportTickets();
  }

  @Put('tickets/:id')
  updateSupportTicket(@Param('id') ticketId: string, @Body('status') status: string, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.updateSupportTicket(ticketId, status);
  }

  @Get('sessions')
  listActiveSessions(@Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.getActiveSessions();
  }

  @Post('sessions/logout/:id')
  forceLogout(@Param('id') sessionId: string, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('Authorization token is required');
    }

    // Validate session and permissions
    const admin = validateSessionAndPermissions(token, 'admin');
    restrictAccess(['admin'], admin.role);

    return this.adminService.terminateSession(sessionId);
  }
}
