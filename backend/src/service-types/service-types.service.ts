import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertTenantMembership,
  resolveSchedulingTenantId,
} from '../common/utils/scheduling.util';
import type {
  CreateServiceTypeDto,
  ListServiceTypesQueryDto,
  UpdateServiceTypeDto,
} from './dto/service-types.dto';

@Injectable()
export class ServiceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthUser, dto: CreateServiceTypeDto) {
    const tenantId = resolveSchedulingTenantId(actor, dto.tenantId);
    assertTenantMembership(actor, tenantId);
    const row = await this.prisma.serviceType.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        durationMinutes: dto.durationMinutes,
        colorCode: dto.colorCode?.trim() ?? null,
        isActive: dto.isActive ?? true,
      },
    });
    return this.mapRow(row);
  }

  async list(actor: AuthUser, query: ListServiceTypesQueryDto) {
    const tenantId = resolveSchedulingTenantId(actor, query.tenantId);
    assertTenantMembership(actor, tenantId);
    const rows = await this.prisma.serviceType.findMany({
      where: {
        tenantId,
        ...(query.activeOnly === true ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.mapRow(r));
  }

  async update(actor: AuthUser, id: string, dto: UpdateServiceTypeDto) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Service type not found');
    }
    assertTenantMembership(actor, existing.tenantId);
    const row = await this.prisma.serviceType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.durationMinutes !== undefined
          ? { durationMinutes: dto.durationMinutes }
          : {}),
        ...(dto.colorCode !== undefined
          ? { colorCode: dto.colorCode?.trim() ?? null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return this.mapRow(row);
  }

  async remove(actor: AuthUser, id: string) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Service type not found');
    }
    assertTenantMembership(actor, existing.tenantId);
    await this.prisma.serviceType.delete({ where: { id } });
    return { deleted: true };
  }

  private mapRow(row: {
    id: string;
    tenantId: string;
    name: string;
    durationMinutes: number;
    colorCode: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      durationMinutes: row.durationMinutes,
      colorCode: row.colorCode,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
