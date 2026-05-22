import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import {
  bullmqConnectionOptions,
  createRedisClient,
} from '../common/redis/redis-connection';
import { ALL_QUEUE_NAMES, QUEUE_NAMES } from '../queues/queue-names';
import type { AuthUser } from '../types/auth-user';
import { resolveSchedulingTenantId } from '../common/utils/scheduling.util';

@Injectable()
export class OperationsService {
  private readonly queues: Map<string, Queue>;
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    this.redis = createRedisClient(config);
    const connection = bullmqConnectionOptions(config);
    this.queues = new Map();
    for (const name of ALL_QUEUE_NAMES) {
      this.queues.set(name, new Queue(name, { connection }));
    }
  }

  async getHealth(actor: AuthUser) {
    resolveSchedulingTenantId(actor, undefined);

    const heartbeat = await this.redis.get('nexaassist:worker:heartbeat');

    const queueStats = await Promise.all(
      ALL_QUEUE_NAMES.map(async (name) => {
        const q = this.queues.get(name)!;
        const counts = await q.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        );
        return { name, ...counts };
      }),
    );

    return {
      workerHeartbeat: heartbeat,
      workerOnline: Boolean(heartbeat),
      queues: queueStats,
    };
  }

  async listFailedJobs(actor: AuthUser, queueName: string, take = 25) {
    resolveSchedulingTenantId(actor, undefined);
    const q = this.queues.get(queueName);
    if (!q) {
      throw new NotFoundException('Queue not found');
    }
    const jobs = await q.getJobs(['failed'], 0, take - 1, true);
    return {
      items: jobs.map((j) => ({
        id: j.id,
        name: j.name,
        queue: queueName,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        timestamp: j.timestamp,
        data: j.data,
      })),
    };
  }

  async retryJob(actor: AuthUser, queueName: string, jobId: string) {
    resolveSchedulingTenantId(actor, undefined);
    const q = this.queues.get(queueName);
    if (!q) {
      throw new NotFoundException('Queue not found');
    }
    const job = await q.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    await job.retry();
    return { retried: true, jobId };
  }

  async listAllFailed(actor: AuthUser, take = 10) {
    const results = await Promise.all(
      ALL_QUEUE_NAMES.map(async (name) => {
        const data = await this.listFailedJobs(actor, name, take);
        return { queue: name, items: data.items };
      }),
    );
    return { queues: results };
  }
}
