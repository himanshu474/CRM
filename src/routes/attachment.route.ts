import { Router } from "express";
import {
  uploadAttachment,
  getTaskAttachments,
  deleteAttachment,
} from "../controllers/attachment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.js";
import { upload } from "../middlewares/upload.middleware.js"; // your multer config
import {
  uploadAttachmentSchema,
  getTaskAttachmentsSchema,
  deleteAttachmentSchema,
} from "../validations/attachment.validations.js";

const router = Router();

// All attachment routes require authentication
router.use(protect);

// ========== Upload attachment to a task ==========
router.post(
  "/workspaces/:workspaceId/tasks/:taskId/attachments",
  validate(uploadAttachmentSchema),           // validate workspaceId, taskId (cuid)
  authorize,             // any workspace member can upload
  upload.single("file"),                       // handle file upload (field name "file")
  uploadAttachment
);

// ========== Get all attachments for a task ==========
router.get(
  "/workspaces/:workspaceId/tasks/:taskId/attachments",
  validate(getTaskAttachmentsSchema),
  authorize,
  getTaskAttachments
);

// ========== Delete an attachment (soft delete) ==========
router.delete(
  "/attachments/:attachmentId",
  validate(deleteAttachmentSchema),
  deleteAttachment   // controller handles everything
);

export default router;