import { Injectable } from '@nestjs/common';
import {
  ChatAuditAction,
  ChatMessageRole,
  ConversationWorkflow,
  Prisma,
} from '@prisma/client';
import {
  isCustomerOnly,
  resolveSchedulingTenantId,
} from '../common/utils/scheduling.util';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { ChatAuditService } from './chat-audit.service';
import { ChatAgentService } from './chat-agent.service';
import { ChatService } from './chat.service';
import { ChatSuggestionsService } from './chat-suggestions.service';
import { ChatToolExecutorService } from './chat-tool-executor.service';
import {
  ChatToolRegistryService,
  type ChatToolName,
} from './chat-tool-registry.service';
import { IntentClassifierService } from './intent-classifier.service';
import { ResponseComposerService } from './response-composer.service';
import { SlotFillerService } from './slot-filler.service';
import { WorkflowEngineService } from './workflow-engine.service';
import type {
  ChatIntent,
  ConversationSlots,
  OrchestratorResult,
} from './types/chat-intent.types';

@Injectable()
export class ConversationOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly classifier: IntentClassifierService,
    private readonly slotFiller: SlotFillerService,
    private readonly workflow: WorkflowEngineService,
    private readonly tools: ChatToolExecutorService,
    private readonly registry: ChatToolRegistryService,
    private readonly composer: ResponseComposerService,
    private readonly audit: ChatAuditService,
    private readonly agent: ChatAgentService,
    private readonly suggestions: ChatSuggestionsService,
  ) {}

  async handleUserMessage(
    actor: AuthUser,
    sessionId: string,
    userContent: string,
  ): Promise<{ userMessageId: string; assistantMessageId: string; result: OrchestratorResult }> {
    const tenantId = resolveSchedulingTenantId(actor);
    const session = await this.chat.getSession(actor, sessionId);
    const state = session.conversationState;
    if (!state) {
      throw new Error('Conversation state missing');
    }

    const userMsg = await this.chat.addMessage(
      sessionId,
      tenantId,
      actor.id,
      ChatMessageRole.USER,
      userContent,
    );

    let slots = (state.slots as ConversationSlots) ?? {};
    let workflow = state.workflow;
    let step = state.step;
    let missingSlots = state.missingSlots;
    let pendingTool = state.pendingTool;
    let pendingPayload = (state.pendingPayload as ConversationSlots) ?? null;

    if (workflow === ConversationWorkflow.PENDING_CONFIRMATION) {
      const lower = userContent.trim().toLowerCase();
      if (/^(yes|confirm|ok|sure|yep)/.test(lower)) {
        return this.executePending(
          actor,
          tenantId,
          sessionId,
          userMsg.id,
          pendingTool!,
          pendingPayload ?? {},
        );
      }
      if (/^(no|cancel|stop|nevermind)/.test(lower)) {
        await this.updateState(sessionId, {
          workflow: ConversationWorkflow.NONE,
          step: 'idle',
          slots: {},
          missingSlots: [],
          pendingTool: null,
          pendingPayload: Prisma.DbNull,
        });
        const result: OrchestratorResult = {
          content: 'Cancelled. What else can I help with?',
        };
        const assistant = await this.persistAssistant(
          sessionId,
          tenantId,
          actor.id,
          result,
        );
        return { userMessageId: userMsg.id, assistantMessageId: assistant.id, result };
      }
    }

    const maxContext = Math.max(
      1,
      Number(process.env.CHAT_MAX_CONTEXT_MESSAGES ?? 8),
    );
    const recentMessages = session.messages.slice(-maxContext);
    const allowedList = this.registry.listAllowedTools(actor);
    const agentMode = this.agent.getMode();
    if (this.agent.isEnabled() && agentMode === 'primary') {
      return this.handleWithAgent(
        actor,
        tenantId,
        sessionId,
        userMsg.id,
        userContent,
        recentMessages,
        allowedList,
        { workflow, missingSlots },
      );
    }
    const recent = recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const allowed = allowedList.join(', ');
    const actorSummary = isCustomerOnly(actor)
      ? 'customer (self-service booking, inventory read)'
      : `staff (${actor.roles.join(', ')})`;
    const classified = await this.classifier.classify(
      userContent,
      recent,
      allowed,
      actorSummary,
    );

    await this.audit.log(sessionId, tenantId, actor.id, ChatAuditAction.INTENT_DETECTED, {
      intent: classified.intent,
      confidence: classified.confidence,
    });

    if (classified.offTopic) {
      const offTopicResult: OrchestratorResult = {
        content:
          classified.userFacingHint ??
          this.suggestions.permissionAwareFallback(actor),
      };
      const withSuggestions = this.attachSuggestions(actor, offTopicResult, {
        workflow,
        missingSlots,
        lastIntent: classified.intent,
      });
      const assistant = await this.persistAssistant(
        sessionId,
        tenantId,
        actor.id,
        withSuggestions,
      );
      return {
        userMessageId: userMsg.id,
        assistantMessageId: assistant.id,
        result: withSuggestions,
      };
    }

    const shouldUseAgentForLowConfidence =
      classified.confidence < this.classifier.lowConfidenceThreshold() &&
      this.agent.isEnabled() &&
      agentMode !== 'off';
    if (shouldUseAgentForLowConfidence) {
      return this.handleWithAgent(
        actor,
        tenantId,
        sessionId,
        userMsg.id,
        userContent,
        recentMessages,
        allowedList,
        { workflow, missingSlots, lastIntent: classified.intent },
      );
    }

    if (classified.confidence < this.classifier.lowConfidenceThreshold()) {
      const fallback: OrchestratorResult = {
        content: this.suggestions.permissionAwareFallback(actor),
      };
      const withSuggestions = this.attachSuggestions(actor, fallback, {
        workflow,
        missingSlots,
        lastIntent: classified.intent,
      });
      const assistant = await this.persistAssistant(
        sessionId,
        tenantId,
        actor.id,
        withSuggestions,
      );
      return {
        userMessageId: userMsg.id,
        assistantMessageId: assistant.id,
        result: withSuggestions,
      };
    }

    if (this.classifier.shouldSwitchWorkflow(workflow, classified)) {
      const mapped = this.classifier.intentToWorkflow(classified.intent);
      if (mapped !== ConversationWorkflow.NONE) {
        workflow = mapped;
        step = 'idle';
      }
    }

    const shouldUseAgentForGeneral =
      this.agent.isEnabled() &&
      agentMode !== 'off' &&
      (agentMode === 'primary' ||
        (workflow === ConversationWorkflow.NONE &&
          (classified.intent === 'general' || classified.intent === 'unknown')));
    if (shouldUseAgentForGeneral) {
      return this.handleWithAgent(
        actor,
        tenantId,
        sessionId,
        userMsg.id,
        userContent,
        recentMessages,
        allowedList,
        { workflow, missingSlots, lastIntent: classified.intent },
      );
    }

    slots = this.slotFiller.mergeSlots(slots, classified.entities);
    missingSlots = this.slotFiller.computeMissingSlots(workflow, slots, actor);

    await this.audit.log(sessionId, tenantId, actor.id, ChatAuditAction.SLOT_UPDATED, {
      slots: slots as Prisma.InputJsonValue,
      missingSlots,
    });

    const advanced = await this.workflow.advance(
      actor,
      tenantId,
      sessionId,
      workflow,
      step,
      slots,
      userContent,
    );

    await this.updateState(sessionId, {
      workflow: advanced.workflow,
      step: advanced.step,
      slots: advanced.slots as Prisma.InputJsonValue,
      missingSlots: advanced.missingSlots,
      confidence: classified.confidence,
      pendingTool: advanced.pendingTool ?? null,
      pendingPayload: advanced.pendingPayload
        ? (advanced.pendingPayload as Prisma.InputJsonValue)
        : Prisma.DbNull,
    });

    let result = advanced.result;
    result = await this.composer.polish(result);
    result = this.attachSuggestions(actor, result, {
      workflow: advanced.workflow,
      missingSlots: advanced.missingSlots,
      lastIntent: classified.intent,
    });

    const assistant = await this.persistAssistant(
      sessionId,
      tenantId,
      actor.id,
      result,
    );

    return {
      userMessageId: userMsg.id,
      assistantMessageId: assistant.id,
      result,
    };
  }

  async confirmPending(actor: AuthUser, sessionId: string) {
    const tenantId = resolveSchedulingTenantId(actor);
    const session = await this.chat.getSession(actor, sessionId);
    const state = session.conversationState;
    if (!state?.pendingTool) {
      return { content: 'Nothing to confirm right now.' };
    }
    return this.executePending(
      actor,
      tenantId,
      sessionId,
      null,
      state.pendingTool,
      (state.pendingPayload as ConversationSlots) ?? {},
    );
  }

  async cancelPending(actor: AuthUser, sessionId: string) {
    const tenantId = resolveSchedulingTenantId(actor);
    await this.chat.getSession(actor, sessionId);
    await this.updateState(sessionId, {
      workflow: ConversationWorkflow.NONE,
      step: 'idle',
      slots: {},
      missingSlots: [],
      pendingTool: null,
      pendingPayload: Prisma.DbNull,
    });
    await this.audit.log(
      sessionId,
      tenantId,
      actor.id,
      ChatAuditAction.CANCELLED,
      {},
    );
    const result: OrchestratorResult = { content: 'Action cancelled.' };
    const assistant = await this.persistAssistant(
      sessionId,
      tenantId,
      actor.id,
      result,
    );
    return { assistantMessageId: assistant.id, result };
  }

  async applySlotSelection(
    actor: AuthUser,
    sessionId: string,
    startTime: string,
    endTime: string,
  ) {
    const tenantId = resolveSchedulingTenantId(actor);
    const session = await this.chat.getSession(actor, sessionId);
    const state = session.conversationState;
    const slots = {
      ...((state?.slots as ConversationSlots) ?? {}),
      startTime,
      endTime,
      time: new Date(startTime).toISOString().slice(11, 16),
    };
    await this.updateState(sessionId, {
      slots: slots as Prisma.InputJsonValue,
      missingSlots: [],
    });
    return this.handleUserMessage(
      actor,
      sessionId,
      `I choose ${startTime}`,
    );
  }

  private async handleWithAgent(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    userMessageId: string,
    userContent: string,
    recentMessages: {
      role: ChatMessageRole;
      content: string;
    }[],
    allowedTools: ChatToolName[],
    suggestionContext?: {
      workflow: ConversationWorkflow;
      missingSlots: string[];
      lastIntent?: ChatIntent;
    },
  ): Promise<{ userMessageId: string; assistantMessageId: string; result: OrchestratorResult }> {
    const agentResult = await this.agent.reply({
      actor,
      tenantId,
      sessionId,
      userMessage: userContent,
      history: recentMessages
        .filter((m) => m.role === ChatMessageRole.USER || m.role === ChatMessageRole.ASSISTANT)
        .map((m) => ({
          role: m.role === ChatMessageRole.USER ? 'user' : 'assistant',
          content: m.content,
        })),
      allowedTools,
    });

    if (agentResult.proposedTool) {
      await this.updateState(sessionId, {
        workflow: ConversationWorkflow.PENDING_CONFIRMATION,
        step: 'confirm',
        pendingTool: agentResult.proposedTool,
        pendingPayload: (agentResult.proposedPayload ?? {}) as Prisma.InputJsonValue,
      });
    } else {
      await this.updateState(sessionId, {
        workflow: ConversationWorkflow.NONE,
        step: 'done',
      });
    }

    let result = agentResult.result;
    if (!result.metadata?.pendingConfirmation) {
      result = await this.composer.polish(result);
    }
    result = this.attachSuggestions(actor, result, {
      workflow: suggestionContext?.workflow ?? ConversationWorkflow.NONE,
      missingSlots: suggestionContext?.missingSlots ?? [],
      lastIntent: suggestionContext?.lastIntent,
    });

    const assistant = await this.persistAssistant(
      sessionId,
      tenantId,
      actor.id,
      result,
    );
    return {
      userMessageId,
      assistantMessageId: assistant.id,
      result,
    };
  }

  private attachSuggestions(
    actor: AuthUser,
    result: OrchestratorResult,
    context: {
      workflow?: ConversationWorkflow;
      missingSlots?: string[];
      lastIntent?: ChatIntent;
    },
  ): OrchestratorResult {
    const suggestionList = this.suggestions.forResult(actor, result, {
      workflow: context.workflow,
      missingSlots: context.missingSlots,
      lastIntent: context.lastIntent,
    });
    if (!suggestionList.length) {
      return result;
    }
    return {
      ...result,
      metadata: {
        ...result.metadata,
        suggestions: suggestionList,
      },
    };
  }

  private async executePending(
    actor: AuthUser,
    tenantId: string,
    sessionId: string,
    userMessageId: string | null,
    tool: string,
    payload: ConversationSlots,
  ) {
    const exec = await this.tools.execute(
      actor,
      tenantId,
      sessionId,
      tool as Parameters<ChatToolExecutorService['execute']>[3],
      payload,
    );

    await this.audit.log(sessionId, tenantId, actor.id, ChatAuditAction.CONFIRMED, {
      tool,
    });

    await this.updateState(sessionId, {
      workflow: ConversationWorkflow.NONE,
      step: 'done',
      slots: {},
      missingSlots: [],
      pendingTool: null,
      pendingPayload: Prisma.DbNull,
    });

    let result: OrchestratorResult;
    if (!exec.success) {
      result = {
        content:
          exec.error?.includes('already booked') || exec.error?.includes('Conflict')
            ? `${exec.error} Here are other times you can try — pick another slot or date.`
            : exec.error ?? 'Something went wrong. Please try again.',
      };
    } else if (tool === 'createAppointment') {
      const appt = exec.data as { appointmentCode?: string; status?: string };
      result = {
        content: `Your appointment request was sent (${appt.appointmentCode ?? 'pending'}). The provider will confirm shortly.`,
        metadata: {
          cards: [
            {
              type: 'booking_summary',
              staffName: String(payload.staffDisplayName ?? 'Provider'),
              date: String(payload.date),
              time: formatTime(String(payload.startTime)),
              appointmentCode: appt.appointmentCode,
            },
          ],
        },
      };
    } else if (tool === 'createInvitation') {
      const inv = exec.data as { inviteUrl?: string };
      result = {
        content: inv.inviteUrl
          ? `Invitation created. Share this link: ${inv.inviteUrl}`
          : 'Invitation sent successfully.',
      };
    } else {
      result = { content: 'Done! Is there anything else I can help with?' };
    }

    result = this.attachSuggestions(actor, result, {});

    const assistant = await this.persistAssistant(
      sessionId,
      tenantId,
      actor.id,
      result,
    );

    return {
      userMessageId: userMessageId ?? '',
      assistantMessageId: assistant.id,
      result,
    };
  }

  private async persistAssistant(
    sessionId: string,
    tenantId: string,
    userId: string,
    result: OrchestratorResult,
  ) {
    return this.chat.addMessage(
      sessionId,
      tenantId,
      userId,
      ChatMessageRole.ASSISTANT,
      result.content,
      result.metadata as Prisma.InputJsonValue,
    );
  }

  private async updateState(
    sessionId: string,
    data: {
      workflow?: ConversationWorkflow;
      step?: string;
      slots?: Prisma.InputJsonValue;
      missingSlots?: string[];
      confidence?: number;
      pendingTool?: string | null;
      pendingPayload?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
    },
  ) {
    await this.prisma.conversationState.update({
      where: { sessionId },
      data: {
        ...(data.workflow !== undefined ? { workflow: data.workflow } : {}),
        ...(data.step !== undefined ? { step: data.step } : {}),
        ...(data.slots !== undefined ? { slots: data.slots } : {}),
        ...(data.missingSlots !== undefined
          ? { missingSlots: data.missingSlots }
          : {}),
        ...(data.confidence !== undefined ? { confidence: data.confidence } : {}),
        ...(data.pendingTool !== undefined ? { pendingTool: data.pendingTool } : {}),
        ...(data.pendingPayload !== undefined
          ? { pendingPayload: data.pendingPayload }
          : {}),
      },
    });
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}
