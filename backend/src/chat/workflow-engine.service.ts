import { Injectable } from '@nestjs/common';
import { AppointmentStatus, ConversationWorkflow } from '@prisma/client';
import { AppointmentsService } from '../appointments/appointments.service';
import { isCustomerOnly } from '../common/utils/scheduling.util';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { ChatToolExecutorService } from './chat-tool-executor.service';
import { ChatToolRegistryService, type ChatToolName } from './chat-tool-registry.service';
import { SlotFillerService } from './slot-filler.service';
import type {
  ChatCard,
  ConversationSlots,
  OrchestratorResult,
} from './types/chat-intent.types';

function parseRelativeDate(input: string): string {
  const result = extractDateFromText(input);
  return result ?? input.trim();
}

function extractDateFromText(input: string): string | null {
  // Normalise: collapse spaces around hyphens (handles "2026 -05-20")
  const cleaned = input.trim().replace(/\s*-\s*/g, '-');

  // Embedded ISO date anywhere in the string
  const isoMatch = cleaned.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const lower = cleaned.toLowerCase();
  const now = new Date();

  if (/\bday after tomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 2);
    return d.toISOString().slice(0, 10);
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  if (/\btoday\b/.test(lower)) {
    return now.toISOString().slice(0, 10);
  }

  // Named weekdays: "next monday", "this friday", or just "monday"
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      const d = new Date(now);
      const currentDay = d.getUTCDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7;
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }

  return null;
}

