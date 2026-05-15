import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import type { AuthUser } from '../types/auth-user';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/tenants.dto';

@Controller('tenants')
@UseGuards(RolesGuard, PermissionsGuard, TenantScopeGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('tenants:read')
  getOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.tenants.getOne(id, user);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('tenants:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tenants.update(id, user, dto);
  }
}
