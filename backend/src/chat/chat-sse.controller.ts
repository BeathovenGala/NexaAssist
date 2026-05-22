import {
  Body,
  Controller,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { ChatService } from './chat.service';
import { OpenRouterService } from './openrouter.service';
import { SendChatMessageDto } from './dto/chat.dto';

@Controller('chat')
@UseGuards(RolesGuard, PermissionsGuard)
@RequirePermissions('chat:use')
export class ChatSseController {
  constructor(
    private readonly chat: ChatService,
    private readonly openRouter: OpenRouterService,
  ) {}

  @Post('sessions/:id/stream')
  async stream(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const session = await this.chat.getSession(actor, id, 30);
      const messages = session.messages.map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

      if (this.openRouter.isConfigured()) {
        send('status', { phase: 'streaming' });
        let full = '';
        for await (const chunk of this.openRouter.streamCompletion([
          {
            role: 'system',
            content:
              'You are NexaAssist, a helpful tenant-scoped operations assistant. Be concise.',
          },
          ...messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
          { role: 'user', content: dto.content },
        ])) {
          full += chunk;
          send('token', { text: chunk });
        }
        send('done', { content: full });
      } else {
        send('status', { phase: 'fallback' });
        send('done', {
          content:
            'Streaming requires OPENROUTER_API_KEY. Use POST /chat/sessions/:id/messages instead.',
        });
      }
    } catch (err) {
      send('error', {
        message: err instanceof Error ? err.message : 'Stream failed',
      });
    } finally {
      res.end();
    }
  }
}
