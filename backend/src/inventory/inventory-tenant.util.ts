import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../types/auth-user';

export function resolveInventoryTenantId(
  actor: AuthUser,
  tenantIdQuery?: string,
): string {
  if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
    const tid = tenantIdQuery ?? actor.tenantId;
    if (!tid) {
      throw new BadRequestException('tenantId query is required for this operation');
    }
    return tid;
  }
  if (!actor.tenantId) {
    throw new BadRequestException('No tenant context for this user');
  }
  if (tenantIdQuery && tenantIdQuery !== actor.tenantId) {
    throw new ForbiddenException('Tenant scope violation');
  }
  return actor.tenantId;
}
