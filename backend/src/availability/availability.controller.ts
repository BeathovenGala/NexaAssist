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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityDto,
  CreateBlockedSlotDto,
  FreeSlotsQueryDto,
  ListAvailabilityQueryDto,
  ListBlockedQueryDto,
  UpdateAvailabilitySlotDto,
} from './dto/availability.dto';

@Controller('availability')
@UseGuards(RolesGuard, PermissionsGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Post()
  @RequirePermissions('availability:write')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateAvailabilityDto) {
    return this.availability.create(actor, dto);
  }

  @Get()
  @RequirePermissions('availability:read')
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListAvailabilityQueryDto,
  ) {
    return this.availability.listSlots(actor, query);
  }

  @Get('recurring')
  @RequirePermissions('availability:read')
  listRecurring(
    @CurrentUser() actor: AuthUser,
    @Query('staffId') staffId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.availability.listRecurring(actor, staffId, tenantId);
  }

  @Get('free-slots')
  @RequirePermissions('availability:read')
  freeSlots(
    @CurrentUser() actor: AuthUser,
    @Query() query: FreeSlotsQueryDto,
  ) {
    return this.availability.freeSlots(actor, query);
  }

  @Patch(':id')
  @RequirePermissions('availability:write')
  updateSlot(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilitySlotDto,
  ) {
    return this.availability.updateSlot(actor, id, dto);
  }

  @Delete('recurring/:id')
  @RequirePermissions('availability:write')
  deleteRecurring(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.availability.deleteRecurring(actor, id);
  }

  @Delete('blocked/:id')
  @RequirePermissions('availability:write')
  deleteBlocked(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.availability.deleteBlocked(actor, id);
  }

  @Delete(':id')
  @RequirePermissions('availability:write')
  deleteSlot(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.availability.deleteSlot(actor, id);
  }

  @Post('blocked')
  @RequirePermissions('availability:write')
  createBlocked(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateBlockedSlotDto,
  ) {
    return this.availability.createBlocked(actor, dto);
  }

  @Get('blocked')
  @RequirePermissions('availability:read')
  listBlocked(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListBlockedQueryDto,
  ) {
    return this.availability.listBlocked(actor, query);
  }
}
