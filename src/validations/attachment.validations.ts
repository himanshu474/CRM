import { z } from "zod";
import { cuidSchema } from "./common.validations.js";

export const uploadAttachmentSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task IaD"),
  }).strict(),
});

export const getTaskAttachmentsSchema = uploadAttachmentSchema;

export const deleteAttachmentSchema = z.object({
  params: z.object({
    attachmentId: cuidSchema("Attachment ID"),
  }).strict(),
});