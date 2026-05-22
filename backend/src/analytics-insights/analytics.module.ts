import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventService } from './analytics-event.service';
import { AnalyticsService } from './analytics.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsEventService],
  exports: [AnalyticsEventService],
})
export class AnalyticsInsightsModule {}
