import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../types/auth-user';
import { resolveInventoryTenantId } from './inventory-tenant.util';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: AuthUser, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const rows = await this.prisma.inventoryCategory.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map((c) => this.mapCategory(c));
  }

  async create(actor: AuthUser, dto: CreateCategoryDto, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const row = await this.prisma.inventoryCategory.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
      },
    });
    return this.mapCategory(row);
  }

  async update(
    actor: AuthUser,
    id: string,
    dto: UpdateCategoryDto,
    tenantIdQuery?: string,
  ) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    const row = await this.prisma.inventoryCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ?? null }
          : {}),
      },
    });
    return this.mapCategory(row);
  }

  async remove(actor: AuthUser, id: string, tenantIdQuery?: string) {
    const tenantId = resolveInventoryTenantId(actor, tenantIdQuery);
    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }
    const itemsUsing = await this.prisma.inventoryItem.count({
      where: { categoryId: id, tenantId, deletedAt: null },
    });
    if (itemsUsing > 0) {
      throw new ConflictException('Cannot delete category that has inventory items');
    }
    await this.prisma.inventoryCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  }

  private mapCategory(row: {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
