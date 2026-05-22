import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsModule } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsEventService {
  private readonly logger = new Logger(AnalyticsEventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emit(
    tenantId: string,
    type: string,
    module: AnalyticsModule,
    payload: object,
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          tenantId,
          type,
          module,
          payloadJson: payload,
        },
      });
    } catch (err) {
      this.logger.error({ err, tenantId, type, module }, 'Failed to emit analytics event');
    }
  }
}
