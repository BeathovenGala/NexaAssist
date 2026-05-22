import type { ChatToolName } from './chat-tool-registry.service';
import type { OpenRouterToolDefinition } from './openrouter.service';
import type { ConversationSlots } from './types/chat-intent.types';

type ToolParameters = OpenRouterToolDefinition['function']['parameters'];

type AgentToolConfig = {
  name: ChatToolName;
  description: string;
  parameters: ToolParameters;
};

const TOOL_CONFIGS: AgentToolConfig[] = [
  {
    name: 'listBookableStaff',
    description: 'List staff members available for booking appointments.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'getFreeSlots',
    description:
      'Get free appointment slots for a staff member between slotFrom and slotTo.',
    parameters: {
      type: 'object',
      properties: {
        staffId: { type: 'string' },
        slotFrom: { type: 'string', description: 'ISO datetime' },
        slotTo: { type: 'string', description: 'ISO datetime' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        durationMinutes: { type: 'number' },
      },
      required: ['staffId', 'slotFrom', 'slotTo'],
      additionalProperties: false,
    },
  },
  {
    name: 'countAppointments',
    description:
      'Count appointments on a date, optionally filtered by status such as PENDING.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        statusFilter: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'listTodayAppointments',
    description: 'List today appointment counts and sample items.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'searchInventory',
    description: 'Search inventory items by itemName or sku.',
    parameters: {
      type: 'object',
      properties: {
        itemName: { type: 'string' },
        sku: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'createAppointment',
    description:
      'Create an appointment request for a patient with staff and time range.',
    parameters: {
      type: 'object',
      properties: {
        staffId: { type: 'string' },
        startTime: { type: 'string', description: 'ISO datetime' },
        endTime: { type: 'string', description: 'ISO datetime' },
        title: { type: 'string' },
        notes: { type: 'string' },
        patientEmail: { type: 'string' },
        customerId: { type: 'string' },
      },
      required: ['staffId', 'startTime', 'endTime'],
      additionalProperties: false,
    },
  },
  {
    name: 'cancelAppointment',
    description: 'Cancel an appointment by appointmentId.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
  },
  {
    name: 'rescheduleAppointment',
    description:
      'Reschedule an appointment by id to a new start and end datetime.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
        startTime: { type: 'string', description: 'ISO datetime' },
        endTime: { type: 'string', description: 'ISO datetime' },
      },
      required: ['appointmentId', 'startTime', 'endTime'],
      additionalProperties: false,
    },
  },
  {
    name: 'createInventoryItem',
    description: 'Create a new inventory item.',
    parameters: {
      type: 'object',
      properties: {
        itemName: { type: 'string' },
        sku: { type: 'string' },
        unit: { type: 'string' },
        quantity: { type: 'number' },
        minimumThreshold: { type: 'number' },
        description: { type: 'string' },
      },
      required: ['itemName', 'unit', 'quantity'],
      additionalProperties: false,
    },
  },
  {
    name: 'createRestockRequest',
    description: 'Create a restock request for an inventory item.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string' },
        quantity: { type: 'number' },
        reason: { type: 'string' },
      },
      required: ['itemId', 'quantity'],
      additionalProperties: false,
    },
  },
  {
    name: 'createInvitation',
    description: 'Create a user invitation with role and email.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        role: { type: 'string' },
      },
      required: ['email', 'role'],
      additionalProperties: false,
    },
  },
  {
    name: 'confirmAppointment',
    description: 'Confirm an appointment by id.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string' },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
  },
];

export const MUTATING_TOOLS: ChatToolName[] = [
  'createAppointment',
  'cancelAppointment',
  'rescheduleAppointment',
  'createInventoryItem',
  'createRestockRequest',
  'createInvitation',
  'createUser',
  'confirmAppointment',
];

export function buildAgentTools(allowedTools: ChatToolName[]): OpenRouterToolDefinition[] {
  const allowed = new Set(allowedTools);
  return TOOL_CONFIGS.filter((tool) => allowed.has(tool.name)).map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function parseToolArgs(raw: string): ConversationSlots {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as ConversationSlots;
}

