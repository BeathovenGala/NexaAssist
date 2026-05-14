import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Tenant context is derived from the verified JWT in {@link JwtStrategy}
 * (`req.user.tenantId`) after {@link JwtAuthGuard} runs.
 *
 * Route-level isolation uses {@link TenantScopeGuard} and service-layer
 * queries always scope by `actor.tenantId` for non–super-admin users.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    next();
  }
}
