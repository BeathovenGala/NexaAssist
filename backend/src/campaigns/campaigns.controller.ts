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
import { CampaignAiService } from './campaign-ai.service';
import { CampaignsService } from './campaigns.service';
import {
  ApproveRejectCampaignDto,
  CreateCampaignDto,
  GenerateCopyDto,
  GeneratePosterDto,
  ListCampaignsQueryDto,
  QuickGenerateDto,
  ScheduleCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';

@Controller('campaigns')
@UseGuards(RolesGuard, PermissionsGuard)
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly campaignAi: CampaignAiService,
  ) {}

  @Post()
  @RequirePermissions('campaigns:write')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(actor.tenantId!, actor.id, dto);
  }

  @Get()
  @RequirePermissions('campaigns:read')
  findAll(@CurrentUser() actor: AuthUser, @Query() query: ListCampaignsQueryDto) {
    return this.campaigns.findAll(actor.tenantId!, query);
  }

  @Get('stats')
  @RequirePermissions('campaigns:read')
  getStats(@CurrentUser() actor: AuthUser) {
    return this.campaigns.getStats(actor.tenantId!);
  }

  @Post('generate-copy')
  @RequirePermissions('campaigns:write')
  async generateCopySync(@Body() dto: GenerateCopyDto) {
    const copy = await this.campaignAi.generateCopySync(dto);
    return { copy };
  }

  @Post('generate-poster')
  @RequirePermissions('campaigns:write')
  async generatePosterSync(@Body() dto: GeneratePosterDto) {
    const result = await this.campaignAi.generatePosterSync(dto);
    return result;
  }

  @Post('quick-generate')
  @RequirePermissions('campaigns:write')
  quickGenerate(@Body() dto: QuickGenerateDto) {
    return this.campaignAi.quickGenerate(dto);
  }

  @Get(':id')
  @RequirePermissions('campaigns:read')
  findOne(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.findOne(actor.tenantId!, id);
  }

  @Patch(':id')
  @RequirePermissions('campaigns:write')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaigns.update(actor.tenantId!, id, dto);
  }

  @Post(':id/duplicate')
  @RequirePermissions('campaigns:write')
  duplicate(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.duplicate(actor.tenantId!, id, actor.id);
  }

  @Delete(':id')
  @RequirePermissions('campaigns:write')
  archive(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.archive(actor.tenantId!, id);
  }

  @Post(':id/generate-copy')
  @RequirePermissions('campaigns:write')
  async generateCopyForCampaign(
    @Param('id') id: string,
    @Body() dto: GenerateCopyDto,
  ) {
    const copy = await this.campaignAi.generateCopySync({ ...dto });
    return { campaignId: id, copy };
  }

  @Post(':id/generate-poster')
  @RequirePermissions('campaigns:write')
  async generatePosterForCampaign(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: GeneratePosterDto,
  ) {
    const campaign = await this.campaigns.findOne(actor.tenantId!, id);
    const { posterUrl, source, imagePrompt } = await this.campaignAi.generatePosterSync({
      ...dto,
      name: dto.name ?? campaign.name,
      imagePrompt: dto.imagePrompt ?? campaign.generatedCopy ?? undefined,
      startAt: dto.startAt ?? campaign.startDate ?? undefined,
      endAt: dto.endAt ?? campaign.endDate ?? undefined,
    });
    await this.campaigns.attachPosterAsset(actor.tenantId!, id, posterUrl);
    return { campaignId: id, posterUrl, source, imagePrompt };
  }

  @Post(':id/request-approval')
  @RequirePermissions('campaigns:write')
  requestApproval(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.requestApproval(actor.tenantId!, id, actor.id);
  }

  @Patch(':id/approve')
  @RequirePermissions('campaigns:approve')
  approveOrReject(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApproveRejectCampaignDto,
  ) {
    return this.campaigns.approveOrReject(actor.tenantId!, id, actor.id, dto);
  }

  @Post(':id/schedule')
  @RequirePermissions('campaigns:write')
  schedule(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: ScheduleCampaignDto,
  ) {
    return this.campaigns.schedule(actor.tenantId!, id, dto);
  }

  @Post(':id/execute')
  @RequirePermissions('campaigns:write')
  execute(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.triggerExecution(actor.tenantId!, id);
  }

  @Get(':id/analytics')
  @RequirePermissions('campaigns:read')
  getAnalytics(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.getAnalytics(actor.tenantId!, id);
  }

  @Get(':id/audience-preview')
  @RequirePermissions('campaigns:read')
  audiencePreview(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.campaigns.getAudiencePreview(actor.tenantId!, id);
  }
}
