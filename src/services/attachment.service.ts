import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { supabase } from "../config/supabase.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { logAuditEvent } from "../utils/security/audit.utils.js";
import { WorkspaceRole } from "@prisma/client";

export const AttachmentService = {
  async upload(workspaceId: string, taskId: string, userId: string, file: Express.Multer.File) {
    // 1. Verify task existence and workspace alignment
    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { workspaceId: true, projectId: true },
    });

    if (!task || task.workspaceId !== workspaceId) {
      throw new AppError("Task not found or access denied", 404);
    }

    // 2. Generate path: workspace/project/task/uuid.ext
    const ext = path.extname(file.originalname);
    const storagePath = `${workspaceId}/${task.projectId}/${taskId}/${uuidv4()}${ext}`;

    // 3. Supabase Upload
    const { error: uploadError } = await supabase.storage
      .from("Attachments")
      .upload(storagePath, file.buffer, { 
        contentType: file.mimetype,
        upsert: false 
      });

    if (uploadError) throw new AppError(`Upload failed: ${uploadError.message}`, 500);

    // 4. Generate Signed URL (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("Attachments")
      .createSignedUrl(storagePath, 3600);

    if (urlError || !signedUrlData?.signedUrl) {
      await supabase.storage.from("Attachments").remove([storagePath]); // Cleanup orphans
      throw new AppError("Failed to generate file access URL", 500);
    }

    // 5. Database Entry (Matches your Schema)
    const attachment = await prisma.attachment.create({
      data: {
        workspaceId,
        taskId,
        uploadedBy: userId, // Maps to 'uploader' in your schema
        fileName: file.originalname,
        fileUrl: signedUrlData.signedUrl,
        storagePath: storagePath,
        fileType: file.mimetype,
        fileSize: file.size,
      },
    });

    // 6. Audit Log (Matches ActivityLog model)
    await logAuditEvent({
      workspaceId,
      userId,
      taskId,
      action: "ATTACHMENT_UPLOADED",
      metadata: { 
        fileName: file.originalname,
        size: file.size,
        type: file.mimetype 
      },
    });

    return attachment;
  },

  async getAll(workspaceId: string, taskId: string) {
    return prisma.attachment.findMany({
      where: { 
        workspaceId, 
        taskId, 
        deletedAt: null 
      },
      include: {
        uploader: { // Relation from your schema
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },

  async delete(attachmentId: string, userId: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId, deletedAt: null },
    });

    if (!attachment) throw new AppError("Attachment not found", 404);

    // Permission Check: Admin or the person who uploaded it
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: attachment.workspaceId, userId } },
    });

    const isAdmin = membership?.role === WorkspaceRole.ADMIN;
    const isOwner = attachment.uploadedBy === userId;

    if (!isAdmin && !isOwner) {
      throw new AppError("Forbidden: You cannot delete this attachment", 403);
    }

    // Storage Removal
    await supabase.storage.from("Attachments").remove([attachment.storagePath]);

    // Soft Delete
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });

    // Audit Log
    await logAuditEvent({
      workspaceId: attachment.workspaceId,
      userId,
      taskId: attachment.taskId,
      action: "ATTACHMENT_DELETED",
      metadata: { fileName: attachment.fileName },
    });
  },
};
