export type DateRange = "7d" | "30d" | "90d" | "custom";

export interface GlobalKpis {
  appointments: number;
  revenue: number;
  campaignsSent: number;
  messagesDelivered: number;
  periodLabel: string;
}

export interface AiInsight {
  id: string;
  title: string;
  insight: string;
  module: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  generatedAt: string;
}

export interface AppointmentAnalytics {
  total: number;
  confirmed: number;
  confirmedRate: number;
  cancelled: number;
  cancellationRate: number;
  noShows: number;
  noShowRate: number;
  byServiceType: Array<{ serviceType: string; count: number }>;
  byStaff: Array<{ staffName: string; count: number }>;
  byHour: Array<{ hour: number; count: number }>;
}

export interface InventoryAnalytics {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  topMovingItems: Array<{ itemName: string; movements: number }>;
  stockMovementByDay: Array<{ date: string; inflow: number; outflow: number }>;
}

export interface CampaignAnalyticsSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  deliveryRate: number;
  topCampaigns: Array<{
    id: string;
    name: string;
    deliveryRate: number;
    totalSent: number;
    conversions: number;
  }>;
  byChannel: Array<{ channel: string; count: number; deliveryRate: number }>;
}

export interface ChatbotAnalytics {
  totalConversations: number;
  resolved: number;
  escalated: number;
  avgSessionDuration: number;
  intentBreakdown: Array<{ intent: string; count: number }>;
  sessionsByDay: Array<{ date: string; count: number }>;
}

export interface SeoAnalyticsSummary {
  avgScore: number | null;
  totalScans: number;
  issuesResolved: number;
  newIssues: number;
  scoreByDay: Array<{ date: string; score: number }>;
  topIssueTypes: Array<{ type: string; count: number }>;
}
