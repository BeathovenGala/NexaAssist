import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitations.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
@UseGuards(RolesGuard, PermissionsGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Public()
  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.invitations.validateToken(token);
  }

  @Public()
  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(dto);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('invitations:create')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateInvitationDto) {
    return this.invitations.create(actor, dto);
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('invitations:read')
  list(
    @CurrentUser() actor: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.invitations.list(actor, tenantId);
  }

  @Post(':id/resend')
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('invitations:create')
  resend(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.invitations.resend(actor, id);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.TENANT_ADMIN)
  @RequirePermissions('invitations:create')
  revoke(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.invitations.revoke(actor, id);
  }
}
