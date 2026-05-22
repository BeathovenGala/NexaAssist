export type CampaignStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SCHEDULED"
  | "ACTIVE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type CampaignObjective =
  | "BRAND_AWARENESS"
  | "LEAD_GENERATION"
  | "SALES_PROMOTION"
  | "CUSTOMER_RETENTION"
  | "EVENT_PROMOTION"
  | "PRODUCT_LAUNCH";

export type CampaignAudienceType =
  | "ALL_CUSTOMERS"
  | "SEGMENT"
  | "CUSTOM_LIST"
  | "APPOINTMENT_HISTORY"
  | "INVENTORY_PURCHASERS";

export type CampaignChannel = "WHATSAPP" | "EMAIL" | "SMS" | "PUSH";

export type PosterSource = "openrouter" | "together" | "pollinations";

export interface GeneratePosterResponse {
  posterUrl: string;
  source: PosterSource;
  /** Detailed ad prompt from OpenRouter, passed to the image model. */
  imagePrompt: string;
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  notes: string | null;
  audienceType: string | null;
  estimatedReach: number | null;
  generatedCopy: string | null;
  posterUrl: string | null;
  channels: CampaignChannel[];
  scheduledAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  createdById: string;
  createdBy: { id: string; email: string; name?: string };
  approvedBy: { id: string; email: string; name?: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListItem {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  scheduledAt: string | null;
  channels: CampaignChannel[];
  posterUrl: string | null;
  createdAt: string;
  createdBy: { email: string };
}

export interface CampaignStats {
  total: number;
  active: number;
  pendingApproval: number;
  scheduled: number;
  completed: number;
  draft: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  deliveryRate: number;
  openRate: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
}

export interface PaginatedCampaigns {
  items: CampaignListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: "APPROVED" | "REJECTED" | "REVISION_REQUESTED" | "SUBMITTED";
  comment: string | null;
  performedBy: { id: string; email: string };
  createdAt: string;
}

export interface CreateCampaignDto {
  name: string;
  objective: CampaignObjective;
  startDate?: string;
  endDate?: string;
  budget?: number;
  notes?: string;
  audienceType?: string;
  channels?: CampaignChannel[];
  scheduledAt?: string;
}
