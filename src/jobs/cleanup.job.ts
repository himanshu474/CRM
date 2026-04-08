import cron from "node-cron";
import prisma from "../config/prisma.js";
import { StorageService } from "../services/storage.service.js";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const getCutoffDate = () => new Date(Date.now() - RETENTION_MS);

/**
 * Job 1: Purge Storage Files
 * Logic: Fetch storage paths for attachments marked for hard-deletion.
 * Runs: 01:00 UTC
 */
const purgeStorageFiles = async () => {
  console.log("Cleanup: Starting storage file purge...");

  try {
    const cutoff = getCutoffDate();

    const toDelete = await prisma.attachment.findMany({
      where: {
        deletedAt: { lt: cutoff, not: null },
      },
      select: { storagePath: true },
    });

    if (toDelete.length === 0) {
      console.log("Cleanup: No storage files found to delete.");
      return;
    }

    const paths = toDelete.map((a) => a.storagePath).filter(Boolean);

    // Bulk delete from your Storage Provider (S3/Supabase)
    await StorageService.deleteBulk(paths);

    console.log(`Cleanup: Successfully deleted ${paths.length} storage files.`);
  } catch (err) {
    console.error("Cleanup Error: purgeStorageFiles failed", err);
  }
};

/**
 * Job 2: Hard-Delete Database Records
 * Logic: Permanently remove soft-deleted rows older than 30 days.
 * Runs: 02:00 UTC
 */
const purgeDeletedRecords = async () => {
  console.log("Cleanup: Starting hard-delete of database records...");

  try {
    const cutoff = getCutoffDate();

    // Use a transaction to ensure data integrity across related tables
    // Order matters for Foreign Key constraints
    const [
      attachments, 
      tasks, 
      contacts, 
      deals, 
      companies, 
      projects, 
      workspaces
    ] = await prisma.$transaction([
      prisma.attachment.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      prisma.task.deleteMany({       where: { deletedAt: { lt: cutoff } } }),
      prisma.contact.deleteMany({    where: { deletedAt: { lt: cutoff } } }),
      prisma.deal.deleteMany({       where: { deletedAt: { lt: cutoff } } }),
      prisma.company.deleteMany({    where: { deletedAt: { lt: cutoff } } }),
      prisma.project.deleteMany({    where: { deletedAt: { lt: cutoff } } }),
      prisma.workspace.deleteMany({  where: { deletedAt: { lt: cutoff } } }),
    ]);

    console.log("Cleanup: Database purge complete.", {
      attachments: attachments.count,
      tasks: tasks.count,
      contacts: contacts.count,
      deals: deals.count,
      companies: companies.count,
      projects: projects.count,
      workspaces: workspaces.count,
    });
  } catch (err) {
    console.error("Cleanup Error: purgeDeletedRecords failed", err);
  }
};

/**
 * Job 3: Revoke Expired Sessions
 * Logic: Update session status for rows where expiry date has passed.
 * Runs: Hourly
 */
const revokeExpiredSessions = async () => {
  try {
    const { count } = await prisma.session.updateMany({
      where: { 
        isRevoked: false, 
        expiresAt: { lt: new Date() } 
      },
      data: { isRevoked: true },
    });

    if (count > 0) {
      console.log(`Cleanup: Revoked ${count} expired sessions.`);
    }
  } catch (err) {
    console.error("Cleanup Error: revokeExpiredSessions failed", err);
  }
};

/**
 * Register Jobs
 * Call this function once in your main server entry point.
 */
export const registerCleanupJobs = () => {
  // Run daily at 01:00 AM UTC
  cron.schedule("0 1 * * *", purgeStorageFiles, { timezone: "UTC" });

  // Run daily at 02:00 AM UTC
  cron.schedule("0 2 * * *", purgeDeletedRecords, { timezone: "UTC" });

  // Run at minute 0 of every hour
  cron.schedule("0 * * * *", revokeExpiredSessions, { timezone: "UTC" });

  console.log("Cleanup system initialized: Cron jobs scheduled.");
};
