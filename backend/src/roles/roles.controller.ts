import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('roles:read')
  list(@CurrentUser() user: AuthUser) {
    return this.roles.listAssignable(user);
  }
}
