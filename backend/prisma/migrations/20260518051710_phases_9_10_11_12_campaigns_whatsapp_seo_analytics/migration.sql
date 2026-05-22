-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'PAUSED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('BRAND_AWARENESS', 'LEAD_GENERATION', 'SALES_PROMOTION', 'CUSTOMER_RETENTION', 'EVENT_PROMOTION', 'PRODUCT_LAUNCH');

-- CreateEnum
CREATE TYPE "CampaignAudienceType" AS ENUM ('ALL_CUSTOMERS', 'SEGMENT', 'CUSTOM_LIST', 'APPOINTMENT_HISTORY', 'INVENTORY_PURCHASERS');

-- CreateEnum
CREATE TYPE "CampaignAssetType" AS ENUM ('POSTER', 'BANNER', 'IMAGE', 'VIDEO', 'COPY_TEXT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WhatsAppBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeoScanStatus" AS ENUM ('QUEUED', 'CRAWLING', 'ANALYZING', 'GENERATING_REPORT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SeoIssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "SeoIssueType" AS ENUM ('MISSING_TITLE', 'MISSING_META_DESCRIPTION', 'DUPLICATE_CONTENT', 'BROKEN_LINK', 'MISSING_ALT_TEXT', 'SLOW_PAGE_SPEED', 'MISSING_H1', 'DUPLICATE_H1', 'MISSING_CANONICAL', 'REDIRECT_CHAIN', 'LARGE_PAGE_SIZE', 'MISSING_STRUCTURED_DATA');

-- CreateEnum
CREATE TYPE "AnalyticsModule" AS ENUM ('APPOINTMENTS', 'INVENTORY', 'CAMPAIGNS', 'WHATSAPP', 'CHATBOT', 'SEO', 'GENERAL');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "budget" DECIMAL(10,2),
    "audienceType" "CampaignAudienceType" NOT NULL DEFAULT 'ALL_CUSTOMERS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAudience" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "audienceRuleJson" JSONB NOT NULL,
    "estimatedReach" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "CampaignAssetType" NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignApproval" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSchedule" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignExecution" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAnalytics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "deliveryRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variablesJson" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "WhatsAppBatchStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "templateId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppCallback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppCallback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoScan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "SeoScanStatus" NOT NULL DEFAULT 'QUEUED',
    "pagesFound" INTEGER NOT NULL DEFAULT 0,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoPage" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "metaDescription" TEXT,
    "h1" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "statusCode" INTEGER NOT NULL DEFAULT 200,
    "loadTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoIssue" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "SeoIssueType" NOT NULL,
    "severity" "SeoIssueSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoRecommendation" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoLighthouseResult" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "performance" INTEGER NOT NULL DEFAULT 0,
    "accessibility" INTEGER NOT NULL DEFAULT 0,
    "seoScore" INTEGER NOT NULL DEFAULT 0,
    "bestPractices" INTEGER NOT NULL DEFAULT 0,
    "rawResultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoLighthouseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoReport" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "reportUrl" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDailyMetric" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(15,4) NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "AnalyticsDailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "AnalyticsModule" NOT NULL,
    "title" TEXT NOT NULL,
    "insight" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignExecution_campaignId_idx" ON "CampaignExecution"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignExecution_status_idx" ON "CampaignExecution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAnalytics_campaignId_key" ON "CampaignAnalytics"("campaignId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_tenantId_idx" ON "WhatsAppTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppBatch_tenantId_idx" ON "WhatsAppBatch"("tenantId");

-- CreateIndex
CREATE INDEX "WhatsAppBatch_status_idx" ON "WhatsAppBatch"("status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_batchId_idx" ON "WhatsAppMessage"("batchId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_status_idx" ON "WhatsAppMessage"("status");

-- CreateIndex
CREATE INDEX "WhatsAppCallback_messageId_idx" ON "WhatsAppCallback"("messageId");

-- CreateIndex
CREATE INDEX "SeoProject_tenantId_idx" ON "SeoProject"("tenantId");

-- CreateIndex
CREATE INDEX "SeoScan_projectId_idx" ON "SeoScan"("projectId");

-- CreateIndex
CREATE INDEX "SeoPage_scanId_idx" ON "SeoPage"("scanId");

-- CreateIndex
CREATE INDEX "SeoIssue_pageId_idx" ON "SeoIssue"("pageId");

-- CreateIndex
CREATE INDEX "SeoIssue_severity_idx" ON "SeoIssue"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "SeoLighthouseResult_pageId_key" ON "SeoLighthouseResult"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoReport_scanId_key" ON "SeoReport"("scanId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_idx" ON "AnalyticsEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_module_idx" ON "AnalyticsEvent"("module");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_idx" ON "AnalyticsEvent"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsDailyMetric_tenantId_module_idx" ON "AnalyticsDailyMetric"("tenantId", "module");

-- CreateIndex
CREATE INDEX "AnalyticsDailyMetric_date_idx" ON "AnalyticsDailyMetric"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDailyMetric_tenantId_module_metric_date_key" ON "AnalyticsDailyMetric"("tenantId", "module", "metric", "date");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_tenantId_module_idx" ON "AnalyticsSnapshot"("tenantId", "module");

-- CreateIndex
CREATE INDEX "AnalyticsInsight_tenantId_idx" ON "AnalyticsInsight"("tenantId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAudience" ADD CONSTRAINT "CampaignAudience_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAsset" ADD CONSTRAINT "CampaignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMessage" ADD CONSTRAINT "CampaignMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApproval" ADD CONSTRAINT "CampaignApproval_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApproval" ADD CONSTRAINT "CampaignApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApproval" ADD CONSTRAINT "CampaignApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSchedule" ADD CONSTRAINT "CampaignSchedule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignExecution" ADD CONSTRAINT "CampaignExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAnalytics" ADD CONSTRAINT "CampaignAnalytics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBatch" ADD CONSTRAINT "WhatsAppBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppBatch" ADD CONSTRAINT "WhatsAppBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "WhatsAppBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppCallback" ADD CONSTRAINT "WhatsAppCallback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoProject" ADD CONSTRAINT "SeoProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoScan" ADD CONSTRAINT "SeoScan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SeoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoPage" ADD CONSTRAINT "SeoPage_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "SeoScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoIssue" ADD CONSTRAINT "SeoIssue_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoRecommendation" ADD CONSTRAINT "SeoRecommendation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoLighthouseResult" ADD CONSTRAINT "SeoLighthouseResult_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoReport" ADD CONSTRAINT "SeoReport_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "SeoScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsDailyMetric" ADD CONSTRAINT "AnalyticsDailyMetric_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsInsight" ADD CONSTRAINT "AnalyticsInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
