import { supabaseClient } from "../config/supabase.js";
import { AppError } from "../utils/AppError.js";
import { v4 as uuid } from "uuid";
import path from "path";

const BUCKET       = process.env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ✅ Fail fast — don't let the bucket name be undefined at runtime
if (!BUCKET) {
  throw new Error("SUPABASE_STORAGE_BUCKET_ATTACHMENTS environment variable is not set");
}

// Forbidden executable/script extensions — extended list
const FORBIDDEN_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".zsh",
  ".js",  ".mjs", ".cjs",
  ".html", ".htm", ".php", ".py", ".rb", ".pl",
  ".ps1", ".vbs", ".jar", ".app", ".dmg",
]);

export const StorageService = {

  // ─────────────────────────────────────────────
  // Generate a collision-resistant storage path
  // ─────────────────────────────────────────────
  generatePath(workspaceId: string, taskId: string, filename: string): string {
    const cleanName  = filename.replace(/[^a-zA-Z0-9.]/g, "_");
    const ext        = path.extname(cleanName).toLowerCase();
    const datePrefix = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return `${workspaceId}/${taskId}/${datePrefix}-${uuid()}${ext}`;
  },

  // ─────────────────────────────────────────────
  // Upload
  // ─────────────────────────────────────────────
  async upload(file: Express.Multer.File, storagePath: string): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();

    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      throw new AppError(`File type "${ext}" is not allowed`, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("File exceeds the 10MB limit", 400);
    }

    // ✅ Validate MIME type matches extension — prevents disguised uploads
    // e.g. renaming malware.exe to malware.pdf
    const mimeExtMap: Record<string, string[]> = {
      "image/jpeg":       [".jpg", ".jpeg"],
      "image/png":        [".png"],
      "image/gif":        [".gif"],
      "image/webp":       [".webp"],
      "application/pdf":  [".pdf"],
      "text/plain":       [".txt"],
      "text/csv":         [".csv"],
      "application/zip":  [".zip"],
      "video/mp4":        [".mp4"],
      "audio/mpeg":       [".mp3"],
    };

    const allowedExts = mimeExtMap[file.mimetype];
    if (allowedExts && !allowedExts.includes(ext)) {
      throw new AppError("File extension does not match its content type", 400);
    }

    const { error } = await supabaseClient.storage
      .from(BUCKET!)
      .upload(storagePath, file.buffer, {
        contentType:  file.mimetype,
        cacheControl: "3600",
        upsert:       false, // ✅ never silently overwrite an existing file
      });

    if (error) {
      console.error("[StorageService] Upload error:", error.message);
      throw new AppError("Cloud storage upload failed", 502);
    }

    return storagePath;
  },

  // ─────────────────────────────────────────────
  // Delete single file
  // ─────────────────────────────────────────────
  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;

    const { error } = await supabaseClient.storage
      .from(BUCKET!)
      .remove([storagePath]);

    if (error) {
      // Log but don't throw — a missing file in storage shouldn't block
      // the DB soft-delete from completing
      console.error("[StorageService] Delete error:", error.message);
    }
  },

  // ─────────────────────────────────────────────
  // Delete multiple files (used by cleanup job)
  // Supabase storage API handles up to 1000 paths per request,
  // but we batch at 100 to stay well within limits
  // ─────────────────────────────────────────────
  async deleteBulk(storagePaths: string[]): Promise<void> {
    const validPaths = storagePaths.filter(Boolean);
    if (validPaths.length === 0) return;

    const BATCH_SIZE = 100;

    for (let i = 0; i < validPaths.length; i += BATCH_SIZE) {
      const batch = validPaths.slice(i, i + BATCH_SIZE);

      const { error } = await supabaseClient.storage
        .from(BUCKET!)
        .remove(batch);

      if (error) {
        // Log per-batch failure but continue — don't abort the entire cleanup
        // because one batch failed
        console.error(
          `[StorageService] Bulk delete batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
          error.message
        );
      }
    }
  },

  // ─────────────────────────────────────────────
  // Generate signed URLs for multiple paths
  // Returns one URL per path; failed paths return null signedUrl
  // ─────────────────────────────────────────────
  async createSignedUrls(
    storagePaths: string[],
    expiresIn = 3600 // 1 hour default
  ): Promise<{ path: string; signedUrl: string | null }[]> {
    const validPaths = storagePaths.filter(Boolean);
    if (validPaths.length === 0) return [];

    const { data, error } = await supabaseClient.storage
      .from(BUCKET!)
      .createSignedUrls(validPaths, expiresIn);

    if (error) {
      console.error("[StorageService] Signed URL error:", error.message);
      throw new AppError("Failed to generate file access links", 500);
    }

    // Supabase returns { path: string | null, signedUrl: string, error: string | null } per entry.
    // path can be null if Supabase couldn't resolve the file — filter those out.
    return (data ?? [])
      .filter((item): item is typeof item & { path: string } => item.path !== null)
      .map((item) => ({
        path:      item.path,
        signedUrl: item.signedUrl ?? null,
      }));
  },
};