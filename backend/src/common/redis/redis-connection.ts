import type { ConfigService } from '@nestjs/config';
import Redis, { type RedisOptions } from 'ioredis';

/** Shared ioredis options — fast fail, no offline command queue blocking HTTP. */
export const REDIS_OPTIONS: RedisOptions = {
  connectTimeout: 5_000,
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
};

/** BullMQ requires `maxRetriesPerRequest: null` on dedicated worker connections. */
export const BULLMQ_REDIS_OPTIONS: RedisOptions = {
  ...REDIS_OPTIONS,
  maxRetriesPerRequest: null,
};

export function redisUrlFromConfig(config: ConfigService): string {
  return config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
}

export function createRedisClient(config: ConfigService): Redis {
  return new Redis(redisUrlFromConfig(config), REDIS_OPTIONS);
}

export function bullmqConnectionOptions(config: ConfigService): RedisOptions & {
  url: string;
} {
  return {
    url: redisUrlFromConfig(config),
    connectTimeout: REDIS_OPTIONS.connectTimeout,
    lazyConnect: REDIS_OPTIONS.lazyConnect,
    enableOfflineQueue: REDIS_OPTIONS.enableOfflineQueue,
    maxRetriesPerRequest: null,
  };
}
