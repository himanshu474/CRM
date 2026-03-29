import { z } from "zod";
import { cuidSchema, paginationSchema } from "./common.validations.js";
import { TaskStatus, TaskPriority } from "@prisma/client";

/**
 * 🧩 Shared Context Helpers
 * Ensures IDs are valid CUIDs (Prevent SQL/ID injection)
 */
const projectContext = z.object({
  workspaceId: cuidSchema("Workspace ID"),
  projectId: cuidSchema("Project ID"),
});

const taskContext = z.object({
  workspaceId: cuidSchema("Workspace ID"),
  taskId: cuidSchema("Task ID"),
});

// 🟢 1. Create Task Schema
export const createTaskSchema = z.object({
  params: projectContext,
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    priority: z.nativeEnum(TaskPriority).default("MEDIUM"),
    status: z.nativeEnum(TaskStatus).default("TODO"),
    assigneeId: z.string().cuid().optional(),
  }).strict(),
});

// 🔵 2. Get Tasks Query Schema (Project Level)
export const getTasksQuerySchema = z.object({
  params: projectContext,
  query: paginationSchema.extend({
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    search: z.string().optional(),
  }).strict(),
});

// 🟠 3. Update/Assign/Status Schemas
export const updateTaskSchema = z.object({
  params: taskContext,
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().cuid().nullable().optional(),
  }).strict(),
});

export const changeStatusSchema = z.object({
  params: taskContext,
  body: z.object({ status: z.nativeEnum(TaskStatus) }).strict(),
});

export const assignTaskSchema = z.object({
  params: taskContext,
  body: z.object({ assigneeId: z.string().cuid().nullable() }).strict(),
});

// ⚪ 4. Basic Param Schema (Delete/Single Fetch)
export const taskIdParamSchema = z.object({
  params: taskContext,
});

// 👤 5. My Tasks (User Dashboard)
export const myTasksQuerySchema = z.object({
  query: paginationSchema.extend({
    workspaceId: z.string().cuid().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
  }).strict(),
});
