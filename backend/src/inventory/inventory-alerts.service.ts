import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';
import type { ListAlertsQueryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthUser, query: ListAlertsQueryDto) {
    const tenantId = resolveInventoryTenantId(actor, query.tenantId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);

    const where: Prisma.InventoryAlertWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.inventoryAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          item: { select: { id: true, name: true, sku: true, quantity: true } },
        },
      }),
      this.prisma.inventoryAlert.count({ where }),
    ]);

    return {
      items: rows.map((a) => this.mapAlert(a)),
      total,
      skip,
      take,
    };
  }

  async acknowledge(actor: AuthUser, id: string, tenantIdQuery?: string) {
    return this.updateStatus(actor, id, AlertStatus.ACKNOWLEDGED, tenantIdQuery);
  }

  async resolve(actor: AuthUser, id: string, tenantIdQuery?: string) {
    return this.updateStatus(actor, id, AlertStatus.RESOLVED, tenantIdQuery);
  }

  async markRead(actor: AuthUser, id: string, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryAlert.findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Alert not found');
    }
    const updated = await this.prisma.inventoryAlert.update({
      where: { id },
      data: { isRead: true, updatedAt: new Date() },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true } },
      },
    });
    return this.mapAlert(updated);
  }

  private async updateStatus(
    actor: AuthUser,
    id: string,
    status: AlertStatus,
    tenantIdQuery?: string,
  ) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryAlert.findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Alert not found');
    }
    const updated = await this.prisma.inventoryAlert.update({
      where: { id },
      data: { status, updatedAt: new Date() },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true } },
      },
    });
    return this.mapAlert(updated);
  }

  private mapAlert(row: {
    id: string;
    tenantId: string;
    itemId: string;
    item: { id: string; name: string; sku: string; quantity: number };
    type: string;
    severity: string;
    status: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      itemId: row.itemId,
      item: row.item,
      type: row.type,
      severity: row.severity,
      status: row.status,
      message: row.message,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
