import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationWorkflow } from '@prisma/client';
import { OpenRouterService } from './openrouter.service';
import {
  classifierOutputSchema,
  type ChatIntent,
  type ClassifierOutput,
} from './types/chat-intent.types';

const INTENT_EXAMPLES = `
Intent examples (pick the best match):
- book_appointment: "book for tomorrow", "schedule a visit", "see Dr Smith"
- reschedule_appointment: "move my appointment", "change the time", "reschedule APT-123"
- cancel_appointment: "cancel my visit", "call off appointment", "cancel APT-123"
- doctor_schedule_query: "how many appointments today", "pending approvals", "my schedule"
- inventory_lookup: "do we have gloves", "search inventory", "stock level for SKU-1"
- inventory_create: "add new item", "create inventory item"
- inventory_request: "restock gloves", "request reorder"
- user_invite: "invite team member", "send invitation"
- general: greetings or unclear; unknown: cannot map`;

@Injectable()
export class IntentClassifierService {
  constructor(
    private readonly openRouter: OpenRouterService,
    private readonly config: ConfigService,
  ) {}

  intentToWorkflow(intent: ChatIntent): ConversationWorkflow {
    const map: Partial<Record<ChatIntent, ConversationWorkflow>> = {
      book_appointment: ConversationWorkflow.BOOK_APPOINTMENT,
      reschedule_appointment: ConversationWorkflow.RESCHEDULE_APPOINTMENT,
      cancel_appointment: ConversationWorkflow.CANCEL_APPOINTMENT,
      doctor_schedule_query: ConversationWorkflow.DOCTOR_SCHEDULE_QUERY,
      inventory_lookup: ConversationWorkflow.INVENTORY_LOOKUP,
      inventory_create: ConversationWorkflow.INVENTORY_CREATE,
      inventory_request: ConversationWorkflow.INVENTORY_REQUEST,
      user_create: ConversationWorkflow.USER_CREATE,
      user_invite: ConversationWorkflow.USER_CREATE,
    };
    return map[intent] ?? ConversationWorkflow.NONE;
  }

  async classify(
    userMessage: string,
    recentContext: string,
    allowedCapabilities: string,
    actorSummary = 'staff',
  ): Promise<ClassifierOutput> {
    if (this.openRouter.isConfigured()) {
      try {
        return await this.classifyWithLlm(
          userMessage,
          recentContext,
          allowedCapabilities,
          actorSummary,
        );
      } catch {
        return this.classifyWithRules(userMessage);
      }
    }
    return this.classifyWithRules(userMessage);
  }

