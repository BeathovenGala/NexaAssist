import { RoleName } from '@prisma/client';
import { ChatService } from './chat.service';

describe('ChatService tenant access', () => {
  const prisma = {
    chatSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  };

  const service = new ChatService(prisma as never);

  const actor = {
    id: 'user-a',
    email: 'a@test.com',
    tenantId: 'tenant-1',
    roles: [RoleName.CUSTOMER],
    permissions: ['chat:use'],
    userCode: 'CU-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unaffiliated customer', async () => {
    await expect(
      service.listSessions(
        { ...actor, tenantId: null },
        {},
      ),
    ).rejects.toThrow();
  });

  it('scopes getSession to actor userId', async () => {
    prisma.chatSession.findFirst.mockResolvedValue(null);
    await expect(service.getSession(actor, 'sess-1')).rejects.toThrow();
    expect(prisma.chatSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess-1', tenantId: 'tenant-1', userId: 'user-a' },
      }),
    );
  });
});
