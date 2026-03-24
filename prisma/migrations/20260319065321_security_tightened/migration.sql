/*
  Warnings:

  - The values [PENDING] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `field` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `newValue` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `oldValue` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `invitedAt` on the `WorkspaceMember` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Made the column `joinedAt` on table `WorkspaceMember` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "TaskPriority" ADD VALUE 'URGENT';

-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED');
ALTER TABLE "public"."Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO';
COMMIT;

-- DropIndex
DROP INDEX "ActivityLog_userId_idx";

-- DropIndex
DROP INDEX "Attachment_deletedAt_idx";

-- DropIndex
DROP INDEX "Attachment_uploadedBy_idx";

-- DropIndex
DROP INDEX "EmailVerificationToken_userId_key";

-- DropIndex
DROP INDEX "PasswordResetToken_expiresAt_idx";

-- DropIndex
DROP INDEX "Project_deletedAt_idx";

-- DropIndex
DROP INDEX "Session_expiresAt_idx";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "Task_priority_idx";

-- DropIndex
DROP INDEX "TaskDependency_predecessorId_idx";

-- DropIndex
DROP INDEX "TaskDependency_successorId_idx";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "field",
DROP COLUMN "newValue",
DROP COLUMN "oldValue",
ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "creatorId" TEXT NOT NULL,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'TODO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WorkspaceMember" DROP COLUMN "invitedAt",
ALTER COLUMN "joinedAt" SET NOT NULL,
ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
