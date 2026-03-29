/*
  Warnings:

  - You are about to alter the column `value` on the `Deal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- DropIndex
DROP INDEX "Contact_workspaceId_idx";

-- DropIndex
DROP INDEX "Deal_workspaceId_idx";

-- AlterTable
ALTER TABLE "Deal" ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30);

-- CreateIndex
CREATE INDEX "Attachment_deletedAt_idx" ON "Attachment"("deletedAt");

-- CreateIndex
CREATE INDEX "Company_workspaceId_ownerId_idx" ON "Company"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "Company_deletedAt_idx" ON "Company"("deletedAt");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_ownerId_idx" ON "Contact"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "Contact_workspaceId_email_idx" ON "Contact"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");

-- CreateIndex
CREATE INDEX "Deal_workspaceId_status_idx" ON "Deal"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Deal_workspaceId_ownerId_idx" ON "Deal"("workspaceId", "ownerId");

-- CreateIndex
CREATE INDEX "Deal_deletedAt_idx" ON "Deal"("deletedAt");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "Task_dealId_idx" ON "Task"("dealId");

-- CreateIndex
CREATE INDEX "Task_contactId_idx" ON "Task"("contactId");
