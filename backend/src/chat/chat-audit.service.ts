import { Injectable } from '@nestjs/common';
import { ChatAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    sessionId: string,
    tenantId: string,
    userId: string,
    action: ChatAuditAction,
    detail?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.chatAuditLog.create({
      data: {
        sessionId,
        tenantId,
        userId,
        action,
        detail: detail ?? undefined,
      },
    });
  }

  async logToolCall(params: {
    sessionId: string;
    tenantId: string;
    actorUserId: string;
    toolName: string;
    input?: Prisma.InputJsonValue;
    output?: Prisma.InputJsonValue;
    success: boolean;
  }): Promise<void> {
    await this.prisma.chatToolCall.create({
      data: {
        sessionId: params.sessionId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        toolName: params.toolName,
        input: params.input ?? undefined,
        output: params.output ?? undefined,
        success: params.success,
      },
    });
    await this.log(
      params.sessionId,
      params.tenantId,
      params.actorUserId,
      params.success ? ChatAuditAction.TOOL_CALLED : ChatAuditAction.TOOL_DENIED,
      { toolName: params.toolName },
    );
  }
}
