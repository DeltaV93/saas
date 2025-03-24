import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for administrative operations, including user management,
 * support ticket management, and session management.
 */
@Injectable()
export class AdminService {
  private userStore = new Map<string, any>();
  private ticketStore = new Map<string, any>();
  private sessionStore = new Map<string, any>();

  /**
   * Returns a list of all users in the system
   * @returns Array of user objects
   */
  listUsers() {
    return Array.from(this.userStore.values());
  }

  /**
   * Updates a user's information
   * @param userId - The ID of the user to update
   * @param userData - The user data to update
   * @returns The updated user object
   * @throws Error if user not found
   */
  updateUser(userId: string, userData: any) {
    if (!this.userStore.has(userId)) {
      throw new Error('User not found');
    }

    const currentUser = this.userStore.get(userId);
    const updatedUser = { ...currentUser, ...userData };
    this.userStore.set(userId, updatedUser);
    
    return updatedUser;
  }

  /**
   * Deletes a user from the system
   * @param userId - The ID of the user to delete
   * @returns Success message
   * @throws Error if user not found
   */
  deleteUser(userId: string) {
    if (!this.userStore.has(userId)) {
      throw new Error('User not found');
    }

    this.userStore.delete(userId);
    return { message: 'User deleted successfully' };
  }

  /**
   * Creates a new support ticket
   * @param userId - The ID of the user the ticket is for
   * @param issue - The issue description
   * @returns The created support ticket
   * @throws Error if user not found
   */
  createSupportTicket(userId: string, issue: string) {
    if (!this.userStore.has(userId)) {
      throw new Error('User not found');
    }

    const ticketId = uuidv4();
    const ticket = {
      id: ticketId,
      userId,
      issue,
      status: 'open',
      createdAt: new Date(),
    };

    this.ticketStore.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Returns a list of all support tickets
   * @returns Array of support ticket objects
   */
  listSupportTickets() {
    return Array.from(this.ticketStore.values());
  }

  /**
   * Updates a support ticket's status
   * @param ticketId - The ID of the ticket to update
   * @param status - The new status for the ticket
   * @returns The updated ticket
   * @throws Error if ticket not found
   */
  updateSupportTicket(ticketId: string, status: string) {
    if (!this.ticketStore.has(ticketId)) {
      throw new Error('Ticket not found');
    }

    const ticket = this.ticketStore.get(ticketId);
    const updatedTicket = { ...ticket, status };
    this.ticketStore.set(ticketId, updatedTicket);
    
    return updatedTicket;
  }

  /**
   * Returns a list of all active sessions
   * @returns Array of session objects
   */
  getActiveSessions() {
    return Array.from(this.sessionStore.values());
  }

  /**
   * Terminates a user session
   * @param sessionId - The ID of the session to terminate
   * @returns Success message
   * @throws Error if session not found
   */
  terminateSession(sessionId: string) {
    if (!this.sessionStore.has(sessionId)) {
      throw new Error('Session not found');
    }

    this.sessionStore.delete(sessionId);
    return { message: `Session ${sessionId} terminated successfully` };
  }
}
