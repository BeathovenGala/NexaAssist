import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../types/auth-user';
import { isCustomerOnly } from '../common/utils/scheduling.util';
import { ChatToolExecutorService } from './chat-tool-executor.service';
import { type ChatToolName } from './chat-tool-registry.service';
import { MUTATING_TOOLS, buildAgentTools, parseToolArgs } from './chat-agent-tools';
import {
  OpenRouterService,
  type OpenRouterMessage,
  type OpenRouterToolCall,
} from './openrouter.service';
import type { ConversationSlots, OrchestratorResult } from './types/chat-intent.types';

const DEFAULT_MAX_AGENT_STEPS = 6;

type AgentInput = {
  actor: AuthUser;
  tenantId: string;
  sessionId: string;
  userMessage: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  allowedTools: ChatToolName[];
};

type AgentResult = {
  result: OrchestratorResult;
  proposedTool?: ChatToolName;
  proposedPayload?: ConversationSlots;
};

@Injectable()
export class ChatAgentService {
  constructor(
    private readonly openRouter: OpenRouterService,
    private readonly tools: ChatToolExecutorService,
    private readonly config: ConfigService,
  ) {}

  isEnabled(): boolean {
    return this.openRouter.isConfigured();
  }

  getMode(): 'off' | 'fallback' | 'primary' {
    const mode = this.config.get<string>('CHAT_AGENT_MODE')?.toLowerCase();
    if (mode === 'off' || mode === 'primary' || mode === 'fallback') {
      return mode;
    }
    return 'fallback';
  }

  private getMaxAgentSteps(): number {
    const configured = Number(
      this.config.get<string>('CHAT_MAX_AGENT_STEPS') ?? DEFAULT_MAX_AGENT_STEPS,
    );
    if (!Number.isFinite(configured)) {
      return DEFAULT_MAX_AGENT_STEPS;
    }
    return Math.max(1, Math.floor(configured));
  }