function extractTimeFromText(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // HH:MM anywhere in the message
  const colonMatch = input.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // "8 am", "8am", "8 PM", "8 o'clock", "8 o clock", "8 oclock"
  const amPmMatch = lower.match(/\b(\d{1,2})\s*(?:(am|pm)|o'?\s*clock|oclock)\b/);
  if (amPmMatch) {
    let h = parseInt(amPmMatch[1], 10);
    const suffix = amPmMatch[2] ?? '';
    if (suffix === 'pm' && h !== 12) h += 12;
    if (suffix === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:00`;
  }

  // "9 30" — two bare numbers at start that look like hours and minutes
  const spaceMatch = lower.match(/^(\d{1,2})\s+(\d{2})(?:\s|$)/);
  if (spaceMatch) {
    const h = parseInt(spaceMatch[1], 10);
    const m = parseInt(spaceMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return null;
}

function dayBounds(dateStr: string): { from: string; to: string } {
  return {
    from: `${dateStr}T00:00:00.000Z`,
    to: `${dateStr}T23:59:59.999Z`,
  };
}

function formatSlotLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return `${s.toLocaleTimeString('en-US', opts)} – ${e.toLocaleTimeString('en-US', opts)}`;
}

const META_WORDS = new Set([
  'options', 'option', 'show', 'list', 'all', 'any', 'give', 'see', 'view',
  'pick', 'choose', 'choices', 'choice', 'others', 'more', 'help', 'menu',
  'tell', 'what', 'who', 'which', 'anyone', 'somebody', 'someone',
]);

function isLikelyStaffNameInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  if (/\d/.test(trimmed)) return false;
  if (/[.,!?]/.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  // Single meta/option words that are not names
  if (META_WORDS.has(lower)) return false;
  if (
    /\b(book|appointment|today|tomorrow|available|slot|time|date|doctor|staff|who|which|options|show|list|any|choose|pick|give|tell|what)\b/.test(
      lower,
    )
  ) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z\s'-]*$/.test(trimmed);
}

function isAvailabilityPrompt(input: string): boolean {
  const lower = input.toLowerCase().trim();
  // Exact short meta words
  if (META_WORDS.has(lower)) return true;
  return (
    /\b(who is available|who.?s available|which are there|which doctor|available doctor|available staff|show me|show all|list all|any doctor|any staff|what are my options|give me options)\b/.test(
      lower,
    ) ||
    /\bwho\b/.test(lower) ||
    /\bwhich\b/.test(lower) ||
    /\boptions?\b/.test(lower) ||
    /\blist\b/.test(lower)
  );
}

@Injectable()
export class WorkflowEngineService {
  constructor(
    private readonly slotFiller: SlotFillerService,
    private readonly tools: ChatToolExecutorService,
    private readonly registry: ChatToolRegistryService,
    private readonly appointments: AppointmentsService,
    private readonly prisma: PrismaService,
  ) {}

  async advance(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    workflow: ConversationWorkflow,
    step: string,
    slots: ConversationSlots,
    userMessage: string,
  ): Promise<{
    workflow: ConversationWorkflow;
    step: string;
    slots: ConversationSlots;
    missingSlots: string[];
    result: OrchestratorResult;
    pendingTool?: string;
    pendingPayload?: ConversationSlots;
  }> {
    switch (workflow) {
      case ConversationWorkflow.BOOK_APPOINTMENT:
        return this.advanceBooking(
          actor,
          tenantId,
          sessionId,
          step,
          slots,
          userMessage,
        );
      case ConversationWorkflow.DOCTOR_SCHEDULE_QUERY:
        return this.advanceDoctorQuery(actor, tenantId, sessionId, slots);
      case ConversationWorkflow.INVENTORY_LOOKUP:
        return this.advanceInventoryLookup(
          actor,
          tenantId,
          sessionId,
          slots,
        );
      case ConversationWorkflow.INVENTORY_CREATE:
        return this.advanceInventoryCreate(
          actor,
          tenantId,
          sessionId,
          slots,
        );
      case ConversationWorkflow.INVENTORY_REQUEST:
        return this.advanceInventoryRequest(
          actor,
          tenantId,
          sessionId,
          slots,
        );
      case ConversationWorkflow.USER_CREATE:
        return this.advanceUserInvite(actor, tenantId, sessionId, slots);
      case ConversationWorkflow.CANCEL_APPOINTMENT:
        return this.advanceCancel(actor, tenantId, sessionId, slots);
      case ConversationWorkflow.RESCHEDULE_APPOINTMENT:
        return this.advanceReschedule(actor, tenantId, sessionId, slots);
      default:
        return {
          workflow: ConversationWorkflow.NONE,
          step: 'idle',
          slots,
          missingSlots: [],
          result: {
            content:
              'I can help with appointments, inventory, and team invites. What would you like to do?',
          },
        };
    }
  }

  private async resolveStaffId(
    actor: AuthUser,
    tenantId: string,
    slots: ConversationSlots,
  ): Promise<ConversationSlots> {
    if (slots.staffId) return slots;
    const name = String(slots.staffName ?? '').toLowerCase();
    if (!name) return slots;
    const staff = await this.appointments.listBookableStaff(actor, tenantId);
    const matches = staff.filter((s) => {
      const full = `${s.firstName} ${s.lastName ?? ''}`.toLowerCase();
      return (
        full.includes(name) ||
        s.firstName.toLowerCase().includes(name) ||
        name.includes(s.firstName.toLowerCase())
      );
    });
    if (matches.length === 1) {
      return {
        ...slots,
        staffId: matches[0].id,
        staffDisplayName: `${matches[0].firstName} ${matches[0].lastName ?? ''}`.trim(),
      };
    }
    if (matches.length > 1) {
      return { ...slots, staffCandidates: matches };
    }
    return slots;
  }

  private async advanceBooking(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    step: string,
    slots: ConversationSlots,
    userMessage: string,
  ): Promise<{
    workflow: ConversationWorkflow;
    step: string;
    slots: ConversationSlots;
    missingSlots: string[];
    result: OrchestratorResult;
    pendingTool?: string;
    pendingPayload?: ConversationSlots;
  }> {
    let nextSlots = { ...slots };
    const userInput = userMessage.trim();

    // --- Date resolution ---
    if (nextSlots.date) {
      nextSlots.date = parseRelativeDate(String(nextSlots.date));
    }
    // Also try to pull a date out of the raw user message when date is still missing
    if (!nextSlots.date) {
      const extractedDate = extractDateFromText(userInput);
      if (extractedDate) nextSlots.date = extractedDate;
    }

    // --- Time resolution ---
    // Try to extract a time string from the user message (handles "8 am", "9 30", "9:30", "8 o clock")
    const extractedTime = extractTimeFromText(userInput);
    if (extractedTime && !nextSlots.time) {
      nextSlots.time = extractedTime;
    }

    // --- Staff name inference ---
    if (!nextSlots.staffId && !nextSlots.staffName && isLikelyStaffNameInput(userInput)) {
      nextSlots.staffName = userInput;
    }

    nextSlots = await this.resolveStaffId(actor, tenantId, nextSlots);

    if (!nextSlots.staffId && !nextSlots.staffName && isAvailabilityPrompt(userInput)) {
      const staff = await this.appointments.listBookableStaff(actor, tenantId);
      if (staff.length) {
        const card: ChatCard = {
          type: 'staff_picker',
          staff: staff.map((s) => ({
            id: s.id,
            label: `${s.firstName} ${s.lastName ?? ''}`.trim(),
          })),
        };
        return {
          workflow: ConversationWorkflow.BOOK_APPOINTMENT,
          step: 'resolve_staff',
          slots: nextSlots,
          missingSlots: ['staffId'],
          result: {
            content: 'These providers are currently bookable. Which one should I use?',
            metadata: { cards: [card], workflow: 'BOOK_APPOINTMENT', step: 'resolve_staff' },
          },
        };
      }
      return {
        workflow: ConversationWorkflow.BOOK_APPOINTMENT,
        step: 'resolve_staff',
        slots: nextSlots,
        missingSlots: ['staffId'],
        result: {
          content: 'I could not find any bookable providers right now. Try again in a moment.',
        },
      };
    }

    if (nextSlots.staffCandidates && !nextSlots.staffId) {
      const candidates = nextSlots.staffCandidates as {
        id: string;
        firstName: string;
        lastName: string | null;
      }[];
      const card: ChatCard = {
        type: 'staff_picker',
        staff: candidates.map((c) => ({
          id: c.id,
          label: `${c.firstName} ${c.lastName ?? ''}`.trim(),
        })),
      };
      return {
        workflow: ConversationWorkflow.BOOK_APPOINTMENT,
        step: 'resolve_staff',
        slots: nextSlots,
        missingSlots: ['staffId'],
        result: {
          content: 'I found multiple providers. Which one did you mean?',
          metadata: { cards: [card], workflow: 'BOOK_APPOINTMENT', step: 'resolve_staff' },
        },
      };
    }

    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.BOOK_APPOINTMENT,
      nextSlots,
      actor,
    );
    if (missing.length > 0) {
      const slot = this.slotFiller.nextMissingSlot(missing)!;
      return {
        workflow: ConversationWorkflow.BOOK_APPOINTMENT,
        step: slot === 'time' ? 'show_slots' : `collect_${slot}`,
        slots: nextSlots,
        missingSlots: missing,
        result: {
          content: this.slotFiller.questionForSlot(slot, nextSlots),
          metadata: { workflow: 'BOOK_APPOINTMENT', step: slot },
        },
      };
    }

    const dateStr = String(nextSlots.date);
    const staffId = String(nextSlots.staffId);
    let slotFrom = nextSlots.startTime as string | undefined;
    let slotTo = nextSlots.endTime as string | undefined;

    if (!slotFrom && nextSlots.time) {
      const bounds = dayBounds(dateStr);
      const free = await this.tools.execute(actor, tenantId, sessionId, 'getFreeSlots', {
        staffId,
        slotFrom: bounds.from,
        slotTo: bounds.to,
        date: dateStr,
        durationMinutes: 30,
      });
      if (!free.success) {
        return {
          workflow: ConversationWorkflow.BOOK_APPOINTMENT,
          step: 'show_slots',
          slots: nextSlots,
          missingSlots: ['time'],
          result: { content: free.error ?? 'Could not load availability.' },
        };
      }
      const rawSlots = (free.data as { startTime: string; endTime: string }[]) ?? [];
      const available = rawSlots.map((s) => ({
        start: s.startTime,
        end: s.endTime,
      }));
      if (!available.length) {
        const nextDay = await this.findNextDayWithSlots(
          actor,
          tenantId,
          sessionId,
          staffId,
          dateStr,
        );
        if (nextDay) {
          return {
            workflow: ConversationWorkflow.BOOK_APPOINTMENT,
            step: 'show_slots',
            slots: { ...nextSlots, date: nextDay.date, offeredSlots: nextDay.slots },
            missingSlots: ['time'],
            result: {
              content: `No openings on ${dateStr}. The next available day is ${nextDay.date}. Here are open times:`,
              metadata: {
                cards: [
                  {
                    type: 'slot_picker',
                    slots: nextDay.slots,
                    staffName: String(nextSlots.staffDisplayName ?? ''),
                    date: nextDay.date,
                  },
                ],
              },
            },
          };
        }
        return {
          workflow: ConversationWorkflow.BOOK_APPOINTMENT,
          step: 'show_slots',
          slots: nextSlots,
          missingSlots: ['time'],
          result: {
            content: `No available slots on ${dateStr} or the next week. Try another date or provider.`,
          },
        };
      }
      const cards: ChatCard[] = [
        {
          type: 'slot_picker',
          slots: available.slice(0, 12).map((s) => ({
            start: s.start,
            end: s.end,
            label: formatSlotLabel(s.start, s.end),
          })),
          staffName: String(nextSlots.staffDisplayName ?? ''),
          date: dateStr,
        },
      ];
      return {
        workflow: ConversationWorkflow.BOOK_APPOINTMENT,
        step: 'select_time',
        slots: { ...nextSlots, offeredSlots: available },
        missingSlots: ['time'],
        result: {
          content: `Here are available times with ${nextSlots.staffDisplayName ?? 'your provider'} on ${dateStr}. Tap a slot or tell me a time.`,
          metadata: { cards, workflow: 'BOOK_APPOINTMENT', step: 'select_time' },
        },
      };
    }

    if (!slotFrom || !slotTo) {
      // Re-render cached slots if available so the picker always stays visible
      const cachedSlots = nextSlots.offeredSlots as
        | { start: string; end: string }[]
        | undefined;
      if (cachedSlots?.length) {
        const cachedDate = String(nextSlots.date ?? dateStr);
        const repickCard: ChatCard = {
          type: 'slot_picker',
          slots: cachedSlots.slice(0, 12).map((s) => ({
            start: s.start,
            end: s.end,
            label: formatSlotLabel(s.start, s.end),
          })),
          staffName: String(nextSlots.staffDisplayName ?? ''),
          date: cachedDate,
        };
        return {
          workflow: ConversationWorkflow.BOOK_APPOINTMENT,
          step: 'select_time',
          slots: nextSlots,
          missingSlots: ['time'],
          result: {
            content: `Tap a slot or type a time like "9:30 am" — here are the available times with ${nextSlots.staffDisplayName ?? 'your provider'} on ${cachedDate}.`,
            metadata: { cards: [repickCard], workflow: 'BOOK_APPOINTMENT', step: 'select_time' },
          },
        };
      }
      // No cached slots yet — fetch them now so the picker appears immediately
      if (nextSlots.staffId && nextSlots.date) {
        const fetchDate = String(nextSlots.date);
        const bounds = dayBounds(fetchDate);
        const free = await this.tools.execute(actor, tenantId, sessionId, 'getFreeSlots', {
          staffId: String(nextSlots.staffId),
          slotFrom: bounds.from,
          slotTo: bounds.to,
          date: fetchDate,
          durationMinutes: 30,
        });
        const rawSlots = (free.data as { startTime: string; endTime: string }[] | undefined) ?? [];
        if (rawSlots.length) {
          const available = rawSlots.map((s) => ({
            start: s.startTime,
            end: s.endTime,
          }));
          const fetchCard: ChatCard = {
            type: 'slot_picker',
            slots: available.slice(0, 12).map((s) => ({
              start: s.start,
              end: s.end,
              label: formatSlotLabel(s.start, s.end),
            })),
            staffName: String(nextSlots.staffDisplayName ?? ''),
            date: fetchDate,
          };
          return {
            workflow: ConversationWorkflow.BOOK_APPOINTMENT,
            step: 'select_time',
            slots: { ...nextSlots, offeredSlots: available },
            missingSlots: ['time'],
            result: {
              content: `Here are available times with ${nextSlots.staffDisplayName ?? 'your provider'} on ${fetchDate}. Tap a slot or type a time like "9:30 am".`,
              metadata: { cards: [fetchCard], workflow: 'BOOK_APPOINTMENT', step: 'select_time' },
            },
          };
        }
      }
      return {
        workflow: ConversationWorkflow.BOOK_APPOINTMENT,
        step: 'select_time',
        slots: nextSlots,
        missingSlots: ['time'],
        result: {
          content: 'Please pick a time slot or type a time like "9:30 am" or "2 pm".',
        },
      };
    }

    const title = isCustomerOnly(actor)
      ? 'Appointment via assistant'
      : `Appointment for ${nextSlots.patientName ?? 'patient'}`;

    const pendingPayload: ConversationSlots = {
      ...nextSlots,
      startTime: slotFrom,
      endTime: slotTo,
      title,
    };

    const staffLabel = String(nextSlots.staffDisplayName ?? 'provider');
    const confirmCard: ChatCard = {
      type: 'confirmation' as const,
      tool: 'createAppointment',
      summary: `Book ${formatSlotLabel(slotFrom, slotTo)} on ${dateStr} with ${staffLabel}?`,
    };

    return {
      workflow: ConversationWorkflow.PENDING_CONFIRMATION,
      step: 'confirm',
      slots: nextSlots,
      missingSlots: [],
      pendingTool: 'createAppointment',
      pendingPayload,
      result: {
        content: `Please confirm: book ${formatSlotLabel(slotFrom, slotTo)} on ${dateStr} with ${staffLabel}?`,
        metadata: {
          cards: [confirmCard],
          pendingConfirmation: true,
          workflow: 'BOOK_APPOINTMENT',
        },
      },
    };
  }

  private async findNextDayWithSlots(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    staffId: string,
    startDateStr: string,
  ): Promise<{ date: string; slots: { start: string; end: string; label: string }[] } | null> {
    const start = new Date(`${startDateStr}T12:00:00.000Z`);
    for (let i = 1; i <= 7; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      const bounds = dayBounds(date);
      const free = await this.tools.execute(actor, tenantId, sessionId, 'getFreeSlots', {
        staffId,
        slotFrom: bounds.from,
        slotTo: bounds.to,
        durationMinutes: 30,
      });
      const rawSlots = (free.data as { startTime: string; endTime: string }[]) ?? [];
      const available = rawSlots.map((s) => ({
        start: s.startTime,
        end: s.endTime,
      }));
      if (available.length) {
        return {
          date,
          slots: available.slice(0, 8).map((s) => ({
            start: s.start,
            end: s.end,
            label: formatSlotLabel(s.start, s.end),
          })),
        };
      }
    }
    return null;
  }

  private async advanceDoctorQuery(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    const date = slots.date
      ? parseRelativeDate(String(slots.date))
      : new Date().toISOString().slice(0, 10);
    const all = await this.tools.execute(actor, tenantId, sessionId, 'countAppointments', {
      date,
    });
    const pending = await this.tools.execute(actor, tenantId, sessionId, 'countAppointments', {
      date,
      statusFilter: AppointmentStatus.PENDING,
    });
    const allData = all.data as { total: number };
    const pendingData = pending.data as { total: number };
    return {
      workflow: ConversationWorkflow.NONE,
      step: 'done',
      slots,
      missingSlots: [],
      result: {
        content: `On ${date} you have ${allData?.total ?? 0} appointment(s), ${pendingData?.total ?? 0} pending approval.`,
      },
    };
  }

  private async advanceInventoryLookup(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.INVENTORY_LOOKUP,
      slots,
      actor,
    );
    if (missing.length) {
      return {
        workflow: ConversationWorkflow.INVENTORY_LOOKUP,
        step: 'collect_itemName',
        slots,
        missingSlots: missing,
        result: { content: this.slotFiller.questionForSlot('itemName', slots) },
      };
    }
    const search = await this.tools.execute(actor, tenantId, sessionId, 'searchInventory', slots);
    if (!search.success) {
      return {
        workflow: ConversationWorkflow.NONE,
        step: 'idle',
        slots,
        missingSlots: [],
        result: { content: search.error ?? 'Search failed.' },
      };
    }
    const data = search.data as {
      items: { id: string; name: string; sku: string; quantity: number; status: string }[];
    };
    if (!data.items?.length) {
      return {
        workflow: ConversationWorkflow.INVENTORY_REQUEST,
        step: 'collect_quantity',
        slots: { ...slots, itemName: slots.itemName },
        missingSlots: ['quantity'],
        result: {
          content: `I could not find "${slots.itemName}". Would you like to submit a restock request? How many units?`,
        },
      };
    }
    const card: ChatCard = {
      type: 'inventory_results',
      items: data.items.map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        status: i.status,
      })),
    };
    return {
      workflow: ConversationWorkflow.NONE,
      step: 'done',
      slots,
      missingSlots: [],
      result: {
        content: `Found ${data.items.length} item(s) matching your search.`,
        metadata: { cards: [card] },
      },
    };
  }

  private async advanceInventoryCreate(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.INVENTORY_CREATE,
      slots,
      actor,
    );
    if (missing.length) {
      return {
        workflow: ConversationWorkflow.INVENTORY_CREATE,
        step: `collect_${missing[0]}`,
        slots,
        missingSlots: missing,
        result: { content: this.slotFiller.questionForSlot(missing[0]!, slots) },
      };
    }
    return {
      workflow: ConversationWorkflow.PENDING_CONFIRMATION,
      step: 'confirm',
      slots,
      missingSlots: [],
      pendingTool: 'createInventoryItem',
      pendingPayload: slots,
      result: {
        content: `Add inventory item "${slots.itemName}" (${slots.quantity} ${slots.unit})?`,
        metadata: {
          pendingConfirmation: true,
          cards: [
            {
              type: 'confirmation' as const,
              tool: 'createInventoryItem',
              summary: `Create ${slots.itemName}`,
            },
          ],
        },
      },
    };
  }

  private async advanceInventoryRequest(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    let next = { ...slots };
    if (!next.itemId && next.itemName) {
      const search = await this.tools.execute(
        actor,
        tenantId,
        sessionId,
        'searchInventory',
        next,
      );
      const data = search.data as { items: { id: string; name: string }[] };
      if (data?.items?.length === 1) {
        next.itemId = data.items[0].id;
      }
    }
    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.INVENTORY_REQUEST,
      next,
      actor,
    );
    if (missing.length) {
      return {
        workflow: ConversationWorkflow.INVENTORY_REQUEST,
        step: `collect_${missing[0]}`,
        slots: next,
        missingSlots: missing,
        result: { content: this.slotFiller.questionForSlot(missing[0]!, next) },
      };
    }
    return {
      workflow: ConversationWorkflow.PENDING_CONFIRMATION,
      step: 'confirm',
      slots: next,
      missingSlots: [],
      pendingTool: 'createRestockRequest',
      pendingPayload: next,
      result: {
        content: `Submit restock request for ${next.quantity} units?`,
        metadata: { pendingConfirmation: true },
      },
    };
  }

  private async advanceUserInvite(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.USER_CREATE,
      slots,
      actor,
    );
    if (missing.length) {
      return {
        workflow: ConversationWorkflow.USER_CREATE,
        step: `collect_${missing[0]}`,
        slots,
        missingSlots: missing,
        result: { content: this.slotFiller.questionForSlot(missing[0]!, slots) },
      };
    }
    const tool: ChatToolName = this.registry.isAllowed(actor, 'createInvitation')
      ? 'createInvitation'
      : 'createUser';
    return {
      workflow: ConversationWorkflow.PENDING_CONFIRMATION,
      step: 'confirm',
      slots,
      missingSlots: [],
      pendingTool: tool,
      pendingPayload: { ...slots, tenantId },
      result: {
        content: `Send an invitation to ${slots.email} as ${slots.role}?`,
        metadata: {
          pendingConfirmation: true,
          cards: [
            {
              type: 'confirmation' as const,
              tool,
              summary: `Invite ${slots.email} (${slots.role})`,
            },
          ],
        },
      },
    };
  }

  private async advanceCancel(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    if (!slots.appointmentId) {
      const code = String(slots.appointmentCode ?? '').trim();
      if (code) {
        const row = await this.prisma.appointment.findFirst({
          where: { tenantId, appointmentCode: { contains: code, mode: 'insensitive' } },
        });
        if (row) slots = { ...slots, appointmentId: row.id };
      }
    }
    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.CANCEL_APPOINTMENT,
      slots,
      actor,
    );
    if (missing.length) {
      return {
        workflow: ConversationWorkflow.CANCEL_APPOINTMENT,
        step: 'collect_appointmentId',
        slots,
        missingSlots: missing,
        result: { content: this.slotFiller.questionForSlot('appointmentId', slots) },
      };
    }
    return {
      workflow: ConversationWorkflow.PENDING_CONFIRMATION,
      step: 'confirm',
      slots,
      missingSlots: [],
      pendingTool: 'cancelAppointment',
      pendingPayload: slots,
      result: {
        content: 'Cancel this appointment?',
        metadata: { pendingConfirmation: true },
      },
    };
  }

  private async advanceReschedule(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    slots: ConversationSlots,
  ) {
    const nextSlots = { ...slots };
    if (!nextSlots.appointmentId && nextSlots.appointmentCode) {
      const row = await this.prisma.appointment.findFirst({
        where: {
          tenantId,
          appointmentCode: {
            contains: String(nextSlots.appointmentCode),
            mode: 'insensitive',
          },
        },
      });
      if (row) {
        nextSlots.appointmentId = row.id;
      }
    }
    if (nextSlots.date) {
      nextSlots.date = parseRelativeDate(String(nextSlots.date));
    }
    if (!nextSlots.startTime && nextSlots.date && nextSlots.time) {
      const date = String(nextSlots.date);
      const time = String(nextSlots.time);
      const [hours, minutes] = time.split(':').map((part) => Number(part));
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const start = new Date(`${date}T00:00:00.000Z`);
        start.setUTCHours(hours, minutes, 0, 0);
        const end = new Date(start);
        end.setUTCMinutes(end.getUTCMinutes() + 30);
        nextSlots.startTime = start.toISOString();
        nextSlots.endTime = end.toISOString();
      }
    }

    const missing = this.slotFiller.computeMissingSlots(
      ConversationWorkflow.RESCHEDULE_APPOINTMENT,
      nextSlots,
      actor,
    );
    if (missing.length) {
      return {
        workflow: ConversationWorkflow.RESCHEDULE_APPOINTMENT,
        step: `collect_${missing[0]}`,
        slots: nextSlots,
        missingSlots: missing,
        result: { content: this.slotFiller.questionForSlot(missing[0]!, nextSlots) },
      };
    }

    const confirmCard: ChatCard = {
      type: 'confirmation',
      tool: 'rescheduleAppointment',
      summary: `Reschedule to ${formatSlotLabel(String(nextSlots.startTime), String(nextSlots.endTime))} on ${String(nextSlots.date)}`,
    };

    return {
      workflow: ConversationWorkflow.PENDING_CONFIRMATION,
      step: 'confirm',
      slots: nextSlots,
      missingSlots: [],
      pendingTool: 'rescheduleAppointment',
      pendingPayload: {
        appointmentId: nextSlots.appointmentId,
        startTime: nextSlots.startTime,
        endTime: nextSlots.endTime,
      },
      result: {
        content: `Please confirm rescheduling this appointment to ${formatSlotLabel(String(nextSlots.startTime), String(nextSlots.endTime))} on ${String(nextSlots.date)}.`,
        metadata: {
          pendingConfirmation: true,
          cards: [confirmCard],
        },
      },
    };
  }
}
