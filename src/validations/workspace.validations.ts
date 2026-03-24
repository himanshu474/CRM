import { z } from "zod";
import { nameSchema, cuidSchema } from "./common.validations.js";
import { WorkspaceRoleEnum } from "../constants/enums.js";

export const createWorkspaceSchema = z.object({
  body: z
    .object({
      name: nameSchema(3, 30),
      description: z.string().trim().max(200).optional(),
    })
    .strict(),
});

export const workspaceIdParamSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
});

export const inviteMemberSchema = z.object({
  params: z.object({
    workspaceId: cuidSchema("Workspace ID"),
  }),
  body: z
    .object({
      userId: cuidSchema("User ID"),
      role: z.nativeEnum(WorkspaceRoleEnum).default(
        WorkspaceRoleEnum.MEMBER
      ),
    })
    .strict(),
});