import { z } from "zod";
import { cuidSchema } from "./common.validations.js";

export const addDependencySchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task ID"),
    dependsOnTaskId: cuidSchema("Depends On Task"),
  }).strict(),
});

export const removeDependencySchema = addDependencySchema;

export const getDependencySchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task ID"),
  }).strict(),
});

// ✅ Added for Workspace-level Critical Path
export const workspaceIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }).strict(),
});
