import { Injectable, Logger } from '@nestjs/common';
import { NotificationPriority, NotificationType } from '@prisma/client';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { QueueProducerService } from '../../queues/queue-producer.service';
import type { InventoryNotifyJobPayload } from '../../queues/queue-job.types';

@Injectable()
export class InventoryProcessor {
  private readonly logger = new Logger(InventoryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly queues: QueueProducerService,
  ) {}

  async process(job: Job<InventoryNotifyJobPayload>): Promise<void> {
    const { tenantId, type } = job.data;
    if (!tenantId) {
      throw new Error('tenantId required');
    }

    const managerIds = await this.notifications.findUsersWithPermission(
      tenantId,
      'inventory:approve',
    );

    if (type === 'alert' && job.data.alertId) {
      const alert = await this.prisma.inventoryAlert.findFirst({
        where: { id: job.data.alertId, tenantId },
        include: { item: true },
      });
      if (!alert) {
        return;
      }
      for (const userId of managerIds) {
        await this.notifications.createForUser({
          tenantId,
          userId,
          type: NotificationType.INVENTORY,
          title: 'Low stock alert',
          message: `${alert.item.name} (${alert.item.sku}) is ${alert.type.replace(/_/g, ' ').toLowerCase()}.`,
          priority: NotificationPriority.HIGH,
          actionUrl: `/dashboard/inventory/items/${alert.itemId}`,
          dedupeKey: `inventory:alert:${alert.id}:${userId}`,
          metadata: { alertId: alert.id, itemId: alert.itemId },
        });
        const user = await this.prisma.user.findFirst({
          where: { id: userId, tenantId },
        });
        if (user?.email) {
          await this.queues.enqueueEmail({
            tenantId,
            to: user.email,
            template: 'inventory-low-stock',
            subject: '',
            context: {
              itemName: alert.item.name,
              sku: alert.item.sku,
              quantity: alert.item.quantity,
            },
            dedupeKey: `email:inventory:alert:${alert.id}:${userId}`,
          });
        }
      }
    }

    if (type === 'request' && job.data.requestId) {
      const request = await this.prisma.inventoryRequest.findFirst({
        where: { id: job.data.requestId, tenantId },
        include: {
          item: true,
          requestedBy: { select: { firstName: true, lastName: true } },
        },
      });
      if (!request) {
        return;
      }
      const requesterName = `${request.requestedBy.firstName} ${request.requestedBy.lastName ?? ''}`.trim();
      for (const userId of managerIds) {
        await this.notifications.createForUser({
          tenantId,
          userId,
          type: NotificationType.REQUEST,
          title: 'New inventory request',
          message: `${requesterName} requested ${request.quantityRequested} × ${request.item.name}.`,
          priority: NotificationPriority.NORMAL,
          actionUrl: `/dashboard/inventory/requests`,
          dedupeKey: `inventory:request:${request.id}:${userId}`,
          metadata: { requestId: request.id },
        });
        const user = await this.prisma.user.findFirst({
          where: { id: userId, tenantId },
        });
        if (user?.email) {
          await this.queues.enqueueEmail({
            tenantId,
            to: user.email,
            template: 'inventory-request',
            subject: '',
            context: {
              itemName: request.item.name,
              quantityRequested: request.quantityRequested,
              requesterName,
            },
            dedupeKey: `email:inventory:request:${request.id}:${userId}`,
          });
        }
      }
    }

    this.logger.log({ jobId: job.id, tenantId, type }, 'Inventory notify processed');
  }
}
