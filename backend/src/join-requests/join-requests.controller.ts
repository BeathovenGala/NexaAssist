import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { CreateJoinRequestDto, ListJoinRequestsQueryDto } from './dto/join-requests.dto';
import { JoinRequestsService } from './join-requests.service';

@Controller('join-requests')
@UseGuards(RolesGuard, PermissionsGuard)
export class JoinRequestsController {
  constructor(private readonly joinRequests: JoinRequestsService) {}

  @Post()
  @RequirePermissions('join-requests:create')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateJoinRequestDto) {
    return this.joinRequests.create(actor, dto.tenantSlug);
  }

  @Get('pending-count')
  @RequirePermissions('join-requests:manage')
  pendingCount(
    @CurrentUser() actor: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.joinRequests.pendingCount(actor, tenantId);
  }

  @Get()
  @RequirePermissions('join-requests:manage')
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListJoinRequestsQueryDto,
  ) {
    return this.joinRequests.list(actor, query.tenantId, query.status);
  }

  @Patch(':id/approve')
  @RequirePermissions('join-requests:manage')
  approve(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.joinRequests.approve(actor, id);
  }

  @Patch(':id/reject')
  @RequirePermissions('join-requests:manage')
  reject(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.joinRequests.reject(actor, id);
  }
}
