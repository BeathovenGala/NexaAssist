import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatMessageRole,
  ChatSessionStatus,
  ConversationWorkflow,
  Prisma,
  RoleName,
} from '@prisma/client';
import { resolveSchedulingTenantId } from '../common/utils/scheduling.util';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import type { CreateChatSessionDto, ListChatSessionsQueryDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  private assertChatAccess(actor: AuthUser): string {
    if (
      actor.roles.length === 1 &&
      actor.roles[0] === RoleName.CUSTOMER &&
      !actor.tenantId
    ) {
      throw new BadRequestException(
        'Join an organization before using the assistant.',
      );
    }
    return resolveSchedulingTenantId(actor);
  }

  async listSessions(actor: AuthUser, query: ListChatSessionsQueryDto) {
    const tenantId = this.assertChatAccess(actor);
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    const where: Prisma.ChatSessionWhereInput = {
      tenantId,
      userId: actor.id,
      status: ChatSessionStatus.ACTIVE,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.chatSession.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.chatSession.count({ where }),
    ]);
    return { items, total, skip, take };
  }

  async createSession(actor: AuthUser, dto: CreateChatSessionDto) {
    const tenantId = this.assertChatAccess(actor);
    const session = await this.prisma.chatSession.create({
      data: {
        tenantId,
        userId: actor.id,
        title: dto.title?.trim() || 'New conversation',
        conversationState: {
          create: {
            workflow: ConversationWorkflow.NONE,
            step: 'idle',
            slots: {},
            missingSlots: [],
          },
        },
      },
      include: {
        conversationState: true,
      },
    });
    return session;
  }

  async getSession(actor: AuthUser, sessionId: string, messageLimit = 50) {
    const tenantId = this.assertChatAccess(actor);
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId: actor.id },
      include: {
        conversationState: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: messageLimit,
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  async archiveSession(actor: AuthUser, sessionId: string) {
    const tenantId = this.assertChatAccess(actor);
    const existing = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId: actor.id },
    });
    if (!existing) {
      throw new NotFoundException('Chat session not found');
    }
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: ChatSessionStatus.ARCHIVED },
    });
  }

  async addMessage(
    sessionId: string,
    tenantId: string,
    userId: string,
    role: ChatMessageRole,
    content: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId },
    });
    if (!session) {
      throw new ForbiddenException('Chat session not found');
    }
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { sessionId, role, content, metadata: metadata ?? undefined },
      }),
      this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return message;
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }
}
