import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryItemStatus, MovementType, Prisma, ReferenceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';
import type { CreateItemDto, ListItemsQueryDto, UpdateItemDto } from './dto/inventory.dto';
import { InventoryMovementsService } from './inventory-movements.service';

@Injectable()
export class InventoryItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: InventoryMovementsService,
  ) {}

  async list(actor: AuthUser, query: ListItemsQueryDto) {
    const tenantId = resolveInventoryTenantId(actor, query.tenantId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);

    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.outOfStockOnly
        ? { status: InventoryItemStatus.OUT_OF_STOCK }
        : {}),
      ...(query.lowStockOnly
        ? {
            status: {
              in: [InventoryItemStatus.LOW, InventoryItemStatus.OUT_OF_STOCK],
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take,
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      items: items.map((i) => this.mapItem(i)),
      total,
      skip,
      take,
    };
  }

  async findOne(actor: AuthUser, id: string, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return this.mapItem(item);
  }

  async create(actor: AuthUser, dto: CreateItemDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const sku = dto.sku.trim();
    const dup = await this.prisma.inventoryItem.findFirst({
      where: { tenantId, sku, deletedAt: null },
    });
    if (dup) {
      throw new ConflictException('SKU already exists for this organization');
    }
    if (dto.categoryId) {
      const cat = await this.prisma.inventoryCategory.findFirst({
        where: { id: dto.categoryId, tenantId, deletedAt: null },
      });
      if (!cat) {
        throw new NotFoundException('Category not found');
      }
    }

    const initial = dto.initialQuantity ?? 0;

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          tenantId,
          categoryId: dto.categoryId ?? null,
          name: dto.name.trim(),
          sku,
          description: dto.description?.trim() ?? null,
          unit: dto.unit.trim(),
          barcode: dto.barcode?.trim() ?? null,
          locationId: dto.locationId?.trim() ?? null,
          minimumThreshold: dto.minimumThreshold ?? 0,
          maximumThreshold: dto.maximumThreshold ?? null,
          quantity: 0,
          reservedQuantity: 0,
          status: InventoryItemStatus.ACTIVE,
          isActive: true,
          createdById: actor.id,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      if (initial > 0) {
        await this.movements.applyMovement(tx, {
          tenantId,
          itemId: item.id,
          movementType: MovementType.IN,
          quantityPositive: initial,
          performedById: actor.id,
          reason: 'Initial stock',
          referenceType: ReferenceType.MANUAL,
          referenceId: null,
          locationId: dto.locationId?.trim() ?? null,
        });
      } else {
        const status = this.movements.computeItemStatus(0, item.minimumThreshold);
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { status },
        });
        await this.movements.syncAlertsAfterQuantityChange(tx, {
          tenantId,
          itemId: item.id,
          quantity: 0,
          minimumThreshold: item.minimumThreshold,
          maximumThreshold: item.maximumThreshold,
        });
      }

      const fresh = await tx.inventoryItem.findFirstOrThrow({
        where: { id: item.id },
        include: { category: { select: { id: true, name: true } } },
      });
      return fresh;
    });

    return this.mapItem(result);
  }

  async update(actor: AuthUser, id: string, dto: UpdateItemDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }
    if (dto.sku && dto.sku.trim() !== existing.sku) {
      const dup = await this.prisma.inventoryItem.findFirst({
        where: {
          tenantId,
          sku: dto.sku.trim(),
          deletedAt: null,
          NOT: { id },
        },
      });
      if (dup) {
        throw new ConflictException('SKU already exists for this organization');
      }
    }
    if (dto.categoryId) {
      const cat = await this.prisma.inventoryCategory.findFirst({
        where: { id: dto.categoryId, tenantId, deletedAt: null },
      });
      if (!cat) {
        throw new NotFoundException('Category not found');
      }
    }

    const row = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined
          ? { categoryId: dto.categoryId === null ? null : dto.categoryId }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description === null ? null : dto.description?.trim() ?? null }
          : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.barcode !== undefined
          ? { barcode: dto.barcode === null ? null : dto.barcode?.trim() ?? null }
          : {}),
        ...(dto.locationId !== undefined
          ? {
              locationId:
                dto.locationId === null ? null : dto.locationId?.trim() ?? null,
            }
          : {}),
        ...(dto.minimumThreshold !== undefined ? { minimumThreshold: dto.minimumThreshold } : {}),
        ...(dto.maximumThreshold !== undefined
          ? { maximumThreshold: dto.maximumThreshold }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
    });

    return this.mapItem(row);
  }

  async remove(actor: AuthUser, id: string, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }
    await this.prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { ok: true };
  }

  async listMovementsForItem(
    actor: AuthUser,
    itemId: string,
    query: { skip?: number; take?: number; tenantId?: string },
  ) {
    const tenantId = resolveInventoryTenantId(actor, query.tenantId);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, tenantId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 50, 200);
    return this.movements.list(tenantId, {
      skip,
      take,
      itemId,
    });
  }

  private mapItem(row: {
    id: string;
    tenantId: string;
    categoryId: string | null;
    category?: { id: string; name: string } | null;
    name: string;
    sku: string;
    description: string | null;
    unit: string;
    barcode: string | null;
    locationId: string | null;
    quantity: number;
    reservedQuantity: number;
    minimumThreshold: number;
    maximumThreshold: number | null;
    status: InventoryItemStatus;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const availableQuantity = row.quantity - row.reservedQuantity;
    return {
      id: row.id,
      tenantId: row.tenantId,
      categoryId: row.categoryId,
      category: row.category ?? null,
      name: row.name,
      sku: row.sku,
      description: row.description,
      unit: row.unit,
      barcode: row.barcode,
      locationId: row.locationId,
      quantity: row.quantity,
      reservedQuantity: row.reservedQuantity,
      availableQuantity,
      minimumThreshold: row.minimumThreshold,
      maximumThreshold: row.maximumThreshold,
      status: row.status,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
