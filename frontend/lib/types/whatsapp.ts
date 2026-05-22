export type WhatsAppMessageStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export type BatchStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PARTIAL";

export interface WhatsAppTemplate {
  id: string;
  tenantId: string;
  name: string;
  content: string;
  variables: string[];
  approved: boolean;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppBatch {
  id: string;
  tenantId: string;
  campaignId: string | null;
  templateId: string | null;
  template: { name: string } | null;
  status: BatchStatus;
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface WhatsAppMessageLog {
  id: string;
  batchId: string;
  tenantId: string;
  recipientPhone: string;
  recipientName: string | null;
  content: string;
  status: WhatsAppMessageStatus;
  externalMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface WhatsAppStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  activeBatches: number;
  scheduledBatches: number;
}

export interface CreateTemplateDto {
  name: string;
  content: string;
}
