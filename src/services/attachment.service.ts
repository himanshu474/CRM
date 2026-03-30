import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { StorageService } from "./storage.service.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";
import { WorkspaceRole } from "@prisma/client";

export const AttachmentService = {
  /**
   * 📤 Upload Attachment
   * Already atomic: if DB fails, storage is cleaned.
   */
  async upload(workspaceId: string, taskId: string, userId: string, file: Express.Multer.File) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId, deletedAt: null },
      select: { id: true },
    });

    if (!task) throw new AppError("Task not found or access denied", 404);

    const storagePath = StorageService.generatePath(workspaceId, taskId, file.originalname);
    let fileWasUploaded = false;

    try {
      await StorageService.upload(file, storagePath);
      fileWasUploaded = true;

      return await prisma.$transaction(async (tx) => {
        const newAttachment = await tx.attachment.create({
          data: {
            workspaceId,
            taskId,
            uploadedBy: userId,
            fileName: file.originalname,
            fileUrl: "", 
            storagePath,
            fileType: file.mimetype,
            fileSize: file.size,
          },
        });

        await logAuditEvent({
          workspaceId,
          userId,
          taskId,
          action: "ATTACHMENT_UPLOADED",
          metadata: { fileName: file.originalname, size: file.size },
        });

        return newAttachment;
      });
    } catch (error) {
      if (fileWasUploaded) await StorageService.delete(storagePath);
      throw error instanceof AppError ? error : new AppError("Upload failed", 500);
    }
  },

  /**
   * 📥 Get All Attachments
   * Optimized with Batch Signed URLs.
   */
  async getAll(workspaceId: string, taskId: string) {
    const attachments = await prisma.attachment.findMany({
      where: { workspaceId, taskId, deletedAt: null },
      include: {
        uploader: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!attachments.length) return [];

    const paths = attachments.map(a => a.storagePath);
    const signedData = await StorageService.createSignedUrls(paths);

    return attachments.map(a => ({
      ...a,
      fileUrl: signedData.find(s => s.path === a.storagePath)?.signedUrl || ""
    }));
  },

  /**
   * 🗑️ Delete Attachment
   * 🔥 PRODUCTION UPDATE: Transactional deletion.
   */
  async delete(attachmentId: string, userId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId, deletedAt: null },
    });

    if (!attachment) throw new AppError("Attachment not found", 404);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: attachment.workspaceId, userId } },
    });

    if (membership?.role !== WorkspaceRole.ADMIN && attachment.uploadedBy !== userId) {
      throw new AppError("Forbidden: Access denied", 403);
    }

    // 1. Delete from physical storage first
    await StorageService.delete(attachment.storagePath);

    // 2. Atomic DB Update + Audit Log
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.attachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date() },
      });

      await logAuditEvent({
        workspaceId: attachment.workspaceId,
        userId,
        taskId: attachment.taskId,
        action: "ATTACHMENT_DELETED",
        metadata: { fileName: attachment.fileName },
      });

      return updated;
    });
  },
};
