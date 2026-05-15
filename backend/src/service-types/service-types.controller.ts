import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import {
  CreateServiceTypeDto,
  ListServiceTypesQueryDto,
  UpdateServiceTypeDto,
} from './dto/service-types.dto';
import { ServiceTypesService } from './service-types.service';

@Controller('service-types')
@UseGuards(RolesGuard, PermissionsGuard)
export class ServiceTypesController {
  constructor(private readonly serviceTypes: ServiceTypesService) {}

  @Post()
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.TENANT_ADMIN,
    RoleName.RECEPTIONIST,
  )
  @RequirePermissions('service-types:write')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateServiceTypeDto) {
    return this.serviceTypes.create(actor, dto);
  }

  @Get()
  @RequirePermissions('service-types:read')
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListServiceTypesQueryDto,
  ) {
    return this.serviceTypes.list(actor, query);
  }

  @Patch(':id')
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.TENANT_ADMIN,
    RoleName.RECEPTIONIST,
  )
  @RequirePermissions('service-types:write')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceTypeDto,
  ) {
    return this.serviceTypes.update(actor, id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('service-types:write')
  remove(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.serviceTypes.remove(actor, id);
  }
}
