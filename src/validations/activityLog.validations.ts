import { z } from "zod";
import { cuidSchema,paginationSchema} from "./common.validations.js";
// import { TaskStatusEnum, TaskPriorityEnum } from "../constants/enums.js";


export const getTaskActivityLogSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
    taskId: cuidSchema("Task ID"),
  }),
   query: paginationSchema,
});

export const getWorkspaceActivityLogSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
   query: paginationSchema.extend({
    action: z.string().optional(),
    userId: z.string().cuid().optional(),
    taskId: z.string().cuid().optional(),
  }).strict(),
});