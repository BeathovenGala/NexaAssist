import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

export type DependencyStatus = 'ok' | 'error';

export type HealthCheckResult = {
  status: 'ok' | 'degraded';
  service: string;
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  workerOnline: boolean;
  errors?: string[];
};

@Injectable()
export class HealthService implements OnModuleDestroy {
  private redis: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getRedis(): Redis {
    if (!this.redis) {
      const url =
        this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });
    }
    return this.redis;
  }

  async check(): Promise<HealthCheckResult> {
    const errors: string[] = [];
    let database: DependencyStatus = 'ok';
    let redisStatus: DependencyStatus = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      database = 'error';
      errors.push(
        `database: ${err instanceof Error ? err.message : 'unreachable'}`,
      );
    }

    try {
      const client = this.getRedis();
      if (client.status !== 'ready') {
        await client.connect();
      }
      const pong = await client.ping();
      if (pong !== 'PONG') {
        throw new Error(`unexpected ping response: ${pong}`);
      }
    } catch (err) {
      redisStatus = 'error';
      errors.push(
        `redis: ${err instanceof Error ? err.message : 'unreachable'}`,
      );
    }

    let workerOnline = false;
    if (redisStatus === 'ok') {
      try {
        const heartbeat = await this.getRedis().get(
          'nexaassist:worker:heartbeat',
        );
        workerOnline = Boolean(heartbeat);
      } catch {
        /* heartbeat optional for API liveness */
      }
    }

    const checks = { database, redis: redisStatus };
    const allOk = database === 'ok' && redisStatus === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      service: 'nexaassist-api',
      checks,
      workerOnline,
      ...(errors.length > 0 ? { errors } : {}),
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}
