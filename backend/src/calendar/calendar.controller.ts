import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { CalendarRangeQueryDto } from './dto/calendar.dto';
import { CalendarService } from './calendar.service';

@Controller('calendar')
@UseGuards(RolesGuard, PermissionsGuard)
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('day')
  @RequirePermissions('calendar:read')
  day(
    @CurrentUser() actor: AuthUser,
    @Query() query: CalendarRangeQueryDto,
  ) {
    return this.calendar.getView(actor, 'day', query);
  }

  @Get('week')
  @RequirePermissions('calendar:read')
  week(
    @CurrentUser() actor: AuthUser,
    @Query() query: CalendarRangeQueryDto,
  ) {
    return this.calendar.getView(actor, 'week', query);
  }

  @Get('month')
  @RequirePermissions('calendar:read')
  month(
    @CurrentUser() actor: AuthUser,
    @Query() query: CalendarRangeQueryDto,
  ) {
    return this.calendar.getView(actor, 'month', query);
  }
}
