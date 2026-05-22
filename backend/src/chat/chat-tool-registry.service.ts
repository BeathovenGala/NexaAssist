import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';

export type ChatToolName =
  | 'listBookableStaff'
  | 'getFreeSlots'
  | 'createAppointment'
  | 'confirmAppointment'
  | 'cancelAppointment'
  | 'rescheduleAppointment'
  | 'countAppointments'
  | 'listTodayAppointments'
  | 'searchInventory'
  | 'createInventoryItem'
  | 'createRestockRequest'
  | 'createUser'
  | 'createInvitation';

const TOOL_PERMISSIONS: Record<ChatToolName, string[]> = {
  listBookableStaff: ['appointments:create', 'availability:read'],
  getFreeSlots: ['availability:read'],
  createAppointment: ['appointments:create'],
  confirmAppointment: ['appointments:update'],
  cancelAppointment: ['appointments:cancel'],
  rescheduleAppointment: ['appointments:update'],
  countAppointments: ['appointments:read'],
  listTodayAppointments: ['appointments:read'],
  searchInventory: ['inventory:read'],
  createInventoryItem: ['inventory:write'],
  createRestockRequest: ['inventory:request'],
  createUser: ['users:create'],
  createInvitation: ['invitations:create'],
};

const CONFIRMATION_REQUIRED: Set<ChatToolName> = new Set([
  'createAppointment',
  'cancelAppointment',
  'rescheduleAppointment',
  'createInventoryItem',
  'createRestockRequest',
  'createUser',
  'createInvitation',
]);

@Injectable()
export class ChatToolRegistryService {
  isAllowed(actor: AuthUser, tool: ChatToolName): boolean {
    const required = TOOL_PERMISSIONS[tool];
    return required.some((p) => actor.permissions.includes(p));
  }

  requiresConfirmation(tool: ChatToolName): boolean {
    return CONFIRMATION_REQUIRED.has(tool);
  }

  listAllowedTools(actor: AuthUser): ChatToolName[] {
    return (Object.keys(TOOL_PERMISSIONS) as ChatToolName[]).filter((t) =>
      this.isAllowed(actor, t),
    );
  }
}
