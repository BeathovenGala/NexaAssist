import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  AlertStatus,
  InventoryItemStatus,
  InventoryRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';

@Injectable()
export class InventoryDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(actor: AuthUser, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [
      totalItems,
      lowStockCount,
      criticalAlerts,
      pendingRequests,
      movementsToday,
      statusGroups,
      recentMovements,
      recentAlerts,
      recentRequests,
    ] = await Promise.all([
      this.prisma.inventoryItem.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.inventoryItem.count({
        where: {
          tenantId,
          deletedAt: null,
          status: {
            in: [InventoryItemStatus.LOW, InventoryItemStatus.OUT_OF_STOCK],
          },
        },
      }),
      this.prisma.inventoryAlert.count({
        where: {
          tenantId,
          status: AlertStatus.ACTIVE,
          severity: { in: [AlertSeverity.HIGH, AlertSeverity.CRITICAL] },
        },
      }),
      this.prisma.inventoryRequest.count({
        where: { tenantId, status: InventoryRequestStatus.PENDING },
      }),
      this.prisma.stockMovement.count({
        where: { tenantId, createdAt: { gte: startOfDay } },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          item: { select: { id: true, name: true, sku: true } },
          performedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              userCode: true,
            },
          },
        },
      }),
      this.prisma.inventoryAlert.findMany({
        where: { tenantId, status: AlertStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          item: { select: { id: true, name: true, sku: true, quantity: true } },
        },
      }),
      this.prisma.inventoryRequest.findMany({
        where: { tenantId, status: InventoryRequestStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          item: { select: { id: true, name: true, sku: true } },
          requestedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              userCode: true,
            },
          },
        },
      }),
    ]);

    const health: Record<string, number> = {};
    for (const g of statusGroups) {
      health[g.status] = g._count._all;
    }

    return {
      metrics: {
        totalItems,
        lowStockCount,
        criticalAlerts,
        pendingRequests,
        movementsToday,
      },
      inventoryHealth: health,
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        movementType: m.movementType,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        item: m.item,
        performedBy: m.performedBy,
        createdAt: m.createdAt.toISOString(),
      })),
      activeAlerts: recentAlerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        message: a.message,
        item: a.item,
        createdAt: a.createdAt.toISOString(),
      })),
      pendingRequestItems: recentRequests.map((r) => ({
        id: r.id,
        quantityRequested: r.quantityRequested,
        priority: r.priority,
        reason: r.reason,
        item: r.item,
        requestedBy: r.requestedBy,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
