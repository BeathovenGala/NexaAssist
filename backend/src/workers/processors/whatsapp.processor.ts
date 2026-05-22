import { Injectable, Logger } from '@nestjs/common';
import { Prisma, WhatsAppBatchStatus, WhatsAppMessageStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppSendProvider } from '../../whatsapp/whatsapp-send.provider';
import type {
  WhatsAppCallbackJobPayload,
  WhatsAppRetryJobPayload,
  WhatsAppSendJobPayload,
} from '../../queues/queue-job.types';

const CHUNK_SIZE = 50;

@Injectable()
export class WhatsAppProcessor {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppSend: WhatsAppSendProvider,
  ) {}

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'whatsapp-send':
        await this.processSend(job as Job<WhatsAppSendJobPayload>);
        break;
      case 'whatsapp-retry':
        await this.processRetry(job as Job<WhatsAppRetryJobPayload>);
        break;
      case 'whatsapp-callback':
        await this.processCallback(job as Job<WhatsAppCallbackJobPayload>);
        break;
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown WhatsApp job');
    }
  }

  private async processSend(job: Job<WhatsAppSendJobPayload>): Promise<void> {
    const { batchId, tenantId } = job.data;

    await this.prisma.whatsAppBatch.update({
      where: { id: batchId },
      data: { status: WhatsAppBatchStatus.PROCESSING, startedAt: new Date() },
    });

    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { batchId, status: WhatsAppMessageStatus.QUEUED },
      select: { id: true, recipientPhone: true, content: true },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (msg) => {
          try {
            const sendResult = await this.whatsAppSend.sendMessage(
              msg.recipientPhone,
              msg.content,
            );
            if (sendResult.mode === 'meta') {
              this.logger.debug(
                { messageId: msg.id, providerMessageId: sendResult.providerMessageId },
                'WhatsApp message sent via Meta API',
              );
            }
            await this.prisma.whatsAppMessage.update({
              where: { id: msg.id },
              data: { status: WhatsAppMessageStatus.SENT, sentAt: new Date() },
            });
            sentCount++;
          } catch {
            await this.prisma.whatsAppMessage.update({
              where: { id: msg.id },
              data: {
                status: WhatsAppMessageStatus.FAILED,
                failedAt: new Date(),
                errorMessage: 'Send failed',
              },
            });
            failedCount++;
          }
        }),
      );
    }

    await this.prisma.whatsAppBatch.update({
      where: { id: batchId },
      data: {
        status: WhatsAppBatchStatus.COMPLETED,
        sentCount,
        failedCount,
        completedAt: new Date(),
      },
    });

    this.logger.log({ batchId, tenantId, sentCount, failedCount }, 'WhatsApp batch completed');
  }

  private async processRetry(job: Job<WhatsAppRetryJobPayload>): Promise<void> {
    const { batchId, messageIds } = job.data;
    let sentCount = 0;

    for (const messageId of messageIds) {
      const msg = await this.prisma.whatsAppMessage.findUnique({ where: { id: messageId } });
      if (!msg) continue;

      try {
        await this.whatsAppSend.sendMessage(msg.recipientPhone, msg.content);
        await this.prisma.whatsAppMessage.update({
          where: { id: messageId },
          data: { status: WhatsAppMessageStatus.SENT, sentAt: new Date(), errorMessage: null },
        });
        sentCount++;
      } catch {
        // Keep as failed
      }
    }

    await this.prisma.whatsAppBatch.update({
      where: { id: batchId },
      data: { sentCount: { increment: sentCount } },
    });

    this.logger.log({ batchId, retried: sentCount }, 'WhatsApp retry complete');
  }

  private async processCallback(job: Job<WhatsAppCallbackJobPayload>): Promise<void> {
    const { messageId, status, providerPayload } = job.data;

    const updateData: Record<string, unknown> = {};
    const now = new Date();

    if (status === 'DELIVERED') {
      updateData.status = WhatsAppMessageStatus.DELIVERED;
      updateData.deliveredAt = now;
      await this.prisma.whatsAppBatch
        .findFirst({ where: { messages: { some: { id: messageId } } } })
        .then((batch) => {
          if (batch) {
            return this.prisma.whatsAppBatch.update({
              where: { id: batch.id },
              data: { deliveredCount: { increment: 1 } },
            });
          }
        });
    } else if (status === 'READ') {
      updateData.status = WhatsAppMessageStatus.READ;
      updateData.readAt = now;
    } else if (status === 'FAILED') {
      updateData.status = WhatsAppMessageStatus.FAILED;
      updateData.failedAt = now;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.whatsAppMessage.update({
        where: { id: messageId },
        data: updateData as Parameters<typeof this.prisma.whatsAppMessage.update>[0]['data'],
      });
    }

    await this.prisma.whatsAppCallback.create({
      data: { messageId, providerPayload: providerPayload as Prisma.InputJsonValue, status },
    });
  }

}
