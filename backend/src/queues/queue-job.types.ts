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

export interface CampaignAiCopyJobPayload extends BaseJobPayload {
  campaignId: string;
  tone?: string;
  targetAudience?: string;
  additionalContext?: string;
}

export interface CampaignPosterJobPayload extends BaseJobPayload {
  campaignId: string;
  context?: string;
}

export interface CampaignExecutionJobPayload extends BaseJobPayload {
  campaignId: string;
  executionId: string;
}

export interface CampaignAnalyticsSyncJobPayload extends BaseJobPayload {
  campaignId: string;
}

export interface WhatsAppSendJobPayload extends BaseJobPayload {
  batchId: string;
}

export interface WhatsAppRetryJobPayload extends BaseJobPayload {
  batchId: string;
  messageIds: string[];
}

export interface WhatsAppCallbackJobPayload extends BaseJobPayload {
  messageId: string;
  providerPayload: Record<string, unknown>;
  status: string;
}

export interface SeoScanJobPayload extends BaseJobPayload {
  scanId: string;
  projectId: string;
  baseUrl: string;
}

export interface SeoPageAnalysisJobPayload extends BaseJobPayload {
  scanId: string;
  pageId: string;
}

export interface SeoAiRecommendationJobPayload extends BaseJobPayload {
  scanId: string;
  pageId: string;
}

export interface SeoReportExportJobPayload extends BaseJobPayload {
  scanId: string;
}

export interface AnalyticsAggregationJobPayload extends BaseJobPayload {
  date?: string;
}

export interface AnalyticsInsightGenerationJobPayload extends BaseJobPayload {
  module?: string;
}
