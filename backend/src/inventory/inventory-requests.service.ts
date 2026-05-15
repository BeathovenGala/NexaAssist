import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryRequestStatus,
  MovementType,
  Prisma,
  ReferenceType,
  RequestPriority,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';
import type {
  ApproveRequestDto,
  CreateRestockRequestDto,
  FulfillRequestDto,
  ListRequestsQueryDto,
  RejectRequestDto,
} from './dto/inventory.dto';
import { InventoryMovementsService } from './inventory-movements.service';

@Injectable()
export class InventoryRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: InventoryMovementsService,
  ) {}

  async list(actor: AuthUser, query: ListRequestsQueryDto) {
    const tenantId = resolveInventoryTenantId(actor, query.tenantId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);
    const canSeeAll = actor.permissions.includes('inventory:approve');

    const where: Prisma.InventoryRequestWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.mineOnly || !canSeeAll ? { requestedById: actor.id } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.inventoryRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          item: { select: { id: true, name: true, sku: true, quantity: true } },
          requestedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              userCode: true,
            },
          },
          approvedBy: {
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
      this.prisma.inventoryRequest.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapRequest(r)),
      total,
      skip,
      take,
    };
  }

  async create(actor: AuthUser, dto: CreateRestockRequestDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, tenantId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    const row = await this.prisma.inventoryRequest.create({
      data: {
        tenantId,
        itemId: item.id,
        requestedById: actor.id,
        quantityRequested: dto.quantityRequested,
        reason: dto.reason?.trim() ?? null,
        priority: dto.priority ?? RequestPriority.NORMAL,
        status: InventoryRequestStatus.PENDING,
      },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true } },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
        approvedBy: {
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
    return this.mapRequest(row);
  }

  async approve(actor: AuthUser, id: string, dto: ApproveRequestDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryRequest.findFirst({
      where: { id, tenantId },
      include: { item: true },
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }
    if (row.status !== InventoryRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }
    const approvedQty = Math.min(
      dto.approvedQuantity ?? row.quantityRequested,
      row.quantityRequested,
    );
    if (approvedQty < 1) {
      throw new BadRequestException('Approved quantity must be at least 1');
    }

    const updated = await this.prisma.inventoryRequest.update({
      where: { id },
      data: {
        status: InventoryRequestStatus.APPROVED,
        approvedQuantity: approvedQty,
        approvedById: actor.id,
        approvedAt: new Date(),
        managerNotes: dto.managerNotes?.trim() ?? null,
      },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true } },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
        approvedBy: {
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
    return this.mapRequest(updated);
  }

  async reject(actor: AuthUser, id: string, dto: RejectRequestDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryRequest.findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }
    if (row.status !== InventoryRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }
    const updated = await this.prisma.inventoryRequest.update({
      where: { id },
      data: {
        status: InventoryRequestStatus.REJECTED,
        managerNotes: dto.managerNotes?.trim() ?? null,
        approvedById: actor.id,
        approvedAt: new Date(),
      },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true } },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
        approvedBy: {
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
    return this.mapRequest(updated);
  }

  async fulfill(
    actor: AuthUser,
    id: string,
    dto: FulfillRequestDto,
    tenantIdQuery?: string,
  ) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryRequest.findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Request not found');
    }
    if (row.status !== InventoryRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be fulfilled');
    }
    const approved = row.approvedQuantity ?? row.quantityRequested;
    const remaining = approved - row.fulfilledQuantity;
    if (dto.quantity > remaining) {
      throw new BadRequestException('Quantity exceeds remaining approved amount');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.movements.applyMovement(tx, {
        tenantId,
        itemId: row.itemId,
        movementType: MovementType.APPROVED_REQUEST,
        quantityPositive: dto.quantity,
        performedById: actor.id,
        reason: dto.reason?.trim() ?? 'Restock request fulfilled',
        referenceType: ReferenceType.REQUEST,
        referenceId: row.id,
        locationId: null,
      });

      const newFulfilled = row.fulfilledQuantity + dto.quantity;
      const nextStatus =
        newFulfilled >= approved
          ? InventoryRequestStatus.FULFILLED
          : InventoryRequestStatus.APPROVED;

      await tx.inventoryRequest.update({
        where: { id },
        data: {
          fulfilledQuantity: newFulfilled,
          status: nextStatus,
        },
      });
    });

    const updated = await this.prisma.inventoryRequest.findFirstOrThrow({
      where: { id },
      include: {
        item: { select: { id: true, name: true, sku: true, quantity: true } },
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            userCode: true,
          },
        },
        approvedBy: {
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
    return this.mapRequest(updated);
  }

  private mapRequest(row: {
    id: string;
    tenantId: string;
    itemId: string;
    item: { id: string; name: string; sku: string; quantity: number };
    requestedById: string;
    quantityRequested: number;
    approvedQuantity: number | null;
    fulfilledQuantity: number;
    priority: string;
    reason: string | null;
    status: InventoryRequestStatus;
    managerNotes: string | null;
    approvedById: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    requestedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      userCode: string;
    };
    approvedBy: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      userCode: string;
    } | null;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      itemId: row.itemId,
      item: row.item,
      requestedById: row.requestedById,
      requestedBy: row.requestedBy,
      quantityRequested: row.quantityRequested,
      approvedQuantity: row.approvedQuantity,
      fulfilledQuantity: row.fulfilledQuantity,
      priority: row.priority,
      reason: row.reason,
      status: row.status,
      managerNotes: row.managerNotes,
      approvedById: row.approvedById,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      approvedBy: row.approvedBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
