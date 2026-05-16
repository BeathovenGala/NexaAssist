export const QUEUE_NAMES = {
  notifications: 'notifications',
  emails: 'emails',
  appointments: 'appointments',
  inventory: 'inventory',
  system: 'system',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const ALL_QUEUE_NAMES = Object.values(QUEUE_NAMES);

export type JobPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export const PRIORITY_MAP: Record<JobPriority, number> = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: 1000,
  removeOnFail: false,
};
