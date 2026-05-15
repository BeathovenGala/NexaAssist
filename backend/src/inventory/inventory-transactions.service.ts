import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryTransactionStatus,
  InventoryTransactionType,
  MovementType,
  ReferenceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';
import type { CreateTransactionDto, ListTransactionsQueryDto } from './dto/inventory.dto';
import { InventoryMovementsService } from './inventory-movements.service';

@Injectable()
export class InventoryTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: InventoryMovementsService,
  ) {}

  async list(actor: AuthUser, query: ListTransactionsQueryDto) {
    const tenantId = resolveInventoryTenantId(actor, query.tenantId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          items: {
            include: {
              item: { select: { id: true, name: true, sku: true } },
            },
          },
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
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      items: rows.map((t) => this.mapTransaction(t)),
      total,
      skip,
      take,
    };
  }

  async findOne(actor: AuthUser, id: string, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryTransaction.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, sku: true } },
          },
        },
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
    });
    if (!row) {
      throw new NotFoundException('Transaction not found');
    }
    return this.mapTransaction(row);
  }

  async create(actor: AuthUser, dto: CreateTransactionDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    if (!dto.items?.length) {
      throw new BadRequestException('At least one line item is required');
    }
    if (dto.type === InventoryTransactionType.ADJUSTMENT && dto.items.length > 1) {
      throw new BadRequestException('Batch adjustment is not supported; use single-item adjust');
    }

    const id = await this.prisma.$transaction(async (tx) => {
      const header = await tx.inventoryTransaction.create({
        data: {
          tenantId,
          type: dto.type,
          status: InventoryTransactionStatus.PENDING,
          notes: dto.notes?.trim() ?? null,
          locationId: dto.locationId?.trim() ?? null,
          performedById: actor.id,
        },
      });

      for (const line of dto.items) {
        const item = await tx.inventoryItem.findFirst({
          where: { id: line.itemId, tenantId, deletedAt: null },
        });
        if (!item) {
          throw new NotFoundException(`Item ${line.itemId} not found`);
        }
        await tx.inventoryTransactionItem.create({
          data: {
            transactionId: header.id,
            itemId: line.itemId,
            quantity: line.quantity,
          },
        });
      }

      for (const line of dto.items) {
        if (
          (dto.type === InventoryTransactionType.IN ||
            dto.type === InventoryTransactionType.OUT) &&
          line.quantity < 1
        ) {
          throw new BadRequestException('Line quantity must be at least 1 for IN/OUT');
        }
        if (dto.type === InventoryTransactionType.IN) {
          await this.movements.applyMovement(tx, {
            tenantId,
            itemId: line.itemId,
            movementType: MovementType.IN,
            quantityPositive: line.quantity,
            performedById: actor.id,
            reason: dto.notes?.trim() ?? 'Bulk stock in',
            referenceType: ReferenceType.MANUAL,
            referenceId: header.id,
            locationId: dto.locationId?.trim() ?? null,
          });
        } else if (dto.type === InventoryTransactionType.OUT) {
          await this.movements.applyMovement(tx, {
            tenantId,
            itemId: line.itemId,
            movementType: MovementType.OUT,
            quantityPositive: line.quantity,
            performedById: actor.id,
            reason: dto.notes?.trim() ?? 'Bulk stock out',
            referenceType: ReferenceType.MANUAL,
            referenceId: header.id,
            locationId: dto.locationId?.trim() ?? null,
          });
        } else if (dto.type === InventoryTransactionType.ADJUSTMENT) {
          const item = await tx.inventoryItem.findFirstOrThrow({
            where: { id: line.itemId, tenantId, deletedAt: null },
          });
          await this.movements.applyMovement(tx, {
            tenantId,
            itemId: line.itemId,
            movementType: MovementType.ADJUSTMENT,
            quantityPositive: 0,
            performedById: actor.id,
            reason: dto.notes?.trim() ?? 'Bulk adjustment',
            referenceType: ReferenceType.MANUAL,
            referenceId: header.id,
            locationId: dto.locationId?.trim() ?? null,
            newQuantityExplicit: line.quantity,
          });
        } else {
          throw new BadRequestException('Transaction type not supported for batch processing');
        }
      }

      await tx.inventoryTransaction.update({
        where: { id: header.id },
        data: { status: InventoryTransactionStatus.COMPLETED },
      });

      return header.id;
    });

    return this.findOne(actor, id, tenantIdQuery);
  }

  private mapTransaction(row: {
    id: string;
    tenantId: string;
    type: InventoryTransactionType;
    status: InventoryTransactionStatus;
    notes: string | null;
    locationId: string | null;
    createdAt: Date;
    updatedAt: Date;
    performedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      userCode: string;
    };
    items: Array<{
      id: string;
      itemId: string;
      quantity: number;
      item: { id: string; name: string; sku: string };
    }>;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      type: row.type,
      status: row.status,
      notes: row.notes,
      locationId: row.locationId,
      performedBy: row.performedBy,
      items: row.items.map((i) => ({
        id: i.id,
        itemId: i.itemId,
        quantity: i.quantity,
        item: i.item,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
