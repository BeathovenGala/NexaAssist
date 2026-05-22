import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AppointmentSource, AppointmentStatus, RoleName } from '@prisma/client';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../availability/availability.service';
import { isCustomerOnly } from '../common/utils/scheduling.util';
import { InventoryItemsService } from '../inventory/inventory-items.service';
import { InventoryRequestsService } from '../inventory/inventory-requests.service';
import { InvitationsService } from '../invitations/invitations.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../types/auth-user';
import { ChatAuditService } from './chat-audit.service';
import { ChatToolRegistryService, type ChatToolName } from './chat-tool-registry.service';
import type { ConversationSlots } from './types/chat-intent.types';

@Injectable()
export class ChatToolExecutorService {
  constructor(
    private readonly registry: ChatToolRegistryService,
    private readonly audit: ChatAuditService,
    private readonly appointments: AppointmentsService,
    private readonly availability: AvailabilityService,
    private readonly inventoryItems: InventoryItemsService,
    private readonly inventoryRequests: InventoryRequestsService,
    private readonly users: UsersService,
    private readonly invitations: InvitationsService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    tool: ChatToolName,
    payload: ConversationSlots,
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (!this.registry.isAllowed(actor, tool)) {
      await this.audit.logToolCall({
        sessionId,
        tenantId,
        actorUserId: actor.id,
        toolName: tool,
        input: payload as object,
        success: false,
      });
      return {
        success: false,
        error: 'You do not have permission to perform this action.',
      };
    }

    try {
      const data = await this.runTool(actor, tenantId, tool, payload);
      await this.audit.logToolCall({
        sessionId,
        tenantId,
        actorUserId: actor.id,
        toolName: tool,
        input: payload as object,
        output: data as object,
        success: true,
      });
      return { success: true, data };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      await this.audit.logToolCall({
        sessionId,
        tenantId,
        actorUserId: actor.id,
        toolName: tool,
        input: payload as object,
        output: { error: message },
        success: false,
      });
      return { success: false, error: message };
    }
  }

  private async runTool(
    actor: AuthUser,
    tenantId: string,
    tool: ChatToolName,
    payload: ConversationSlots,
  ): Promise<unknown> {
    switch (tool) {
      case 'listBookableStaff':
        return this.appointments.listBookableStaff(actor, tenantId);
      case 'getFreeSlots': {
        const staffId = String(payload.staffId);
        const from = String(payload.slotFrom ?? payload.date);
        const to = String(payload.slotTo ?? payload.date);
        return this.availability.freeSlots(actor, {
          tenantId,
          staffId,
          from,
          to,
          durationMinutes: Number(payload.durationMinutes ?? 30),
        });
      }
      case 'createAppointment': {
        const start = new Date(String(payload.startTime));
        const end = new Date(String(payload.endTime));
        let customerId = isCustomerOnly(actor)
          ? actor.id
          : String(payload.customerId ?? '');
        if (!customerId && payload.patientEmail) {
          const u = await this.prisma.user.findFirst({
            where: {
              tenantId,
              email: String(payload.patientEmail).toLowerCase(),
            },
          });
          if (u) customerId = u.id;
        }
        if (!customerId) {
          throw new BadRequestException('Could not determine patient for booking');
        }
        return this.appointments.create(actor, {
          tenantId,
          customerId,
          assignedStaffId: String(payload.staffId),
          title: String(payload.title ?? 'Chatbot appointment'),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          source: AppointmentSource.CHATBOT,
          notes: payload.notes ? String(payload.notes) : undefined,
        });
      }
      case 'confirmAppointment':
        return this.appointments.confirm(actor, String(payload.appointmentId));
      case 'cancelAppointment':
        return this.appointments.cancel(actor, String(payload.appointmentId), {
          cancellationReason: payload.reason
            ? String(payload.reason)
            : 'Cancelled via assistant',
        });
      case 'rescheduleAppointment':
        return this.appointments.reschedule(actor, String(payload.appointmentId), {
          startTime: String(payload.startTime),
          endTime: String(payload.endTime),
        });
      case 'countAppointments': {
        const date = String(payload.date ?? new Date().toISOString().slice(0, 10));
        const from = `${date}T00:00:00.000Z`;
        const to = `${date}T23:59:59.999Z`;
        const status = payload.statusFilter as AppointmentStatus | undefined;
        const result = await this.appointments.list(actor, {
          tenantId,
          staffId: actor.roles.includes(RoleName.DOCTOR) ? actor.id : undefined,
          from,
          to,
          status: status ?? undefined,
          take: 100,
        });
        return {
          date,
          total: result.total,
          pending: result.items.filter((a) => a.status === 'PENDING').length,
          items: result.items.slice(0, 10),
        };
      }
      case 'listTodayAppointments': {
        const today = new Date().toISOString().slice(0, 10);
        return this.runTool(actor, tenantId, 'countAppointments', {
          ...payload,
          date: today,
        });
      }
      case 'searchInventory':
        return this.inventoryItems.list(actor, {
          tenantId,
          search: String(payload.itemName ?? payload.sku ?? ''),
          take: 10,
        });
      case 'createInventoryItem':
        return this.inventoryItems.create(
          actor,
          {
            name: String(payload.itemName),
            sku: String(payload.sku ?? `CHAT-${Date.now()}`),
            unit: String(payload.unit ?? 'each'),
            initialQuantity: Number(payload.quantity ?? 0),
            minimumThreshold: Number(payload.minimumThreshold ?? 0),
            description: payload.description
              ? String(payload.description)
              : undefined,
          },
          tenantId,
        );
      case 'createRestockRequest':
        return this.inventoryRequests.create(
          actor,
          {
            itemId: String(payload.itemId),
            quantityRequested: Number(payload.quantity),
            reason: payload.reason ? String(payload.reason) : 'Requested via assistant',
          },
          tenantId,
        );
      case 'createInvitation':
        return this.invitations.create(actor, {
          tenantId,
          email: String(payload.email),
          role: payload.role as RoleName,
        });
      case 'createUser':
        throw new BadRequestException(
          'Direct user creation via chat is disabled. Use an invitation instead.',
        );
      default:
        throw new BadRequestException(`Unknown tool: ${tool}`);
    }
  }
}
