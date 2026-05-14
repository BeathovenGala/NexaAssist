import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../types/auth-user';
import { PrismaService } from '../prisma/prisma.service';

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
}
