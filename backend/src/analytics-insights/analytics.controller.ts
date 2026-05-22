import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { AnalyticsService } from './analytics.service';
import type {
  DateRangeDto,
  EventsQueryDto,
  InsightsQueryDto,
} from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(RolesGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  getDashboard(@CurrentUser() actor: AuthUser, @Query() query: DateRangeDto) {
    return this.analytics.getDashboardKPIs(actor.tenantId!, query);
  }

  @Get('appointments')
  @RequirePermissions('analytics:read')
  getAppointments(@CurrentUser() actor: AuthUser, @Query() query: DateRangeDto) {
    return this.analytics.getAppointmentAnalytics(actor.tenantId!, query);
  }

  @Get('inventory')
  @RequirePermissions('analytics:read')
  getInventory(@CurrentUser() actor: AuthUser, @Query() query: DateRangeDto) {
    return this.analytics.getInventoryAnalytics(actor.tenantId!, query);
  }

  @Get('campaigns')
  @RequirePermissions('analytics:read')
  getCampaigns(@CurrentUser() actor: AuthUser, @Query() query: DateRangeDto) {
    return this.analytics.getCampaignAnalytics(actor.tenantId!, query);
  }

  @Get('chatbot')
  @RequirePermissions('analytics:read')
  getChatbot(@CurrentUser() actor: AuthUser, @Query() query: DateRangeDto) {
    return this.analytics.getChatbotAnalytics(actor.tenantId!, query);
  }

  @Get('seo')
  @RequirePermissions('analytics:read')
  getSeo(@CurrentUser() actor: AuthUser, @Query() query: DateRangeDto) {
    return this.analytics.getSeoAnalytics(actor.tenantId!, query);
  }

  @Get('insights')
  @RequirePermissions('analytics:read')
  getInsights(@CurrentUser() actor: AuthUser, @Query() query: InsightsQueryDto) {
    return this.analytics.getInsights(actor.tenantId!, query);
  }

  @Get('insights/:module')
  @RequirePermissions('analytics:read')
  getModuleInsights(
    @CurrentUser() actor: AuthUser,
    @Param('module') module: string,
    @Query() query: InsightsQueryDto,
  ) {
    return this.analytics.getInsights(actor.tenantId!, { ...query, module: module as never });
  }

  @Post('aggregate')
  @RequirePermissions('analytics:write')
  triggerAggregation(@CurrentUser() actor: AuthUser) {
    return this.analytics.triggerAggregation(actor.tenantId!);
  }

  @Get('events')
  @RequirePermissions('analytics:read')
  getEvents(@CurrentUser() actor: AuthUser, @Query() query: EventsQueryDto) {
    return this.analytics.getEvents(actor.tenantId!, query);
  }
}
