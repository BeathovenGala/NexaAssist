import { Injectable } from '@nestjs/common';
import { ConversationWorkflow } from '@prisma/client';
import { isCustomerOnly } from '../common/utils/scheduling.util';
import type { AuthUser } from '../types/auth-user';
import {
  ChatToolRegistryService,
  type ChatToolName,
} from './chat-tool-registry.service';
import type { ChatIntent, OrchestratorResult } from './types/chat-intent.types';

export type ChatSuggestion = { label: string; message: string };

@Injectable()
export class ChatSuggestionsService {
  constructor(private readonly registry: ChatToolRegistryService) {}

  forResult(
    actor: AuthUser,
    result: OrchestratorResult,
    context: {
      workflow?: ConversationWorkflow;
      missingSlots?: string[];
      lastIntent?: ChatIntent;
    },
  ): ChatSuggestion[] {
    if (result.metadata?.pendingConfirmation) {
      return [];
    }
    const fromWorkflow = this.fromWorkflowState(
      actor,
      context.workflow,
      context.missingSlots,
    );
    if (fromWorkflow.length) return fromWorkflow.slice(0, 4);

    const cards = result.metadata?.cards ?? [];
    if (cards.some((c) => c.type === 'inventory_results')) {
      const suggestions: ChatSuggestion[] = [];
      if (this.can(actor, 'createRestockRequest')) {
        suggestions.push({
          label: 'Request restock',
          message: 'Create a restock request for the item we just looked up',
        });
      }
      if (this.can(actor, 'searchInventory')) {
        suggestions.push({
          label: 'Search another item',
          message: 'Search inventory for another item',
        });
      }
      return suggestions.slice(0, 4);
    }
    if (cards.some((c) => c.type === 'booking_summary')) {
      return this.postBookingSuggestions(actor);
    }
    if (cards.some((c) => c.type === 'slot_picker' || c.type === 'staff_picker')) {
      return [];
    }

    const content = result.content.toLowerCase();
    if (/done|success|confirmed|created|cancelled|sent/.test(content)) {
      return this.postSuccessSuggestions(actor, context.lastIntent).slice(0, 4);
    }

    return this.starterSuggestions(actor).slice(0, 3);
  }

  starterSuggestions(actor: AuthUser): ChatSuggestion[] {
    const out: ChatSuggestion[] = [];
    const customer = isCustomerOnly(actor);

    if (this.can(actor, 'createAppointment')) {
      out.push({
        label: customer ? 'Book appointment' : 'Book appointment',
        message: customer
          ? 'I want to book an appointment'
          : 'Book an appointment for tomorrow',
      });
    }
    if (this.can(actor, 'listTodayAppointments') || this.can(actor, 'countAppointments')) {
      out.push({
        label: customer ? 'My appointments' : "Today's schedule",
        message: customer
          ? 'What are my upcoming appointments?'
          : 'How many appointments do I have today?',
      });
    }
    if (this.can(actor, 'cancelAppointment')) {
      out.push({
        label: 'Cancel appointment',
        message: 'I need to cancel an appointment',
      });
    }
    if (this.can(actor, 'rescheduleAppointment')) {
      out.push({
        label: 'Reschedule',
        message: 'I need to reschedule an appointment',
      });
    }
    if (this.can(actor, 'searchInventory')) {
      out.push({
        label: customer ? 'Check stock' : 'Inventory lookup',
        message: customer
          ? 'Do we have any items low on stock?'
          : 'Search inventory for gloves',
      });
    }
    if (this.can(actor, 'createInvitation')) {
      out.push({
        label: 'Invite user',
        message: 'I want to invite a new team member',
      });
    }
    return out;
  }

  private fromWorkflowState(
    actor: AuthUser,
    workflow?: ConversationWorkflow,
    missingSlots?: string[],
  ): ChatSuggestion[] {
    if (!workflow || workflow === ConversationWorkflow.NONE) {
      return [];
    }
    const missing = missingSlots ?? [];
    const suggestions: ChatSuggestion[] = [];

    switch (workflow) {
      case ConversationWorkflow.BOOK_APPOINTMENT:
        if (missing.includes('staffId')) {
          suggestions.push({
            label: 'Any available doctor',
            message: 'Book with any available provider',
          });
        }
        if (missing.includes('date')) {
          suggestions.push(
            { label: 'Tomorrow', message: 'Tomorrow' },
            { label: 'Next week', message: 'Next week' },
          );
        }
        if (missing.includes('time')) {
          suggestions.push({
            label: 'Morning',
            message: 'Morning around 9am',
          });
        }
        if (missing.includes('patientName') && !isCustomerOnly(actor)) {
          suggestions.push({
            label: 'Walk-in patient',
            message: 'Patient name is Walk-in Guest',
          });
        }
        break;
      case ConversationWorkflow.CANCEL_APPOINTMENT:
      case ConversationWorkflow.RESCHEDULE_APPOINTMENT:
        if (missing.includes('appointmentId')) {
          suggestions.push({
            label: 'Use appointment code',
            message: 'Cancel appointment APT-',
          });
        }
        if (missing.includes('date')) {
          suggestions.push({ label: 'Tomorrow', message: 'Tomorrow' });
        }
        if (missing.includes('time')) {
          suggestions.push({ label: 'Afternoon', message: '2:00 PM' });
        }
        break;
      case ConversationWorkflow.INVENTORY_LOOKUP:
        if (missing.includes('itemName')) {
          suggestions.push(
            { label: 'Gloves', message: 'Search inventory for gloves' },
            { label: 'Low stock', message: 'Show items low on stock' },
          );
        }
        break;
      case ConversationWorkflow.INVENTORY_REQUEST:
        if (missing.includes('itemName')) {
          suggestions.push({
            label: 'Restock gloves',
            message: 'Request restock for gloves',
          });
        }
        break;
      default:
        break;
    }
    return suggestions;
  }

  private postBookingSuggestions(actor: AuthUser): ChatSuggestion[] {
    const out: ChatSuggestion[] = [];
    if (this.can(actor, 'createAppointment')) {
      out.push({
        label: 'Book another',
        message: 'Book another appointment',
      });
    }
    if (this.can(actor, 'searchInventory')) {
      out.push({
        label: 'Check inventory',
        message: 'Search inventory',
      });
    }
    return out;
  }

  private postSuccessSuggestions(
    actor: AuthUser,
    lastIntent?: ChatIntent,
  ): ChatSuggestion[] {
    if (lastIntent === 'cancel_appointment' || lastIntent === 'reschedule_appointment') {
      return this.postBookingSuggestions(actor);
    }
    if (lastIntent === 'inventory_lookup' || lastIntent === 'inventory_request') {
      const out: ChatSuggestion[] = [];
      if (this.can(actor, 'searchInventory')) {
        out.push({
          label: 'Search again',
          message: 'Search inventory for another item',
        });
      }
      if (this.can(actor, 'createAppointment')) {
        out.push({
          label: 'Book appointment',
          message: 'Book an appointment',
        });
      }
      return out;
    }
    return this.starterSuggestions(actor);
  }

  permissionAwareFallback(actor: AuthUser): string {
    const starters = this.starterSuggestions(actor);
    if (!starters.length) {
      return "I can't help with that yet. Ask your administrator about chat permissions.";
    }
    const examples = starters
      .slice(0, 3)
      .map((s) => s.label.toLowerCase())
      .join(', ');
    return `I'm not sure how to help with that. You can try: ${examples}.`;
  }

  private can(actor: AuthUser, tool: ChatToolName): boolean {
    return this.registry.isAllowed(actor, tool);
  }
}
