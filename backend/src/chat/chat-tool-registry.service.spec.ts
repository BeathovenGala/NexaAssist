import { ChatToolRegistryService } from './chat-tool-registry.service';
import type { AuthUser } from '../types/auth-user';

describe('ChatToolRegistryService', () => {
  const registry = new ChatToolRegistryService();

  const customer: AuthUser = {
    id: 'c1',
    email: 'c@test.com',
    tenantId: 't1',
    roles: ['CUSTOMER'],
    permissions: ['chat:use', 'appointments:create', 'availability:read', 'inventory:read'],
    userCode: 'CU-001',
  };

  const admin: AuthUser = {
    id: 'a1',
    email: 'a@test.com',
    tenantId: 't1',
    roles: ['TENANT_ADMIN'],
    permissions: ['chat:use', 'users:create', 'invitations:create'],
    userCode: 'TA-001',
  };

  it('denies createUser for customer', () => {
    expect(registry.isAllowed(customer, 'createUser')).toBe(false);
    expect(registry.isAllowed(customer, 'createAppointment')).toBe(true);
  });

  it('allows invitations for admin', () => {
    expect(registry.isAllowed(admin, 'createInvitation')).toBe(true);
    expect(registry.requiresConfirmation('createInvitation')).toBe(true);
  });
});
