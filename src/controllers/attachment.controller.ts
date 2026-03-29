import { Response } from "express";
import { Req } from "../types/express.js"; // Ensure this path matches your Req type definition
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { AttachmentService } from "../services/attachment.service.js";

export const uploadAttachment = asyncHandler(async (req: Req, res: Response) => {
  const { workspaceId, taskId } = req.params;
  const userId = req.user!.id;

  // 1. Permission Guard: Only Admins or Members can upload
  if (!req.membership || !["ADMIN", "MEMBER"].includes(req.membership.role)) {
    throw new AppError("Forbidden: Insufficient permissions to upload", 403);
  }

  // 2. Validate file presence from Multer
  if (!req.file) {
    throw new AppError("No file provided", 400);
  }

  // 3. Delegate to Service
  const data = await AttachmentService.upload(
    workspaceId!,
    taskId!,
    userId,
    req.file!
  );

  res.status(201).json({
    success: true,
    message: "Attachment uploaded successfully",
    data,
  });
});

export const getTaskAttachments = asyncHandler(async (req: Req, res: Response) => {
  const { workspaceId, taskId } = req.params;

  // 1. Permission Guard
  if (!req.membership) {
    throw new AppError("Access Denied: Not a member of this workspace", 403);
  }

  // 2. Delegate to Service
  const data = await AttachmentService.getAll(workspaceId!, taskId!);

  res.json({
    success: true,
    count: data.length,
    data,
  });
});

export const deleteAttachment = asyncHandler(async (req: Req, res: Response) => {
  const { attachmentId } = req.params;
  const userId = req.user!.id;

  // Note: Internal logic in Service handles whether this specific 
  // user (Admin vs Owner) has the right to delete this specific attachment.
  await AttachmentService.delete(attachmentId!, userId);

  res.json({
    success: true,
    message: "Attachment deleted successfully",
  });
});
