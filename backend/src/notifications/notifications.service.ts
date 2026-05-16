import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveSchedulingTenantId } from '../common/utils/scheduling.util';
import type { ListNotificationsQueryDto } from './dto/notifications.dto';

export type CreateNotificationInput = {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveTenantId(actor: AuthUser): string {
    const tenantId = resolveSchedulingTenantId(actor, undefined);
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }
    return tenantId;
  }

  async list(actor: AuthUser, query: ListNotificationsQueryDto) {
    const tenantId = this.resolveTenantId(actor);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);

    const where: Prisma.NotificationWhereInput = {
      tenantId,
      userId: actor.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { tenantId, userId: actor.id, status: NotificationStatus.UNREAD },
      }),
    ]);

    return {
      items: items.map((n) => this.map(n)),
      total,
      unreadCount,
      skip,
      take,
    };
  }

  async unreadCount(actor: AuthUser) {
    const tenantId = this.resolveTenantId(actor);
    const count = await this.prisma.notification.count({
      where: {
        tenantId,
        userId: actor.id,
        status: NotificationStatus.UNREAD,
      },
    });
    return { count };
  }

  async markRead(actor: AuthUser, id: string) {
    const tenantId = this.resolveTenantId(actor);
    const row = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId: actor.id },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
    return this.map(updated);
  }

  async markAllRead(actor: AuthUser) {
    const tenantId = this.resolveTenantId(actor);
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        userId: actor.id,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
    return { updated: result.count };
  }

  async createForUser(input: CreateNotificationInput) {
    if (input.dedupeKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          dedupeKey: input.dedupeKey,
        },
      });
      if (existing) {
        return this.map(existing);
      }
    }

    const row = await this.prisma.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority ?? NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        actionUrl: input.actionUrl ?? null,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        dedupeKey: input.dedupeKey ?? null,
      },
    });
    return this.map(row);
  }

  async findUsersWithPermission(
    tenantId: string,
    permissionCode: string,
  ): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        userRoles: {
          some: {
            role: {
              rolePermissions: {
                some: { permission: { code: permissionCode } },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private map(row: {
    id: string;
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    status: NotificationStatus;
    actionUrl: string | null;
    metadata: Prisma.JsonValue;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      priority: row.priority,
      status: row.status,
      actionUrl: row.actionUrl,
      metadata: row.metadata,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
