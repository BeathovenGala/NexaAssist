-- AlterEnum
ALTER TYPE "RoleName" ADD VALUE 'CHATBOT_EXEC';

-- CreateEnum
CREATE TYPE "ChatMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');
CREATE TYPE "ChatSessionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ConversationWorkflow" AS ENUM ('NONE', 'BOOK_APPOINTMENT', 'RESCHEDULE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'DOCTOR_SCHEDULE_QUERY', 'INVENTORY_LOOKUP', 'INVENTORY_CREATE', 'INVENTORY_REQUEST', 'USER_CREATE', 'PENDING_CONFIRMATION');
CREATE TYPE "ChatAuditAction" AS ENUM ('INTENT_DETECTED', 'SLOT_UPDATED', 'TOOL_CALLED', 'TOOL_DENIED', 'CONFIRMED', 'CANCELLED', 'ERROR');
CREATE TYPE "EscalationTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ChatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationState" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workflow" "ConversationWorkflow" NOT NULL DEFAULT 'NONE',
    "step" TEXT NOT NULL DEFAULT 'idle',
    "slots" JSONB NOT NULL DEFAULT '{}',
    "missingSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION,
    "pendingTool" TEXT,
    "pendingPayload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatToolCall" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatToolCall_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatAuditLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "ChatAuditAction" NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscalationTicket" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "EscalationTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscalationMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationState_sessionId_key" ON "ConversationState"("sessionId");
CREATE INDEX "ChatSession_tenantId_userId_idx" ON "ChatSession"("tenantId", "userId");
CREATE INDEX "ChatSession_tenantId_updatedAt_idx" ON "ChatSession"("tenantId", "updatedAt");
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
CREATE INDEX "ChatToolCall_sessionId_idx" ON "ChatToolCall"("sessionId");
CREATE INDEX "ChatToolCall_tenantId_createdAt_idx" ON "ChatToolCall"("tenantId", "createdAt");
CREATE INDEX "ChatAuditLog_sessionId_idx" ON "ChatAuditLog"("sessionId");
CREATE INDEX "ChatAuditLog_tenantId_createdAt_idx" ON "ChatAuditLog"("tenantId", "createdAt");
CREATE INDEX "EscalationTicket_tenantId_status_idx" ON "EscalationTicket"("tenantId", "status");
CREATE INDEX "EscalationTicket_sessionId_idx" ON "EscalationTicket"("sessionId");
CREATE INDEX "EscalationMessage_ticketId_createdAt_idx" ON "EscalationMessage"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationState" ADD CONSTRAINT "ConversationState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatToolCall" ADD CONSTRAINT "ChatToolCall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatAuditLog" ADD CONSTRAINT "ChatAuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalationTicket" ADD CONSTRAINT "EscalationTicket_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscalationMessage" ADD CONSTRAINT "EscalationMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "EscalationTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
