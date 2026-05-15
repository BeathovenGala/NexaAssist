import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug.util';
import type { UpdateTenantDto } from './dto/tenants.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOne(tenantId: string, actor: AuthUser) {
    if (!actor.roles.includes(RoleName.SUPER_ADMIN)) {
      if (!actor.tenantId || actor.tenantId !== tenantId) {
        throw new ForbiddenException('Tenant scope violation');
      }
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      businessType: tenant.businessType,
      status: tenant.status,
      createdAt: tenant.createdAt,
    };
  }

  async update(tenantId: string, actor: AuthUser, dto: UpdateTenantDto) {
    if (!actor.roles.includes(RoleName.SUPER_ADMIN)) {
      if (!actor.tenantId || actor.tenantId !== tenantId) {
        throw new ForbiddenException('Tenant scope violation');
      }
    }
    const existing = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Tenant not found');
    }

    let slug = dto.slug;
    if (slug !== undefined) {
      let base = slugify(slug);
      if (!base) {
        base = `org-${Date.now()}`;
      }
      slug = base;
      let suffix = 0;
      let candidate = slug;
      for (;;) {
        const clash = await this.prisma.tenant.findFirst({
          where: { slug: candidate, NOT: { id: tenantId } },
        });
        if (!clash) {
          break;
        }
        suffix += 1;
        candidate = `${slug}-${suffix}`;
      }
      slug = candidate;
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(dto.businessType !== undefined
          ? { businessType: dto.businessType }
          : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      businessType: updated.businessType,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
