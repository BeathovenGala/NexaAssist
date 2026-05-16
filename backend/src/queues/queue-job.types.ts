import type { JobPriority } from './queue-names';

export interface BaseJobPayload {
  tenantId: string;
  dedupeKey?: string;
  priority?: JobPriority;
}

export interface CreateNotificationJobPayload extends BaseJobPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailJobPayload extends BaseJobPayload {
  to: string;
  template: string;
  subject: string;
  context: Record<string, unknown>;
}

export interface ScheduleReminderJobPayload extends BaseJobPayload {
  appointmentId: string;
  scheduledAt: string;
}

export interface ProcessReminderJobPayload extends BaseJobPayload {
  reminderId: string;
}

export interface InventoryNotifyJobPayload extends BaseJobPayload {
  alertId?: string;
  requestId?: string;
  itemId?: string;
  type: 'alert' | 'request';
}

export interface SystemCleanupJobPayload extends BaseJobPayload {
  action: 'cleanup-notifications' | 'scan-reminders';
}
