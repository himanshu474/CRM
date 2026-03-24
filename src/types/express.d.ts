import { ParamsDictionary } from "express-serve-static-core";
import { User, WorkspaceMember, Project } from "@prisma/client";

/**
 * 1. Extend ParamsDictionary to satisfy Express's internal requirements
 */
export interface CustomParams extends ParamsDictionary {
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  dependsOnTaskId?: string;
    attachmentId?: string; a
}

/**
 * 2. Extend Express Request globally
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        tokenVersion: number;
        isVerified: boolean;
      };
      membership?: WorkspaceMember;
      project?: Project;
    }
  }
}

/**
 * 3. THE MAIN TYPE (Used in Controllers)
 * We use 'any' as the default for Body (B) and Query (Q) 
 * unless you provide a specific Zod type.
 */
import { Request as ExpressRequest } from "express";
export type Req<B = any, Q = any> = ExpressRequest<CustomParams, any, B, Q>;
