import { User, WorkspaceMember, Project } from "@prisma/client";
import { Request } from "express";

// 1. Common Params ko strictly string define karein
export interface CustomParams {
  workspaceId: string;
  projectId: string;
  taskId: string;
  [key: string]: string;
}

// 2. Global Request ko extend karein (user, membership ke liye)
declare global {
  namespace Express {
    interface Request {
      user?: User;
      membership?: WorkspaceMember;
      project?: Project;
    }
  }
}

// 3. Yeh hai Magic Type: Isko har controller mein 'Request' ki jagah use karein
export type Req<B = any, Q = any> = Request<CustomParams, any, B, Q>;
