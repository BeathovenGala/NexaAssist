import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, WhatsAppBatchStatus, WhatsAppMessageStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueProducerService } from '../queues/queue-producer.service';
import type {
  CreateBatchDto,
  CreateTemplateDto,
  MessageLogQueryDto,
  UpdateTemplateDto,
} from './dto/whatsapp.dto';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueProducerService,
  ) {}

  async createTemplate(tenantId: string, dto: CreateTemplateDto) {
    return this.prisma.whatsAppTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        content: dto.content,
        variablesJson: dto.variablesJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findTemplates(tenantId: string) {
    return this.prisma.whatsAppTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTemplate(tenantId: string, id: string, dto: UpdateTemplateDto) {
    await this.assertTemplateExists(tenantId, id);
    return this.prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        ...dto,
        variablesJson: dto.variablesJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createBatch(tenantId: string, dto: CreateBatchDto) {
    const template = dto.templateId
      ? await this.prisma.whatsAppTemplate.findFirst({
          where: { id: dto.templateId, tenantId },
        })
      : null;

    const batch = await this.prisma.whatsAppBatch.create({
      data: {
        tenantId,
        campaignId: dto.campaignId,
        totalRecipients: dto.recipients.length,
        status: WhatsAppBatchStatus.PENDING,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        messages: {
          create: dto.recipients.map((r) => {
            let content = dto.defaultContent ?? '';
            if (template) {
              content = template.content;
              if (dto.templateId && r.variables) {
                Object.entries(r.variables).forEach(([k, v]) => {
                  content = content.replace(new RegExp(`{{${k}}}`, 'g'), v);
                });
              }
            }
            return {
              templateId: dto.templateId,
              recipientPhone: r.phone,
              content,
              status: WhatsAppMessageStatus.QUEUED,
            };
          }),
        },
      },
    });

    await this.queues.enqueueWhatsAppSend({ tenantId, batchId: batch.id });
    return batch;
  }

  async findBatches(tenantId: string) {
    return this.prisma.whatsAppBatch.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async getBatchStatus(tenantId: string, batchId: string) {
    const batch = await this.prisma.whatsAppBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        _count: { select: { messages: true } },
      },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async getMessageLogs(tenantId: string, query: MessageLogQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '50', 10);

    const batchFilter = query.batchId
      ? { batchId: query.batchId }
      : { batch: { tenantId } };

    const [messages, total] = await Promise.all([
      this.prisma.whatsAppMessage.findMany({
        where: {
          ...batchFilter,
          ...(query.status ? { status: query.status as WhatsAppMessageStatus } : {}),
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.whatsAppMessage.count({
        where: {
          ...batchFilter,
          ...(query.status ? { status: query.status as WhatsAppMessageStatus } : {}),
        },
      }),
    ]);

    return { messages, total, page, limit };
  }

  async retryFailed(tenantId: string, batchId: string) {
    const batch = await this.prisma.whatsAppBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new NotFoundException('Batch not found');

    const failedMessages = await this.prisma.whatsAppMessage.findMany({
      where: { batchId, status: WhatsAppMessageStatus.FAILED },
      select: { id: true },
    });

    if (failedMessages.length === 0) return { retried: 0 };

    await this.prisma.whatsAppMessage.updateMany({
      where: { id: { in: failedMessages.map((m) => m.id) } },
      data: { status: WhatsAppMessageStatus.QUEUED, errorMessage: null },
    });

    await this.queues.enqueueWhatsAppRetry({
      tenantId,
      batchId,
      messageIds: failedMessages.map((m) => m.id),
    });

    return { retried: failedMessages.length };
  }

  async handleCallback(payload: Record<string, unknown>) {
    const messageId = payload.messageId as string;
    const status = payload.status as string;

    if (!messageId || !status) return;

    const message = await this.prisma.whatsAppMessage.findFirst({
      where: { id: messageId },
    });
    if (!message) return;

    const now = new Date();
    const updateData: Record<string, unknown> = {};

    if (status === 'DELIVERED') {
      updateData.status = WhatsAppMessageStatus.DELIVERED;
      updateData.deliveredAt = now;
    } else if (status === 'READ') {
      updateData.status = WhatsAppMessageStatus.READ;
      updateData.readAt = now;
    } else if (status === 'FAILED') {
      updateData.status = WhatsAppMessageStatus.FAILED;
      updateData.failedAt = now;
      updateData.errorMessage = (payload.error as string) ?? 'Delivery failed';
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: updateData as Parameters<typeof this.prisma.whatsAppMessage.update>[0]['data'],
      });
    }

    await this.prisma.whatsAppCallback.create({
      data: { messageId, providerPayload: payload as Prisma.InputJsonValue, status },
    });
  }

  async getAnalytics(tenantId: string) {
    const [totalBatches, totalMessages, delivered, failed] = await Promise.all([
      this.prisma.whatsAppBatch.count({ where: { tenantId } }),
      this.prisma.whatsAppMessage.count({ where: { batch: { tenantId } } }),
      this.prisma.whatsAppMessage.count({
        where: { batch: { tenantId }, status: WhatsAppMessageStatus.DELIVERED },
      }),
      this.prisma.whatsAppMessage.count({
        where: { batch: { tenantId }, status: WhatsAppMessageStatus.FAILED },
      }),
    ]);

    const deliveryRate = totalMessages > 0 ? (delivered / totalMessages) * 100 : 0;

    return { totalBatches, totalMessages, delivered, failed, deliveryRate };
  }

  private async assertTemplateExists(tenantId: string, id: string) {
    const t = await this.prisma.whatsAppTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }
}
