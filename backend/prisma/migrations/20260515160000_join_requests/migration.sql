-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TenantJoinRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantJoinRequest_tenantId_idx" ON "TenantJoinRequest"("tenantId");

-- CreateIndex
CREATE INDEX "TenantJoinRequest_userId_idx" ON "TenantJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "TenantJoinRequest_tenantId_status_idx" ON "TenantJoinRequest"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "TenantJoinRequest" ADD CONSTRAINT "TenantJoinRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantJoinRequest" ADD CONSTRAINT "TenantJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
