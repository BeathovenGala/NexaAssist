import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  CampaignAssetType,
  CampaignChannel,
  CampaignStatus,
  ExecutionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProducerService } from '../queues/queue-producer.service';
import type {
  ApproveRejectCampaignDto,
  CreateCampaignDto,
  ListCampaignsQueryDto,
  ScheduleCampaignDto,
  UpdateCampaignDto,
} from './dto/campaign.dto';
import { mapCampaignDetail, mapCampaignListItem } from './campaigns.mapper';

const campaignCreatorSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueProducerService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        tenantId,
        createdById: userId,
        name: dto.name,
        objective: dto.objective,
        audienceType: dto.audienceType,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        budget: dto.budget,
        notes: dto.notes,
        status: CampaignStatus.DRAFT,
        analytics: { create: {} },
        ...(dto.posterUrl
          ? {
              assets: {
                create: {
                  type: CampaignAssetType.POSTER,
                  storageUrl: dto.posterUrl,
                  aiGenerated: true,
                },
              },
            }
          : {}),
      },
      include: { analytics: true, assets: true },
    });
  }

  async findAll(tenantId: string, query: ListCampaignsQueryDto) {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: campaignCreatorSelect },
          schedules: { orderBy: { scheduledAt: 'desc' }, take: 1 },
          executions: { select: { channel: true } },
          assets: true,
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      items: rows.map(mapCampaignListItem),
      total,
      page,
      limit,
    };
  }

  async attachPosterAsset(tenantId: string, campaignId: string, posterUrl: string) {
    await this.assertExists(tenantId, campaignId);

    const existing = await this.prisma.campaignAsset.findFirst({
      where: { campaignId, type: CampaignAssetType.POSTER },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return this.prisma.campaignAsset.update({
        where: { id: existing.id },
        data: { storageUrl: posterUrl, aiGenerated: true },
      });
    }

    return this.prisma.campaignAsset.create({
      data: {
        campaignId,
        type: CampaignAssetType.POSTER,
        storageUrl: posterUrl,
        aiGenerated: true,
        metadata: { source: 'campaign-ai-service' },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: campaignCreatorSelect },
        audiences: true,
        assets: true,
        messages: { orderBy: { createdAt: 'desc' } },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            approvedBy: { select: campaignCreatorSelect },
          },
        },
        schedules: { orderBy: { scheduledAt: 'desc' } },
        executions: true,
        analytics: true,
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return mapCampaignDetail(campaign);
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    await this.assertExists(tenantId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });
  }

  async duplicate(tenantId: string, id: string, userId: string) {
    const source = await this.findOne(tenantId, id);
    return this.prisma.campaign.create({
      data: {
        tenantId,
        createdById: userId,
        name: `${source.name} (Copy)`,
        objective: source.objective,
        audienceType: source.audienceType,
        notes: source.notes,
        status: CampaignStatus.DRAFT,
        analytics: { create: {} },
      },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ARCHIVED },
    });
  }

  async getAudiencePreview(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    const total = await this.prisma.user.count({ where: { tenantId } });
    return { estimatedReach: total };
  }

  async requestApproval(tenantId: string, id: string, userId: string) {
    const campaign = await this.assertExists(tenantId, id);
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT campaigns can be submitted for approval');
    }
    const [approval] = await this.prisma.$transaction([
      this.prisma.campaignApproval.create({
        data: { campaignId: id, requestedById: userId, status: ApprovalStatus.PENDING },
      }),
      this.prisma.campaign.update({
        where: { id },
        data: { status: CampaignStatus.PENDING_APPROVAL },
      }),
    ]);
    return approval;
  }

  async approveOrReject(tenantId: string, id: string, userId: string, dto: ApproveRejectCampaignDto) {
    await this.assertExists(tenantId, id);
    const approval = await this.prisma.campaignApproval.findFirst({
      where: { campaignId: id, status: ApprovalStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    if (!approval) throw new NotFoundException('No pending approval found');

    let newCampaignStatus: CampaignStatus;
    let newApprovalStatus: ApprovalStatus;

    if (dto.action === 'APPROVE') {
      newCampaignStatus = CampaignStatus.APPROVED;
      newApprovalStatus = ApprovalStatus.APPROVED;
    } else if (dto.action === 'REJECT') {
      newCampaignStatus = CampaignStatus.REJECTED;
      newApprovalStatus = ApprovalStatus.REJECTED;
    } else {
      newCampaignStatus = CampaignStatus.DRAFT;
      newApprovalStatus = ApprovalStatus.REVISION_REQUESTED;
    }

    await this.prisma.$transaction([
      this.prisma.campaignApproval.update({
        where: { id: approval.id },
        data: { status: newApprovalStatus, approvedById: userId, comment: dto.comment },
      }),
      this.prisma.campaign.update({
        where: { id },
        data: { status: newCampaignStatus },
      }),
    ]);
    return { success: true };
  }

  async schedule(tenantId: string, id: string, dto: ScheduleCampaignDto) {
    const campaign = await this.assertExists(tenantId, id);
    const schedulableStatuses = [CampaignStatus.APPROVED, CampaignStatus.DRAFT] as string[];
    if (!schedulableStatuses.includes(campaign.status)) {
      throw new BadRequestException('Campaign must be APPROVED or DRAFT to schedule');
    }

    const schedule = await this.prisma.campaignSchedule.create({
      data: {
        campaignId: id,
        scheduledAt: new Date(dto.scheduledAt),
        timezone: dto.timezone ?? 'UTC',
      },
    });

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.SCHEDULED },
    });

    return schedule;
  }

  async triggerExecution(tenantId: string, id: string) {
    const campaign = await this.assertExists(tenantId, id);
    const executableStatuses = [CampaignStatus.APPROVED, CampaignStatus.SCHEDULED] as string[];
    if (!executableStatuses.includes(campaign.status)) {
      throw new BadRequestException('Campaign must be APPROVED or SCHEDULED to execute');
    }

    const execution = await this.prisma.campaignExecution.create({
      data: {
        campaignId: id,
        channel: CampaignChannel.IN_APP,
        status: ExecutionStatus.QUEUED,
      },
    });

    await this.queues.enqueueCampaignExecution({
      tenantId,
      campaignId: id,
      executionId: execution.id,
    });

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });

    return execution;
  }

  async getStats(tenantId: string) {
    const [total, active, pendingApproval, scheduled, draft] = await Promise.all([
      this.prisma.campaign.count({ where: { tenantId } }),
      this.prisma.campaign.count({ where: { tenantId, status: CampaignStatus.ACTIVE } }),
      this.prisma.campaign.count({ where: { tenantId, status: CampaignStatus.PENDING_APPROVAL } }),
      this.prisma.campaign.count({ where: { tenantId, status: CampaignStatus.SCHEDULED } }),
      this.prisma.campaign.count({ where: { tenantId, status: CampaignStatus.DRAFT } }),
    ]);
    return { total, active, pendingApproval, scheduled, draft };
  }

  async getAnalytics(tenantId: string, id: string) {
    await this.assertExists(tenantId, id);
    return this.prisma.campaignAnalytics.findUnique({ where: { campaignId: id } });
  }

  private async assertExists(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }
}
