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
import {
  CancelAppointmentDto,
  CompleteAppointmentDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointments.dto';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(RolesGuard, PermissionsGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @RequirePermissions('appointments:create')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(actor, dto);
  }

  @Get()
  @RequirePermissions('appointments:read')
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListAppointmentsQueryDto,
  ) {
    return this.appointments.list(actor, query);
  }

  @Get('bookable-staff')
  @RequirePermissions('appointments:create')
  bookableStaff(
    @CurrentUser() actor: AuthUser,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.appointments.listBookableStaff(actor, tenantId);
  }

  @Get(':id')
  @RequirePermissions('appointments:read')
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.appointments.findOne(actor, id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('appointments:cancel')
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointments.cancel(actor, id, dto);
  }

  @Patch(':id/reschedule')
  @RequirePermissions('appointments:update')
  reschedule(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointments.reschedule(actor, id, dto);
  }

  @Patch(':id/complete')
  @RequirePermissions('appointments:update')
  complete(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteAppointmentDto,
  ) {
    return this.appointments.complete(actor, id, dto);
  }

  @Patch(':id')
  @RequirePermissions('appointments:update')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(actor, id, dto);
  }
}
