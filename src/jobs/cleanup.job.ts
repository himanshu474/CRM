import cron from "node-cron";
import prisma from "../config/prisma.js";
import { StorageService } from "../services/storage.service.js";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const cutoff = () => new Date(Date.now() - RETENTION_MS);

// ─────────────────────────────────────────────
// Job 1 — Purge soft-deleted records older than 30 days
// Runs: daily at 02:00 UTC
// ─────────────────────────────────────────────

const purgeDeletedRecords = async () => {
  console.log(" Cleanup: purging soft-deleted records...");

  try {
    const c = cutoff();

    // ✅ Children before parents — FK constraints require this order:
    // Attachment → Task → Contact → Deal → Company → Project → Workspace
    const [attachments, tasks, contacts, deals, companies, projects, workspaces] =
      await prisma.$transaction([
        prisma.attachment.deleteMany({ where: { deletedAt: { lt: c } } }),
        prisma.task.deleteMany({       where: { deletedAt: { lt: c } } }),
        prisma.contact.deleteMany({    where: { deletedAt: { lt: c } } }),
        prisma.deal.deleteMany({       where: { deletedAt: { lt: c } } }),
        prisma.company.deleteMany({    where: { deletedAt: { lt: c } } }),
        prisma.project.deleteMany({    where: { deletedAt: { lt: c } } }),
        prisma.workspace.deleteMany({  where: { deletedAt: { lt: c } } }),
      ]);

    console.log("✅ Purge complete:", {
      attachments: attachments.count,
      tasks:       tasks.count,
      contacts:    contacts.count,
      deals:       deals.count,
      companies:   companies.count,
      projects:    projects.count,
      workspaces:  workspaces.count,
    });
  } catch (err) {
    console.error("❌ Cleanup: purgeDeletedRecords failed:", err);
  }
};

// ─────────────────────────────────────────────
// Job 2 — Delete storage files for soft-deleted attachments
//          BEFORE their DB rows are hard-deleted by Job 1
// Runs: daily at 01:00 UTC (1 hour before purgeDeletedRecords)
// ─────────────────────────────────────────────

const purgeStorageFiles = async () => {
  console.log("🧹 Cleanup: deleting storage files for soft-deleted attachments...");

  try {
    // ✅ Fetch soft-deleted attachments that still have files in storage.
    // These are attachments past the cutoff — same window as purgeDeletedRecords.
    // We delete storage files here so Job 1 can safely hard-delete the DB rows.
    const toDelete = await prisma.attachment.findMany({
      where: {
        deletedAt: { lt: cutoff(), not: null }, // soft-deleted AND past retention
      },
      select: { storagePath: true },
    });

    if (toDelete.length === 0) {
      console.log("✅ No storage files to delete");
      return;
    }

    const paths = toDelete.map((a) => a.storagePath).filter(Boolean);

    // ✅ Bulk delete via StorageService — batched internally
    await StorageService.deleteBulk(paths);

    console.log(`✅ Storage files deleted: ${paths.length}`);
  } catch (err) {
    console.error("❌ Cleanup: purgeStorageFiles failed:", err);
  }
};

// ─────────────────────────────────────────────
// Job 3 — Revoke expired sessions
// Runs: every hour
// ─────────────────────────────────────────────

const revokeExpiredSessions = async () => {
  try {
    const { count } = await prisma.session.updateMany({
      where:  { isRevoked: false, expiresAt: { lt: new Date() } },
      data:   { isRevoked: true },
    });

    if (count > 0) console.log(`✅ Expired sessions revoked: ${count}`);
  } catch (err) {
    console.error("❌ Cleanup: revokeExpiredSessions failed:", err);
  }
};

// ─────────────────────────────────────────────
// Register — call once from server entry point
// ─────────────────────────────────────────────

export const registerCleanupJobs = () => {
  cron.schedule("0 1 * * *", purgeStorageFiles,    { timezone: "UTC" }); // 01:00 — files first
  cron.schedule("0 2 * * *", purgeDeletedRecords,  { timezone: "UTC" }); // 02:00 — then DB rows
  cron.schedule("0 * * * *", revokeExpiredSessions, { timezone: "UTC" }); // every hour

  console.log("✅ Cleanup jobs registered");
};