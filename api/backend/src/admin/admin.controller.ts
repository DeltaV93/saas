import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { validateSessionAndPermissions } from '../utils/authentication.helper';
import { restrictAccess } from '../utils/rbac.helper';

/**
 * Controller for administrative operations, providing endpoints for
 * user management, support ticket management, and session management.
 * All endpoints are protected and require admin authentication.
 */
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Lists all users in the system
   * @param req - The HTTP request object containing authentication data
   * @returns Array of user objects
   * @throws Error if not authenticated as admin
   */
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

  /**
   * Updates a user's information
   * @param userId - The ID of the user to update
   * @param userData - The user data to update
   * @param req - The HTTP request object containing authentication data
   * @returns The updated user object
   * @throws Error if not authenticated as admin or user not found
   */
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

  /**
   * Deletes a user from the system
   * @param userId - The ID of the user to delete
   * @param req - The HTTP request object containing authentication data
   * @returns Success message
   * @throws Error if not authenticated as admin or user not found
   */
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

  /**
   * Creates a new support ticket
   * @param userId - The ID of the user the ticket is for
   * @param issue - The issue description
   * @param req - The HTTP request object containing authentication data
   * @returns The created support ticket
   * @throws Error if not authenticated as admin or user not found
   */
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

  /**
   * Lists all support tickets in the system
   * @param req - The HTTP request object containing authentication data
   * @returns Array of support ticket objects
   * @throws Error if not authenticated as admin
   */
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

  /**
   * Updates a support ticket's status
   * @param ticketId - The ID of the ticket to update
   * @param status - The new status for the ticket
   * @param req - The HTTP request object containing authentication data
   * @returns The updated ticket
   * @throws Error if not authenticated as admin or ticket not found
   */
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

  /**
   * Lists all active sessions in the system
   * @param req - The HTTP request object containing authentication data
   * @returns Array of session objects
   * @throws Error if not authenticated as admin
   */
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

  /**
   * Terminates a user session
   * @param sessionId - The ID of the session to terminate
   * @param req - The HTTP request object containing authentication data
   * @returns Success message
   * @throws Error if not authenticated as admin or session not found
   */
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