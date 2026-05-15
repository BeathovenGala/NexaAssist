import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import type { AuthUser } from '../../types/auth-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Ensures route :tenantId (or :id for tenants controller) matches the authenticated user's tenant,
 * unless the caller is a platform super admin.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      params: Record<string, string>;
    }>();    const user = request.user;
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
