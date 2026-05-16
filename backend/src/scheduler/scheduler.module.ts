import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [QueuesModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
