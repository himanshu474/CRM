import { ParamsDictionary } from "express-serve-static-core";
import { User, WorkspaceMember, Project, Company, Contact, Deal } from "@prisma/client";
import { Request as ExpressRequest } from "express";

/**
 * 1. Extend Params Dictionary
 * Added CRM IDs: companyId, contactId, dealId
 */
export interface CustomParams extends ParamsDictionary {
  workspaceId: string;
  projectId: string;
  taskId: string;
  dependsOnTaskId: string;
  attachmentId?: string;
  // CRM Specific Paramss
  companyId?: string;
  contactId?: string;
  dealId: string;
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
      // Optional: Add CRM objects if your middleware fetches them
      company?: Company;
      contact?: Contact;
      deal?: Deal;
    }
  }
}

/**
 * 3. THE MAIN TYPE
 */
export type Req<B = any, Q = any> = ExpressRequest<CustomParams, any, B, Q>;
