import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertSeverity,
  AlertStatus,
  InventoryAlertType,
  InventoryItemStatus,
  MovementType,
  Prisma,
  ReferenceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';
import { InventoryEventsService } from './inventory-events.service';

export type ApplyMovementParams = {
  tenantId: string;
  itemId: string;
  movementType: MovementType;
  /** Positive magnitude for IN/OUT/RETURN/APPROVED_REQUEST/DAMAGED/EXPIRED */
  quantityPositive: number;
  performedById: string;
  reason?: string | null;
  referenceType?: ReferenceType | null;
  referenceId?: string | null;
  locationId?: string | null;
  /** For ADJUSTMENT only */
  newQuantityExplicit?: number;
};

@Injectable()
export class InventoryMovementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryEvents: InventoryEventsService,
  ) {}

  computeItemStatus(quantity: number, minimumThreshold: number): InventoryItemStatus {
    if (quantity <= 0) {
      return InventoryItemStatus.OUT_OF_STOCK;
    }
    if (quantity <= minimumThreshold) {
      return InventoryItemStatus.LOW;
    }
    return InventoryItemStatus.ACTIVE;
  }

  assertCanConsumeOut(item: {
    status: InventoryItemStatus;
    quantity: number;
    reservedQuantity: number;
    minimumThreshold: number;
  }): void {
    if (item.quantity <= 0) {
      throw new BadRequestException('Item is out of stock');
    }
    const blocked: InventoryItemStatus[] = [
      InventoryItemStatus.ARCHIVED,
      InventoryItemStatus.RESTRICTED,
      InventoryItemStatus.EXPIRED,
      InventoryItemStatus.DAMAGED,
    ];
    if (blocked.includes(item.status)) {
      throw new BadRequestException('This item cannot be consumed');
    }
  }

  async applyMovement(
    tx: Prisma.TransactionClient,
    params: ApplyMovementParams,
  ): Promise<{ movementId: string; newQuantity: number; newStatus: InventoryItemStatus }> {
    const item = await tx.inventoryItem.findFirst({
      where: {
        id: params.itemId,
        tenantId: params.tenantId,
        deletedAt: null,
      },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (params.movementType === MovementType.TRANSFER) {
      throw new BadRequestException('Transfer movements are not supported yet');
    }

    const prev = item.quantity;
    let newQty = prev;

    if (params.movementType === MovementType.ADJUSTMENT) {
      if (params.newQuantityExplicit === undefined) {
        throw new BadRequestException('Adjustment requires newQuantity');
      }
      newQty = params.newQuantityExplicit;
      if (newQty < 0) {
        throw new BadRequestException('Quantity cannot be negative');
      }
    } else if (
      params.movementType === MovementType.IN ||
      params.movementType === MovementType.RETURN ||
      params.movementType === MovementType.APPROVED_REQUEST
    ) {
      newQty = prev + params.quantityPositive;
    } else if (
      params.movementType === MovementType.OUT ||
      params.movementType === MovementType.DAMAGED ||
      params.movementType === MovementType.EXPIRED
    ) {
      this.assertCanConsumeOut(item);
      const available = prev - item.reservedQuantity;
      if (available < params.quantityPositive) {
        throw new BadRequestException('Insufficient available quantity');
      }
      newQty = prev - params.quantityPositive;
    } else {
      throw new BadRequestException('Unsupported movement type');
    }

    const movementQty =
      params.movementType === MovementType.ADJUSTMENT
        ? Math.abs(newQty - prev)
        : params.quantityPositive;

    const movement = await tx.stockMovement.create({
      data: {
        tenantId: params.tenantId,
        itemId: item.id,
        movementType: params.movementType,
        quantity: movementQty,
        previousQuantity: prev,
        newQuantity: newQty,
        reason: params.reason ?? null,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
        locationId: params.locationId ?? null,
        performedById: params.performedById,
      },
    });

    const nextStatus = this.computeItemStatus(newQty, item.minimumThreshold);

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQty, status: nextStatus },
    });

    await this.syncAlertsAfterQuantityChange(tx, {
      tenantId: params.tenantId,
      itemId: item.id,
      quantity: newQty,
      minimumThreshold: item.minimumThreshold,
      maximumThreshold: item.maximumThreshold,
    });

    return {
      movementId: movement.id,
      newQuantity: newQty,
      newStatus: nextStatus,
    };
  }

  async syncAlertsAfterQuantityChange(
    tx: Prisma.TransactionClient,
    args: {
      tenantId: string;
      itemId: string;
      quantity: number;
      minimumThreshold: number;
      maximumThreshold: number | null;
    },
  ): Promise<void> {
    const { tenantId, itemId, quantity, minimumThreshold, maximumThreshold } = args;

    if (quantity <= 0) {
      await this.ensureAlert(tx, {
        tenantId,
        itemId,
        type: InventoryAlertType.OUT_OF_STOCK,
        severity: AlertSeverity.CRITICAL,
        message: 'Item is out of stock',
      });
      await this.resolveAlertsOfType(
        tx,
        tenantId,
        itemId,
        InventoryAlertType.LOW_STOCK,
      );
    } else {
      await this.resolveAlertsOfType(
        tx,
        tenantId,
        itemId,
        InventoryAlertType.OUT_OF_STOCK,
      );

      if (quantity <= minimumThreshold) {
        const severity =
          minimumThreshold > 0 && quantity <= Math.max(1, Math.floor(minimumThreshold / 2))
            ? AlertSeverity.HIGH
            : AlertSeverity.MEDIUM;
        await this.ensureAlert(tx, {
          tenantId,
          itemId,
          type: InventoryAlertType.LOW_STOCK,
          severity,
          message: `Stock is at or below minimum threshold (${minimumThreshold})`,
        });
      } else {
        await this.resolveAlertsOfType(
          tx,
          tenantId,
          itemId,
          InventoryAlertType.LOW_STOCK,
        );
      }
    }

    if (maximumThreshold != null && quantity > maximumThreshold) {
      await this.ensureAlert(tx, {
        tenantId,
        itemId,
        type: InventoryAlertType.OVERSTOCK,
        severity: AlertSeverity.LOW,
        message: `Quantity exceeds maximum threshold (${maximumThreshold})`,
      });
    } else {
      await this.resolveAlertsOfType(
        tx,
        tenantId,
        itemId,
        InventoryAlertType.OVERSTOCK,
      );
    }
  }

  private async ensureAlert(
    tx: Prisma.TransactionClient,
    args: {
      tenantId: string;
      itemId: string;
      type: InventoryAlertType;
      severity: AlertSeverity;
      message: string;
    },
  ): Promise<void> {
    const existing = await tx.inventoryAlert.findFirst({
      where: {
        tenantId: args.tenantId,
        itemId: args.itemId,
        type: args.type,
        status: AlertStatus.ACTIVE,
      },
    });
    if (existing) {
      return;
    }
    const alert = await tx.inventoryAlert.create({
      data: {
        tenantId: args.tenantId,
        itemId: args.itemId,
        type: args.type,
        severity: args.severity,
        status: AlertStatus.ACTIVE,
        message: args.message,
      },
    });
    this.inventoryEvents.emitInventory({
      type: 'inventory.alert.created',
      payload: {
        tenantId: args.tenantId,
        alertId: alert.id,
        itemId: args.itemId,
      },
    });
  }

  private async resolveAlertsOfType(
    tx: Prisma.TransactionClient,
    tenantId: string,
    itemId: string,
    type: InventoryAlertType,
  ): Promise<void> {
    await tx.inventoryAlert.updateMany({
      where: {
        tenantId,
        itemId,
        type,
        status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
      },
      data: { status: AlertStatus.RESOLVED, updatedAt: new Date() },
    });
  }

  async list(
    tenantId: string,
    query: {
      skip: number;
      take: number;
      itemId?: string;
      movementType?: MovementType;
      from?: Date;
      to?: Date;
    },
  ) {
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.movementType ? { movementType: query.movementType } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
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
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        itemId: m.itemId,
        item: m.item,
        movementType: m.movementType,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        reason: m.reason,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        locationId: m.locationId,
        performedBy: m.performedBy,
        createdAt: m.createdAt.toISOString(),
      })),
      total,
      skip: query.skip,
      take: query.take,
    };
  }

  async recordIn(
    actor: AuthUser,
    tenantIdQuery: string | undefined,
    dto: {
      itemId: string;
      quantity: number;
      reason?: string;
      referenceType?: ReferenceType;
      referenceId?: string;
      locationId?: string;
    },
  ): Promise<{ movementId: string; newQuantity: number; newStatus: InventoryItemStatus }> {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        movementType: MovementType.IN,
        quantityPositive: dto.quantity,
        performedById: actor.id,
        reason: dto.reason ?? null,
        referenceType: dto.referenceType ?? ReferenceType.MANUAL,
        referenceId: dto.referenceId ?? null,
        locationId: dto.locationId ?? null,
      }),
    );
  }

  async recordOut(
    actor: AuthUser,
    tenantIdQuery: string | undefined,
    dto: {
      itemId: string;
      quantity: number;
      reason?: string;
      referenceType?: ReferenceType;
      referenceId?: string;
      locationId?: string;
    },
  ): Promise<{ movementId: string; newQuantity: number; newStatus: InventoryItemStatus }> {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        movementType: MovementType.OUT,
        quantityPositive: dto.quantity,
        performedById: actor.id,
        reason: dto.reason ?? null,
        referenceType: dto.referenceType ?? ReferenceType.MANUAL,
        referenceId: dto.referenceId ?? null,
        locationId: dto.locationId ?? null,
      }),
    );
  }

  async recordAdjust(
    actor: AuthUser,
    tenantIdQuery: string | undefined,
    dto: {
      itemId: string;
      newQuantity: number;
      reason?: string;
      locationId?: string;
    },
  ): Promise<{ movementId: string; newQuantity: number; newStatus: InventoryItemStatus }> {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        tenantId,
        itemId: dto.itemId,
        movementType: MovementType.ADJUSTMENT,
        quantityPositive: 0,
        performedById: actor.id,
        reason: dto.reason ?? null,
        referenceType: ReferenceType.MANUAL,
        referenceId: null,
        locationId: dto.locationId ?? null,
        newQuantityExplicit: dto.newQuantity,
      }),
    );
  }
}
