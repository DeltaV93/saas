import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  private users = new Map<string, any>(); // Simulated user storage
  private tickets = new Map<string, any>(); // Simulated ticket storage

  listUsers() {
    return Array.from(this.users.values());
  }

  updateUser(userId: string, userData: any) {
    if (!this.users.has(userId)) {
      throw new Error('User not found');
    }
    this.users.set(userId, { ...this.users.get(userId), ...userData });
    return this.users.get(userId);
  }

  deleteUser(userId: string) {
    if (!this.users.has(userId)) {
      throw new Error('User not found');
    }
    this.users.delete(userId);
    return { message: 'User deleted successfully' };
  }

  createSupportTicket(userId: string, issue: string) {
    const ticketId = `ticket-${Date.now()}`;
    const ticket = { id: ticketId, userId, issue, status: 'open' };
    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  listSupportTickets() {
    return Array.from(this.tickets.values());
  }

  updateSupportTicket(ticketId: string, status: string) {
    if (!this.tickets.has(ticketId)) {
      throw new Error('Ticket not found');
    }
    const ticket = this.tickets.get(ticketId);
    ticket.status = status;
    this.tickets.set(ticketId, ticket);
    return ticket;
  }

  getActiveSessions() {
    // Placeholder implementation for active sessions
    return [
      { sessionId: '1', userId: 'user1', lastActive: new Date() },
      { sessionId: '2', userId: 'user2', lastActive: new Date() },
    ];
  }

  terminateSession(sessionId: string) {
    // Placeholder implementation for terminating a session
    console.log(`Terminating session with ID: ${sessionId}`);
    return { message: `Session ${sessionId} terminated successfully` };
  }
}
