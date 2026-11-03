-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANDISER', 'SUPERVISOR', 'BUYER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('ON_TRACK', 'AT_RISK', 'DELAYED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "productionUnitId" TEXT,
    "buyerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "styleName" TEXT NOT NULL,
    "description" TEXT,
    "colour" TEXT NOT NULL,
    "sizes" JSONB NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "productionUnitId" TEXT NOT NULL,
    "exFactoryDate" TIMESTAMP(3) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'ON_TRACK',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "plannedStartDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "plannedQuantity" INTEGER NOT NULL,
    "completedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionUpdate" (
    "id" TEXT NOT NULL,
    "orderStageId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "originalNote" TEXT,
    "aiCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "correctedCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPhoto" (
    "id" TEXT NOT NULL,
    "productionUpdateId" TEXT,
    "orderId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerAccessToken" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Buyer_name_idx" ON "Buyer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUnit_name_key" ON "ProductionUnit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_poNumber_key" ON "ProductionOrder"("poNumber");

-- CreateIndex
CREATE INDEX "ProductionOrder_buyerId_idx" ON "ProductionOrder"("buyerId");

-- CreateIndex
CREATE INDEX "ProductionOrder_productionUnitId_idx" ON "ProductionOrder"("productionUnitId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_exFactoryDate_idx" ON "ProductionOrder"("exFactoryDate");

-- CreateIndex
CREATE INDEX "ProductionOrder_riskLevel_idx" ON "ProductionOrder"("riskLevel");

-- CreateIndex
CREATE INDEX "OrderStage_orderId_idx" ON "OrderStage"("orderId");

-- CreateIndex
CREATE INDEX "OrderStage_status_idx" ON "OrderStage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStage_orderId_stageName_key" ON "OrderStage"("orderId", "stageName");

-- CreateIndex
CREATE INDEX "ProductionUpdate_orderStageId_idx" ON "ProductionUpdate"("orderStageId");

-- CreateIndex
CREATE INDEX "ProductionUpdate_supervisorId_idx" ON "ProductionUpdate"("supervisorId");

-- CreateIndex
CREATE INDEX "ProductionUpdate_date_idx" ON "ProductionUpdate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionUpdate_orderStageId_supervisorId_date_key" ON "ProductionUpdate"("orderStageId", "supervisorId", "date");

-- CreateIndex
CREATE INDEX "ProductionPhoto_orderId_idx" ON "ProductionPhoto"("orderId");

-- CreateIndex
CREATE INDEX "ProductionPhoto_productionUpdateId_idx" ON "ProductionPhoto"("productionUpdateId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerAccessToken_token_key" ON "BuyerAccessToken"("token");

-- CreateIndex
CREATE INDEX "BuyerAccessToken_token_idx" ON "BuyerAccessToken"("token");

-- CreateIndex
CREATE INDEX "BuyerAccessToken_buyerId_idx" ON "BuyerAccessToken"("buyerId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_productionUnitId_fkey" FOREIGN KEY ("productionUnitId") REFERENCES "ProductionUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_productionUnitId_fkey" FOREIGN KEY ("productionUnitId") REFERENCES "ProductionUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStage" ADD CONSTRAINT "OrderStage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdate" ADD CONSTRAINT "ProductionUpdate_orderStageId_fkey" FOREIGN KEY ("orderStageId") REFERENCES "OrderStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionUpdate" ADD CONSTRAINT "ProductionUpdate_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPhoto" ADD CONSTRAINT "ProductionPhoto_productionUpdateId_fkey" FOREIGN KEY ("productionUpdateId") REFERENCES "ProductionUpdate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPhoto" ADD CONSTRAINT "ProductionPhoto_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerAccessToken" ADD CONSTRAINT "BuyerAccessToken_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
