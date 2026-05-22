import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type OpenRouterToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type OpenRouterToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
};

export type OpenRouterToolResponse = {
  content: string;
  toolCalls: OpenRouterToolCall[];
};

type OpenRouterCompletionResponse = {
  choices?: {
    message?: { content?: string | null; tool_calls?: OpenRouterToolCall[] };
    finish_reason?: string | null;
  }[];
};

const DEFAULT_OPENROUTER_MAX_RETRIES = 2;
const DEFAULT_OPENROUTER_RETRY_BASE_MS = 2_000;
const MAX_OPENROUTER_RETRY_DELAY_MS = 30_000;

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('OPENROUTER_API_KEY')?.trim());
  }

  getModel(): string {
    return (
      this.config.get<string>('OPENROUTER_MODEL') ??
      'deepseek/deepseek-v4-flash:free'
    );
  }

  private getApiKeyOrThrow(): string {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey?.trim()) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    return apiKey;
  }

  private async requestCompletion(
    body: Record<string, unknown>,
  ): Promise<OpenRouterCompletionResponse> {
    const apiKey = this.getApiKeyOrThrow();
    const maxRetries = this.getMaxRetries();
    const retryBaseMs = this.getRetryBaseMs();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer':
              this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
            'X-Title': 'NexaAssist',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          if (res.status === 429 && attempt < maxRetries) {
            const retryAfterMs = this.parseRetryAfterMs(res.headers.get('retry-after'));
            const backoffMs = Math.min(
              retryAfterMs ?? retryBaseMs * 2 ** attempt,
              MAX_OPENROUTER_RETRY_DELAY_MS,
            );
            this.logger.warn(
              `OpenRouter rate limited (429), retrying in ${backoffMs}ms (${attempt + 1}/${maxRetries})`,
            );
            await this.sleep(backoffMs);
            continue;
          }
          this.logger.warn(`OpenRouter error ${res.status}: ${text.slice(0, 200)}`);
          throw new Error(`OpenRouter request failed (${res.status})`);
        }

        return (await res.json()) as OpenRouterCompletionResponse;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('OpenRouter request failed (429)');
  }

  private getMaxRetries(): number {
    const parsed = Number(
      this.config.get<string>('OPENROUTER_MAX_RETRIES') ??
        DEFAULT_OPENROUTER_MAX_RETRIES,
    );
    if (!Number.isFinite(parsed)) {
      return DEFAULT_OPENROUTER_MAX_RETRIES;
    }
    return Math.max(0, Math.floor(parsed));
  }

  private getRetryBaseMs(): number {
    const parsed = Number(
      this.config.get<string>('OPENROUTER_RETRY_BASE_MS') ??
        DEFAULT_OPENROUTER_RETRY_BASE_MS,
    );
    if (!Number.isFinite(parsed)) {
      return DEFAULT_OPENROUTER_RETRY_BASE_MS;
    }
    return Math.max(100, Math.floor(parsed));
  }

  private parseRetryAfterMs(retryAfter: string | null): number | null {
    if (!retryAfter) {
      return null;
    }
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.floor(seconds * 1000);
    }
    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) {
      return Math.max(0, retryAt - Date.now());
    }
    return null;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async chatCompletion(
    messages: OpenRouterMessage[],
    options?: { jsonMode?: boolean; maxTokens?: number },
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.getModel(),
      messages,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: 0.2,
    };
    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    const data = await this.requestCompletion(body);
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenRouter');
    }
    return content;
  }

  async chatCompletionWithTools(
    messages: OpenRouterMessage[],
    tools: OpenRouterToolDefinition[],
    options?: { maxTokens?: number },
  ): Promise<OpenRouterToolResponse> {
    const data = await this.requestCompletion({
      model: this.getModel(),
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: options?.maxTokens ?? 1024,
      temperature: 0.2,
    });
    const choice = data.choices?.[0];
    if (!choice?.message) {
      throw new Error('Empty response from OpenRouter');
    }
    return {
      content: choice.message.content ?? '',
      toolCalls: choice.message.tool_calls ?? [],
    };
  }

  async *streamCompletion(
    messages: OpenRouterMessage[],
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = this.getApiKeyOrThrow();

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer':
          this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
        'X-Title': 'NexaAssist',
      },
      body: JSON.stringify({
        model: this.getModel(),
        messages,
        max_tokens: 1024,
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenRouter stream failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) yield chunk;
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  }
}
