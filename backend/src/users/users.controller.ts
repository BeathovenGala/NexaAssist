import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('users:create')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(actor, dto);
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('users:read')
  list(
    @CurrentUser() actor: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.users.list(actor, tenantId);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('users:update')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(actor, id, dto);
  }
}
