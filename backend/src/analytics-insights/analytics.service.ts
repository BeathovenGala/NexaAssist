import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsModule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProducerService } from '../queues/queue-producer.service';
import type { DateRangeDto, EventsQueryDto, InsightsQueryDto } from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueProducerService,
  ) {}

  async getDashboardKPIs(tenantId: string, query: DateRangeDto) {
    const where = this.buildDateWhere(tenantId, query);

    const [
      totalAppointments,
      completedAppointments,
      totalUsers,
      activeCampaigns,
      seoProjects,
    ] = await Promise.all([
      this.prisma.appointment.count({ where: { tenantId, ...this.dateBetween(query) } }),
      this.prisma.appointment.count({
        where: { tenantId, status: 'COMPLETED', ...this.dateBetween(query) },
      }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.campaign.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.seoProject.count({ where: { tenantId } }),
    ]);

    return {
      totalAppointments,
      completedAppointments,
      completionRate:
        totalAppointments > 0
          ? ((completedAppointments / totalAppointments) * 100).toFixed(1)
          : '0',
      totalUsers,
      activeCampaigns,
      seoProjects,
    };
  }

  async getAppointmentAnalytics(tenantId: string, query: DateRangeDto) {
    const dateBetween = this.dateBetween(query);

    const [total, byStatus, upcoming] = await Promise.all([
      this.prisma.appointment.count({ where: { tenantId, ...dateBetween } }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { tenantId, ...dateBetween },
        _count: true,
      }),
      this.prisma.appointment.count({
        where: { tenantId, status: 'PENDING', startTime: { gte: new Date() } },
      }),
    ]);

    return { total, byStatus, upcoming };
  }

  async getInventoryAnalytics(tenantId: string, query: DateRangeDto) {
    const [totalItems, lowStock, outOfStock, recentMovements] = await Promise.all([
      this.prisma.inventoryItem.count({ where: { tenantId, isActive: true } }),
      this.prisma.inventoryItem.count({ where: { tenantId, status: 'LOW' } }),
      this.prisma.inventoryItem.count({ where: { tenantId, status: 'OUT_OF_STOCK' } }),
      this.prisma.stockMovement.count({
        where: { tenantId, ...this.dateBetween(query) },
      }),
    ]);

    return { totalItems, lowStock, outOfStock, recentMovements };
  }

  async getCampaignAnalytics(tenantId: string, query: DateRangeDto) {
    const [total, byStatus, topCampaign] = await Promise.all([
      this.prisma.campaign.count({ where: { tenantId } }),
      this.prisma.campaign.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.campaignAnalytics.findFirst({
        where: { campaign: { tenantId } },
        orderBy: { impressions: 'desc' },
        include: { campaign: { select: { name: true } } },
      }),
    ]);

    return { total, byStatus, topCampaign };
  }

  async getChatbotAnalytics(tenantId: string, query: DateRangeDto) {
    const dateBetween = this.dateBetween(query);

    const [totalSessions, activeSessions, totalMessages, toolCalls] = await Promise.all([
      this.prisma.chatSession.count({ where: { tenantId, ...dateBetween } }),
      this.prisma.chatSession.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.chatMessage.count({
        where: { session: { tenantId }, createdAt: dateBetween.createdAt },
      }),
      this.prisma.chatToolCall.count({ where: { tenantId, ...dateBetween } }),
    ]);

    return { totalSessions, activeSessions, totalMessages, toolCalls };
  }

  async getSeoAnalytics(tenantId: string, _query: DateRangeDto) {
    const [projects, scans, avgIssues] = await Promise.all([
      this.prisma.seoProject.count({ where: { tenantId } }),
      this.prisma.seoScan.count({ where: { project: { tenantId } } }),
      this.prisma.seoScan.aggregate({
        where: { project: { tenantId }, status: 'COMPLETED' },
        _avg: { issuesFound: true },
      }),
    ]);

    return { projects, scans, avgIssuesPerScan: avgIssues._avg.issuesFound ?? 0 };
  }

  async getInsights(tenantId: string, query: InsightsQueryDto) {
    return this.prisma.analyticsInsight.findMany({
      where: {
        tenantId,
        ...(query.module ? { module: query.module } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: 20,
    });
  }

  async triggerAggregation(tenantId: string) {
    await this.queues.enqueueAnalyticsAggregation({ tenantId });
    return { queued: true };
  }

  async getEvents(tenantId: string, query: EventsQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '50', 10);

    const where: Record<string, unknown> = { tenantId };
    if (query.type) where.type = query.type;
    if (query.module) where.module = query.module;

    const [events, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return { events, total, page, limit };
  }

  private buildDateWhere(tenantId: string, query: DateRangeDto) {
    return { tenantId, ...this.dateBetween(query) };
  }

  private dateBetween(query: DateRangeDto): { createdAt?: { gte?: Date; lte?: Date } } {
    if (!query.from && !query.to) return {};
    return {
      createdAt: {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      },
    };
  }
}
