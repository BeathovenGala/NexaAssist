import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { ChatService } from './chat.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import {
  CreateChatSessionDto,
  ListChatSessionsQueryDto,
  SelectSlotDto,
  SendChatMessageDto,
} from './dto/chat.dto';

@Controller('chat')
@UseGuards(RolesGuard, PermissionsGuard)
@RequirePermissions('chat:use')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly orchestrator: ConversationOrchestratorService,
  ) {}

  @Get('sessions')
  listSessions(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListChatSessionsQueryDto,
  ) {
    return this.chat.listSessions(actor, query);
  }

  @Post('sessions')
  createSession(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateChatSessionDto,
  ) {
    return this.chat.createSession(actor, dto);
  }

  @Get('sessions/:id')
  getSession(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.chat.getSession(actor, id);
  }

  @Delete('sessions/:id')
  archiveSession(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.chat.archiveSession(actor, id);
  }

  @Post('sessions/:id/messages')
  async sendMessage(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
  ) {
    const turn = await this.orchestrator.handleUserMessage(actor, id, dto.content);
    return {
      userMessageId: turn.userMessageId,
      assistantMessageId: turn.assistantMessageId,
      content: turn.result.content,
      metadata: turn.result.metadata,
    };
  }

  @Post('sessions/:id/confirm')
  confirm(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.orchestrator.confirmPending(actor, id);
  }

  @Post('sessions/:id/cancel-pending')
  cancelPending(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.orchestrator.cancelPending(actor, id);
  }

  @Post('sessions/:id/select-slot')
  selectSlot(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: SelectSlotDto,
  ) {
    return this.orchestrator.applySlotSelection(
      actor,
      id,
      dto.startTime,
      dto.endTime,
    );
  }
}
