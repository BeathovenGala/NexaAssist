import { z } from 'zod';

export const chatIntentSchema = z.enum([
  'book_appointment',
  'reschedule_appointment',
  'cancel_appointment',
  'doctor_schedule_query',
  'inventory_lookup',
  'inventory_create',
  'inventory_request',
  'user_create',
  'user_invite',
  'general',
  'unknown',
]);

export type ChatIntent = z.infer<typeof chatIntentSchema>;

export const chatEntitiesSchema = z.object({
  staffName: z.string().nullable().optional(),
  staffId: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  patientName: z.string().nullable().optional(),
  appointmentId: z.string().nullable().optional(),
  itemName: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  categoryName: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type ChatEntities = z.infer<typeof chatEntitiesSchema>;

export const classifierOutputSchema = z.object({
  intent: chatIntentSchema,
  confidence: z.number().min(0).max(1),
  entities: chatEntitiesSchema.default({}),
  offTopic: z.boolean().default(false),
  userFacingHint: z.string().nullable().optional(),
});

export type ClassifierOutput = z.infer<typeof classifierOutputSchema>;

export type ConversationSlots = Record<string, unknown>;

export type ChatCard =
  | {
      type: 'slot_picker';
      slots: { start: string; end: string; label: string }[];
      staffName?: string;
      date?: string;
    }
  | {
      type: 'booking_summary';
      staffName: string;
      date: string;
      time: string;
      appointmentCode?: string;
    }
  | {
      type: 'inventory_results';
      items: { id: string; name: string; sku: string; quantity: number; status: string }[];
    }
  | {
      type: 'staff_picker';
      staff: { id: string; label: string }[];
    }
  | {
      type: 'confirmation';
      tool: string;
      summary: string;
    };

export type ChatSuggestion = { label: string; message: string };

export interface OrchestratorResult {
  content: string;
  metadata?: {
    cards?: ChatCard[];
    pendingConfirmation?: boolean;
    workflow?: string;
    step?: string;
    suggestions?: ChatSuggestion[];
  };
}
