import { z } from "zod";
import { nameSchema, cuidSchema } from "./common.validations.js";

// For GET and POST (workspace level)
export const workspaceIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
});

export const createProjectSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z.object({
    name: nameSchema(3, 50),
    description: z.string().trim().max(500).optional(),
  }).strict(),
});

// NEW: Specifically for PATCH /update
export const updateProjectSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    projectId: cuidSchema("Project ID"),
  }),
  body: z.object({
    name: nameSchema(3, 50).optional(), // Optional because it's a PATCH
    description: z.string().trim().max(500).optional(),
  }).strict().refine(data => data.name || data.description, {
    message: "At least one field (name or description) must be provided for update",
  }),
});

// For DELETE and RESTORE
export const projectIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    projectId: cuidSchema("Project ID"),
  }),
});
