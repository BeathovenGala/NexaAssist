import { Injectable } from '@nestjs/common';
import { ConversationWorkflow } from '@prisma/client';
import { isCustomerOnly } from '../common/utils/scheduling.util';
import type { AuthUser } from '../types/auth-user';
import type { ChatEntities, ConversationSlots } from './types/chat-intent.types';

const BOOKING_SLOT_ORDER = ['staffId', 'date', 'time'] as const;
const STAFF_BOOKING_EXTRA = ['patientName'] as const;

@Injectable()
export class SlotFillerService {
  mergeSlots(
    current: ConversationSlots,
    entities: ChatEntities,
  ): ConversationSlots {
    const next = { ...current };
    if (entities.staffId) next.staffId = entities.staffId;
    if (entities.staffName) next.staffName = entities.staffName;
    if (entities.date) next.date = entities.date;
    if (entities.time) next.time = entities.time;
    if (entities.startTime) next.startTime = entities.startTime;
    if (entities.endTime) next.endTime = entities.endTime;
    if (entities.patientName) next.patientName = entities.patientName;
    if (entities.appointmentId) next.appointmentId = entities.appointmentId;
    if (entities.itemName) next.itemName = entities.itemName;
    if (entities.sku) next.sku = entities.sku;
    if (entities.quantity != null) next.quantity = entities.quantity;
    if (entities.categoryName) next.categoryName = entities.categoryName;
    if (entities.unit) next.unit = entities.unit;
    if (entities.email) next.email = entities.email;
    if (entities.firstName) next.firstName = entities.firstName;
    if (entities.lastName) next.lastName = entities.lastName;
    if (entities.phone) next.phone = entities.phone;
    if (entities.role) next.role = entities.role;
    if (entities.reason) next.reason = entities.reason;
    return next;
  }

  computeMissingSlots(
    workflow: ConversationWorkflow,
    slots: ConversationSlots,
    actor: AuthUser,
  ): string[] {
    switch (workflow) {
      case ConversationWorkflow.BOOK_APPOINTMENT: {
        const missing: string[] = [];
        if (!slots.staffId && !slots.staffName) missing.push('staffId');
        if (!slots.date) missing.push('date');
        if (!slots.startTime && !slots.time) missing.push('time');
        if (!isCustomerOnly(actor) && !slots.patientName && !slots.customerId) {
          if (missing.length === 0) {
            missing.push('patientName');
          }
        }
        return missing.filter((s) => {
          if (s === 'staffId') return !slots.staffId;
          if (s === 'date') return !slots.date;
          if (s === 'time') return !slots.startTime && !slots.time;
          if (s === 'patientName') return !slots.patientName && !slots.customerId;
          return true;
        });
      }
      case ConversationWorkflow.RESCHEDULE_APPOINTMENT: {
        const missing: string[] = [];
        if (!slots.appointmentId) missing.push('appointmentId');
        if (!slots.date) missing.push('date');
        if (!slots.startTime && !slots.time) missing.push('time');
        return missing;
      }
      case ConversationWorkflow.CANCEL_APPOINTMENT:
        return slots.appointmentId ? [] : ['appointmentId'];
      case ConversationWorkflow.INVENTORY_LOOKUP:
        return slots.itemName || slots.sku ? [] : ['itemName'];
      case ConversationWorkflow.INVENTORY_CREATE:
        if (!slots.itemName) return ['itemName'];
        if (!slots.unit) return ['unit'];
        if (slots.quantity == null) return ['quantity'];
        return [];
      case ConversationWorkflow.INVENTORY_REQUEST:
        if (!slots.itemName && !slots.itemId) return ['itemName'];
        if (slots.quantity == null) return ['quantity'];
        return [];
      case ConversationWorkflow.USER_CREATE:
        if (!slots.email) return ['email'];
        if (!slots.firstName) return ['firstName'];
        if (!slots.role) return ['role'];
        return [];
      default:
        return [];
    }
  }

  nextMissingSlot(missing: string[]): string | null {
    if (!missing.length) return null;
    const order = [...BOOKING_SLOT_ORDER, ...STAFF_BOOKING_EXTRA];
    for (const key of order) {
      if (missing.includes(key)) return key;
    }
    return missing[0] ?? null;
  }

  questionForSlot(slot: string, slots: ConversationSlots): string {
    switch (slot) {
      case 'staffId':
        return 'Which doctor or staff member would you like to book with?';
      case 'date':
        return 'What date works for you? (e.g. tomorrow, 2026-05-20)';
      case 'time':
        return 'Which time slot would you prefer? You can pick from the options below.';
      case 'patientName':
        return 'What is the patient name for this appointment?';
      case 'appointmentId':
        return 'Which appointment should I use? Please provide the appointment code or describe it.';
      case 'itemName':
        return 'Which item are you asking about? Please provide the name or SKU.';
      case 'unit':
        return 'What unit should we use for this item (e.g. box, bottle, each)?';
      case 'quantity':
        return 'What quantity?';
      case 'email':
        return 'What email address should we use for the new user?';
      case 'firstName':
        return 'What is their first name?';
      case 'role':
        return 'What role should they have (e.g. DOCTOR, RECEPTIONIST, CUSTOMER)?';
      default:
        return `I still need: ${slot}. Could you provide that?`;
    }
  }
}
