import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { ListNotificationsQueryDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(RolesGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions('notifications:read')
  list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notifications.list(actor, query);
  }

  @Get('unread-count')
  @RequirePermissions('notifications:read')
  unreadCount(@CurrentUser() actor: AuthUser) {
    return this.notifications.unreadCount(actor);
  }

  @Patch('read-all')
  @RequirePermissions('notifications:read')
  markAllRead(@CurrentUser() actor: AuthUser) {
    return this.notifications.markAllRead(actor);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:read')
  markRead(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(actor, id);
  }
}
