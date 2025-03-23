import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listUsers', () => {
    beforeEach(() => {
      // Clear the users map before each test to ensure isolation
      service['users'] = new Map();
    });

    it('should return an empty array if no users exist', () => {
      expect(service.listUsers()).toEqual([]);
    });

    it('should return all users', () => {
      service['users'].set('1', { id: '1', name: 'User1' });
      service['users'].set('2', { id: '2', name: 'User2' });
      expect(service.listUsers()).toEqual([
        { id: '1', name: 'User1' },
        { id: '2', name: 'User2' },
      ]);
    });
  });

  describe('updateUser', () => {
    beforeEach(() => {
      // Clear the users map before each test to ensure isolation
      service['users'] = new Map();
    });

    it('should update an existing user', () => {
      service['users'].set('1', { id: '1', name: 'User1' });
      const updatedUser = service.updateUser('1', { name: 'UpdatedUser1' });
      expect(updatedUser).toEqual({ id: '1', name: 'UpdatedUser1' });
    });

    it('should throw an error if user does not exist', () => {
      expect(() => service.updateUser('nonexistent', { name: 'User' })).toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      // Clear the users map before each test to ensure isolation
      service['users'] = new Map();
    });

    it('should delete an existing user', () => {
      service['users'].set('1', { id: '1', name: 'User1' });
      const response = service.deleteUser('1');
      expect(response).toEqual({ message: 'User deleted successfully' });
      expect(service.listUsers()).toEqual([]);
    });

    it('should throw an error if user does not exist', () => {
      expect(() => service.deleteUser('nonexistent')).toThrow('User not found');
    });
  });

  describe('createSupportTicket', () => {
    beforeEach(() => {
      // Clear the tickets map before each test to ensure isolation
      service['tickets'] = new Map();
    });

    it('should create a support ticket', () => {
      const ticket = service.createSupportTicket('1', 'Issue description');
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('userId', '1');
      expect(ticket).toHaveProperty('issue', 'Issue description');
      expect(ticket).toHaveProperty('status', 'open');
      
      // Verify the ticket was added to the map
      const tickets = service.listSupportTickets();
      expect(tickets.length).toBe(1);
      expect(tickets[0]).toEqual(ticket);
    });

    it('should create unique ticket IDs for each ticket', () => {
      const ticket1 = service.createSupportTicket('1', 'Issue 1');
      const ticket2 = service.createSupportTicket('2', 'Issue 2');
      expect(ticket1.id).not.toEqual(ticket2.id);
    });
  });

  describe('listSupportTickets', () => {
    beforeEach(() => {
      // Clear the tickets map before each test to ensure isolation
      service['tickets'] = new Map();
    });

    it('should return an empty array if no tickets exist', () => {
      expect(service.listSupportTickets()).toEqual([]);
    });

    it('should return all support tickets', () => {
      const ticket1 = service.createSupportTicket('1', 'Issue 1');
      const ticket2 = service.createSupportTicket('2', 'Issue 2');
      
      const tickets = service.listSupportTickets();
      expect(tickets.length).toBe(2);
      expect(tickets).toContainEqual(expect.objectContaining({
        id: ticket1.id,
        userId: '1',
        issue: 'Issue 1',
        status: 'open'
      }));
      expect(tickets).toContainEqual(expect.objectContaining({
        id: ticket2.id,
        userId: '2',
        issue: 'Issue 2',
        status: 'open'
      }));
    });
  });

  describe('updateSupportTicket', () => {
    beforeEach(() => {
      // Clear the tickets map before each test to ensure isolation
      service['tickets'] = new Map();
    });

    it('should update an existing ticket', () => {
      const ticket = service.createSupportTicket('1', 'Issue description');
      const updatedTicket = service.updateSupportTicket(ticket.id, 'closed');
      expect(updatedTicket).toHaveProperty('status', 'closed');
    });

    it('should throw an error if ticket does not exist', () => {
      expect(() => service.updateSupportTicket('nonexistent', 'closed')).toThrow('Ticket not found');
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', () => {
      const sessions = service.getActiveSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('terminateSession', () => {
    it('should terminate a session', () => {
      const response = service.terminateSession('1');
      expect(response).toEqual({ message: 'Session 1 terminated successfully' });
    });
  });
});
