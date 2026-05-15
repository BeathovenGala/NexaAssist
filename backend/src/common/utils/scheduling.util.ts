import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../../types/auth-user';

export function resolveSchedulingTenantId(
  actor: AuthUser,
  tenantIdQuery?: string | null,
): string {
  if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
    const tid = tenantIdQuery ?? actor.tenantId;
    if (!tid) {
      throw new BadRequestException('tenantId is required for this operation');
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

export function assertTenantMembership(
  actor: AuthUser,
  tenantId: string,
): void {
  if (actor.roles.includes(RoleName.SUPER_ADMIN)) {
    return;
  }
  if (!actor.tenantId || actor.tenantId !== tenantId) {
    throw new ForbiddenException('Tenant scope violation');
  }
}

/** Broad org-wide appointment visibility (list / calendar). */
export function canViewAllTenantAppointments(actor: AuthUser): boolean {
  return (
    actor.roles.includes(RoleName.SUPER_ADMIN) ||
    actor.roles.includes(RoleName.TENANT_ADMIN) ||
    actor.roles.includes(RoleName.RECEPTIONIST)
  );
}

export function isCustomerOnly(actor: AuthUser): boolean {
  return (
    actor.roles.length > 0 &&
    actor.roles.every((r) => r === RoleName.CUSTOMER)
  );
}