  private async classifyWithLlm(
    userMessage: string,
    recentContext: string,
    allowedCapabilities: string,
    actorSummary: string,
  ): Promise<ClassifierOutput> {
    const system = `You are an intent classifier for NexaAssist. Return ONLY valid JSON matching this schema:
{"intent":"book_appointment|reschedule_appointment|cancel_appointment|doctor_schedule_query|inventory_lookup|inventory_create|inventory_request|user_create|user_invite|general|unknown","confidence":0.0-1.0,"entities":{"staffName":null,"date":null,"time":null,"itemName":null,"email":null,"firstName":null,"role":null,"appointmentId":null,"quantity":null,"sku":null},"offTopic":false,"userFacingHint":null}
User type: ${actorSummary}. Only classify intents the user is allowed to perform (see capabilities).
${INTENT_EXAMPLES}
Allowed tools/capabilities: ${allowedCapabilities}.
Never invent data. If off-topic (unrelated to appointments, inventory, team), set offTopic true and userFacingHint with a short redirect.
If unclear, use intent "unknown" with confidence below 0.5.`;

    const raw = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Recent context:\n${recentContext}\n\nUser message:\n${userMessage}`,
        },
      ],
      { jsonMode: true },
    );

    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const jsonStr =
      jsonStart >= 0 && jsonEnd > jsonStart
        ? raw.slice(jsonStart, jsonEnd + 1)
        : raw;
    const parsed = classifierOutputSchema.safeParse(JSON.parse(jsonStr));
    if (parsed.success) {
      return parsed.data;
    }
    return this.classifyWithRules(userMessage);
  }

  classifyWithRules(userMessage: string): ClassifierOutput {
    const lower = userMessage.toLowerCase().trim();
    let intent: ChatIntent = 'general';
    let confidence = 0.65;

    if (
      /reschedule|re-?schedule|move (my )?appointment|change (the )?time|postpone/.test(
        lower,
      )
    ) {
      intent = 'reschedule_appointment';
      confidence = 0.82;
    } else if (
      /cancel|call off|drop (my )?(appointment|visit)|remove (my )?booking/.test(
        lower,
      ) &&
      /appointment|visit|booking|apt[- ]?\w+/i.test(lower)
    ) {
      intent = 'cancel_appointment';
      confidence = 0.82;
    } else if (
      /book|schedule (an? )?appointment|make (an? )?appointment|see (the )?doctor|new visit/.test(
        lower,
      ) &&
      !/cancel|reschedule/.test(lower)
    ) {
      intent = 'book_appointment';
      confidence = 0.84;
    } else if (
      /how many appointment|pending approval|today.?s schedule|my appointments|upcoming appointment|appointments today/.test(
        lower,
      )
    ) {
      intent = 'doctor_schedule_query';
      confidence = 0.84;
    } else if (/stock|inventory|do we have|in stock|low on|quantity of|sku/.test(lower)) {
      if (/add item|create item|new item/.test(lower)) {
        intent = 'inventory_create';
      } else if (/request|restock|reorder/.test(lower)) {
        intent = 'inventory_request';
      } else {
        intent = 'inventory_lookup';
      }
      confidence = 0.78;
    } else if (/add user|invite|create user|new staff|new employee|team member/.test(lower)) {
      intent = /invite/.test(lower) ? 'user_invite' : 'user_create';
      confidence = 0.78;
    } else if (lower.length < 3) {
      intent = 'unknown';
      confidence = 0.3;
    }

    const entities = this.extractEntitiesFromText(userMessage, lower);
    return { intent, confidence, entities, offTopic: false };
  }

  extractEntitiesFromText(
    original: string,
    lower = original.toLowerCase(),
  ): ClassifierOutput['entities'] {
    const entities: ClassifierOutput['entities'] = {};
    const dateMatch = lower.match(
      /\b(today|tomorrow|next week|\d{4}-\d{2}-\d{2})\b/,
    );
    if (dateMatch) entities.date = dateMatch[1];
    const timeMatch = lower.match(/\b(\d{1,2}:\d{2}(?:\s?[ap]m)?)\b/i);
    if (timeMatch) entities.time = timeMatch[1];
    const aptCode = original.match(/\b(APT-[A-Z0-9]+)\b/i);
    if (aptCode) entities.appointmentId = aptCode[1];
    const uuid = original.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    );
    if (uuid) entities.appointmentId = uuid[0];
    const skuMatch = original.match(/\b(SKU[-\w]+)\b/i);
    if (skuMatch) entities.sku = skuMatch[1];
    const emailMatch = original.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    );
    if (emailMatch) entities.email = emailMatch[0];
    const quotedItem = original.match(/(?:for|search|find|item)\s+["']?([^"']{2,40})["']?$/i);
    if (quotedItem && !entities.itemName) {
      entities.itemName = quotedItem[1].trim();
    }
    return entities;
  }

  shouldSwitchWorkflow(
    current: ConversationWorkflow,
    classified: ClassifierOutput,
  ): boolean {
    if (current === ConversationWorkflow.NONE) {
      return true;
    }
    if (
      classified.intent === 'general' ||
      classified.intent === 'unknown' ||
      classified.confidence < this.lowConfidenceThreshold()
    ) {
      return false;
    }
    const mapped = this.intentToWorkflow(classified.intent);
    if (mapped === ConversationWorkflow.NONE) {
      return false;
    }
    return mapped !== current;
  }

  lowConfidenceThreshold(): number {
    const raw = this.config.get('CHAT_LOW_CONFIDENCE_THRESHOLD');
    const n = Number(raw ?? 0.45);
    return Number.isFinite(n) ? n : 0.45;
  }
}