  async reply(input: AgentInput): Promise<AgentResult> {
    const tools = buildAgentTools(input.allowedTools);
    const maxAgentSteps = this.getMaxAgentSteps();
    const messages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: this.systemPrompt(input.allowedTools, input.actor),
      },
      ...input.history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: 'user',
        content: input.userMessage,
      },
    ];

    let lastToolSummary = '';

    for (let step = 0; step < maxAgentSteps; step++) {
      const response = await this.openRouter.chatCompletionWithTools(messages, tools, {
        maxTokens: 900,
      });

      if (!response.toolCalls.length) {
        const content =
          response.content.trim() ||
          lastToolSummary ||
          'I could not find enough information for that. Try rephrasing your request.';
        return {
          result: {
            content,
          },
        };
      }

      messages.push({
        role: 'assistant',
        content: response.content || null,
        tool_calls: response.toolCalls,
      });

      const proposed = this.findMutatingProposal(response.toolCalls);
      if (proposed) {
        return {
          result: {
            content: this.confirmationText(proposed.tool, proposed.payload),
            metadata: {
              pendingConfirmation: true,
              cards: [
                {
                  type: 'confirmation',
                  tool: proposed.tool,
                  summary: this.confirmationText(proposed.tool, proposed.payload),
                },
              ],
            },
          },
          proposedTool: proposed.tool,
          proposedPayload: proposed.payload,
        };
      }

      for (const call of response.toolCalls) {
        const tool = call.function.name as ChatToolName;
        const payload = this.safeParseToolArgs(call);
        const exec = await this.tools.execute(
          input.actor,
          input.tenantId,
          input.sessionId,
          tool,
          payload,
        );
        lastToolSummary = this.summarizeToolResult(tool, exec);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(exec),
        });
      }
    }

    return {
      result: {
        content:
          lastToolSummary ||
          'I need a bit more detail to finish that. Try one specific request (e.g. book tomorrow, search gloves, cancel APT-123).',
      },
    };
  }

  private systemPrompt(allowedTools: ChatToolName[], actor: AuthUser): string {
    const userType = isCustomerOnly(actor) ? 'customer (books for self)' : 'staff';
    return `You are NexaAssist, a tenant-scoped operations assistant for ${userType} users.

Rules:
- Only state facts returned by tools. Never invent appointment IDs, counts, stock levels, or staff names.
- For booking: call listBookableStaff if needed, then getFreeSlots with staffId and date, then propose createAppointment with startTime/endTime.
- For inventory questions: use searchInventory with itemName or sku.
- For schedule counts: use countAppointments or listTodayAppointments.
- For cancel/reschedule: use cancelAppointment or rescheduleAppointment with appointmentId when known.
- If a tool is not in Allowed tools, say you cannot do that and suggest what is available.
- Mutating tools (create/cancel/reschedule): call once to propose; the user confirms in the UI.

Allowed tools: ${allowedTools.join(', ') || 'none'}.`;
  }

  private summarizeToolResult(
    tool: ChatToolName,
    exec: { success: boolean; data?: unknown; error?: string },
  ): string {
    if (!exec.success) {
      return exec.error ?? 'That action could not be completed.';
    }
    const data = exec.data;
    if (tool === 'searchInventory' && data && typeof data === 'object' && 'items' in data) {
      const items = (data as { items: { name: string; quantity: number }[] }).items;
      if (!items.length) return 'No matching inventory items were found.';
      return items
        .slice(0, 5)
        .map((i) => `${i.name}: ${i.quantity} in stock`)
        .join('\n');
    }
    if (tool === 'listTodayAppointments' && Array.isArray(data)) {
      return data.length
        ? `You have ${data.length} appointment(s) today.`
        : 'No appointments scheduled for today.';
    }
    if (tool === 'countAppointments' && data && typeof data === 'object') {
      const c = data as { total?: number; pending?: number };
      if (c.pending != null) {
        return `Today: ${c.total ?? 0} total, ${c.pending} pending approval.`;
      }
      return `Appointment count: ${c.total ?? 0}.`;
    }
    if (tool === 'getFreeSlots' && Array.isArray(data)) {
      return data.length
        ? `Found ${data.length} available slot(s). Pick a time from the options shown.`
        : 'No free slots for that date. Try another day.';
    }
    if (tool === 'listBookableStaff' && Array.isArray(data)) {
      return data.length
        ? `Available providers: ${(data as { label?: string; name?: string }[])
            .map((s) => s.label ?? s.name)
            .filter(Boolean)
            .join(', ')}.`
        : 'No bookable staff found.';
    }
    return 'Here is what I found. Let me know if you need anything else.';
  }

  private safeParseToolArgs(call: OpenRouterToolCall): ConversationSlots {
    try {
      return parseToolArgs(call.function.arguments);
    } catch {
      return {};
    }
  }

  private findMutatingProposal(
    calls: OpenRouterToolCall[],
  ): { tool: ChatToolName; payload: ConversationSlots } | null {
    for (const call of calls) {
      const name = call.function.name as ChatToolName;
      if (!MUTATING_TOOLS.includes(name)) {
        continue;
      }
      return {
        tool: name,
        payload: this.safeParseToolArgs(call),
      };
    }
    return null;
  }

  private confirmationText(tool: ChatToolName, payload: ConversationSlots): string {
    switch (tool) {
      case 'createAppointment':
        return `Please confirm creating this appointment${payload.startTime ? ` at ${String(payload.startTime)}` : ''}.`;
      case 'cancelAppointment':
        return 'Please confirm cancelling this appointment.';
      case 'rescheduleAppointment':
        return `Please confirm rescheduling this appointment${payload.startTime ? ` to ${String(payload.startTime)}` : ''}.`;
      case 'createInventoryItem':
        return `Please confirm creating inventory item ${String(payload.itemName ?? 'item')}.`;
      case 'createRestockRequest':
        return 'Please confirm creating this restock request.';
      case 'createInvitation':
        return `Please confirm sending invitation to ${String(payload.email ?? 'this user')}.`;
      case 'confirmAppointment':
        return 'Please confirm approving this appointment.';
      case 'createUser':
        return 'Please confirm creating this user.';
      default:
        return 'Please confirm this action.';
    }
  }
}
