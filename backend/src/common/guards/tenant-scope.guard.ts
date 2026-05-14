import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../../types/auth-user';

/**
 * Ensures route :tenantId (or :id for tenants controller) matches the authenticated user's tenant,
 * unless the caller is a platform super admin.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      params: Record<string, string>;
    }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Unauthorized');
    }
    if (user.roles.includes(RoleName.SUPER_ADMIN)) {
      return true;
    }
    const paramTenantId = request.params.tenantId ?? request.params.id;
    if (!paramTenantId) {
      return true;
    }
    if (!user.tenantId || user.tenantId !== paramTenantId) {
      throw new ForbiddenException('Tenant scope violation');
    }
    return true;
  }
}
