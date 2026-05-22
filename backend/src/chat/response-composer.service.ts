import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';
import type { OrchestratorResult } from './types/chat-intent.types';

@Injectable()
export class ResponseComposerService {
  constructor(
    private readonly openRouter: OpenRouterService,
    private readonly config: ConfigService,
  ) {}

  async polish(result: OrchestratorResult): Promise<OrchestratorResult> {
    if (!this.openRouter.isConfigured()) {
      return result;
    }
    if (!this.isPolishEnabled()) {
      return result;
    }
    if (result.metadata?.pendingConfirmation) {
      return result;
    }
    try {
      const polished = await this.openRouter.chatCompletion(
        [
          {
            role: 'system',
            content:
              'Rewrite the assistant message to be friendly and concise. Keep all factual details and slot times unchanged. Do not add new facts.',
          },
          { role: 'user', content: result.content },
        ],
        { maxTokens: 400 },
      );
      return { ...result, content: polished.trim() };
    } catch {
      return result;
    }
  }

  private isPolishEnabled(): boolean {
    const raw = this.config.get<string>('CHAT_POLISH_RESPONSES')?.trim().toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
  }
}
