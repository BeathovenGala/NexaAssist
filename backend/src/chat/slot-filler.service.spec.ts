import { ConversationWorkflow } from '@prisma/client';
import { SlotFillerService } from './slot-filler.service';
import type { AuthUser } from '../types/auth-user';

describe('SlotFillerService', () => {
  const service = new SlotFillerService();

  const customerActor: AuthUser = {
    id: 'u1',
    email: 'c@test.com',
    tenantId: 't1',
    roles: ['CUSTOMER'],
    permissions: ['chat:use'],
    userCode: 'CU-001',
  };

  const adminActor: AuthUser = {
    id: 'u2',
    email: 'a@test.com',
    tenantId: 't1',
    roles: ['TENANT_ADMIN'],
    permissions: ['chat:use', 'users:create'],
    userCode: 'TA-001',
  };

  it('computes missing booking slots in priority order', () => {
    const missing = service.computeMissingSlots(
      ConversationWorkflow.BOOK_APPOINTMENT,
      {},
      customerActor,
    );
    expect(missing).toContain('staffId');
    expect(missing).toContain('date');
    expect(missing).toContain('time');
    expect(missing).not.toContain('patientName');
  });

  it('requires patientName for staff booking when other slots filled', () => {
    const missing = service.computeMissingSlots(
      ConversationWorkflow.BOOK_APPOINTMENT,
      {
        staffId: 'dr1',
        date: '2026-05-20',
        startTime: '2026-05-20T10:00:00.000Z',
        endTime: '2026-05-20T10:30:00.000Z',
      },
      adminActor,
    );
    expect(missing).toEqual(['patientName']);
  });

  it('merges classifier entities into slots', () => {
    const merged = service.mergeSlots(
      { date: '2026-05-01' },
      { staffName: 'Dr Rivera', time: '10:30' },
    );
    expect(merged.staffName).toBe('Dr Rivera');
    expect(merged.time).toBe('10:30');
    expect(merged.date).toBe('2026-05-01');
  });

  it('returns next missing slot by priority', () => {
    expect(service.nextMissingSlot(['time', 'staffId', 'date'])).toBe('staffId');
    expect(service.nextMissingSlot(['time', 'date'])).toBe('date');
  });
});
