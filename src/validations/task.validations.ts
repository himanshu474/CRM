import { z } from "zod";
import { cuidSchema, paginationSchema,passwordSchema } from "./common.validations.js";
import { TaskStatusEnum, TaskPriorityEnum } from "../constants/enums.js";

export const getTaskQuerySchema = z.object({
  query: paginationSchema.extend({
    status: z.nativeEnum(TaskStatusEnum).optional(),
    priority: z.nativeEnum(TaskPriorityEnum).optional(),
    assigneeId: z.string().cuid().optional(),
    search: z.string().optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task ID"),
  }),
  body: z
    .object({
      title: z.string().min(3).max(100).optional(),
      description: z.string().max(500).optional(),
      status: z.nativeEnum(TaskStatusEnum).optional(),
      priority: z.nativeEnum(TaskPriorityEnum).optional(),
      assigneeId: z.string().cuid().nullable().optional(),
    })
    .strict(),
});


export const taskIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task ID"),
  }).strict(),
});

export const assignTaskSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task ID"),
  }),
  body: z.object({
    assigneeId: z.string().cuid().nullable().optional(),
  }).strict(),
});


export const myTasksQuerySchema = z.object({
  query: paginationSchema.extend({
    workspaceId: z.string().cuid().optional(),
    status: z.nativeEnum(TaskStatusEnum).optional(),
  }),
});

// export const updatePasswordSchema = z.object({
//   body: z.object({
//     currentPassword: z.string().min(1, "Current password is required"),
//     newPassword: passwordSchema, 
//     confirmNewPassword: z.string()
//   })
//   .strict()
//   .refine((data) => data.newPassword === data.confirmNewPassword, {
//     message: "New passwords do not match",
//     path: ["confirmNewPassword"],
//   }),
// });