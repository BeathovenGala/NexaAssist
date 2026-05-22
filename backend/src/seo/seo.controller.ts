import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { QuickAuditDto } from './dto/seo.dto';
import type {
  CompareScanDto,
  CreateSeoProjectDto,
  SeoIssueFilterDto,
  SeoPageFilterDto,
} from './dto/seo.dto';
import { SeoLlmAuditService } from './seo-llm-audit.service';
import { SeoService } from './seo.service';

@Controller('seo')
@UseGuards(RolesGuard, PermissionsGuard)
export class SeoController {
  constructor(
    private readonly seo: SeoService,
    private readonly seoLlmAudit: SeoLlmAuditService,
  ) {}

  @Post('quick-audit')
  @RequirePermissions('seo:read')
  quickAudit(@CurrentUser() actor: AuthUser, @Body() dto: QuickAuditDto) {
    return this.seoLlmAudit.quickAudit(dto.url, actor.tenantId!);
  }

  @Get('stats')
  @RequirePermissions('seo:read')
  getStats(@CurrentUser() actor: AuthUser) {
    return this.seo.getStats(actor.tenantId!);
  }

  @Post('projects')
  @RequirePermissions('seo:write')
  createProject(@CurrentUser() actor: AuthUser, @Body() dto: CreateSeoProjectDto) {
    return this.seo.createProject(actor.tenantId!, dto);
  }

  @Get('projects')
  @RequirePermissions('seo:read')
  listProjects(@CurrentUser() actor: AuthUser) {
    return this.seo.findProjects(actor.tenantId!);
  }

  @Get('projects/:id')
  @RequirePermissions('seo:read')
  getProject(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.findProject(actor.tenantId!, id);
  }

  @Post('projects/:id/scan')
  @RequirePermissions('seo:write')
  triggerScan(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.triggerScan(actor.tenantId!, id);
  }

  @Get('scans/:id')
  @RequirePermissions('seo:read')
  getScanStatus(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.getScanStatus(actor.tenantId!, id);
  }

  @Get('scans/:id/pages')
  @RequirePermissions('seo:read')
  getPages(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query() filter: SeoPageFilterDto,
  ) {
    return this.seo.getPages(actor.tenantId!, id, filter);
  }

  @Get('scans/:id/issues')
  @RequirePermissions('seo:read')
  getIssues(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query() filter: SeoIssueFilterDto,
  ) {
    return this.seo.getIssues(actor.tenantId!, id, filter);
  }

  @Get('scans/:id/recommendations')
  @RequirePermissions('seo:read')
  getRecommendations(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.getRecommendations(actor.tenantId!, id);
  }

  @Get('scans/:id/report')
  @RequirePermissions('seo:read')
  getReport(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.getReport(actor.tenantId!, id);
  }

  @Get('scans/:id/report/download')
  @RequirePermissions('seo:read')
  downloadReport(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.downloadReport(actor.tenantId!, id);
  }

  @Post('scans/compare')
  @RequirePermissions('seo:read')
  compareScans(@CurrentUser() actor: AuthUser, @Body() dto: CompareScanDto) {
    return this.seo.compareScans(actor.tenantId!, dto);
  }

  @Get('projects/:id/history')
  @RequirePermissions('seo:read')
  getScanHistory(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.seo.getScanHistory(actor.tenantId!, id);
  }
}
