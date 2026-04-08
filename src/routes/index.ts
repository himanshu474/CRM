import { Router } from "express";

import authRoutes       from "./auth.route.js";
import workspaceRoutes  from "./workspace.route.js";
import projectRoutes    from "./project.route.js";
import taskRoutes       from "./task.route.js";
import dependencyRoutes from "./dependency.route.js";
import attachmentRoutes from "./attachment.route.js";
import activityRoutes   from "./activity.route.js";
import crmRoutes        from "./crm.route.js"; // This contains companies, contacts, and deals
import { paymentRouter } from "./payment.route.js";

const routes = Router();

// 1. Authentication (Global)
routes.use("/auth", authRoutes);

// 2. Base Workspace Management
routes.use("/workspaces", workspaceRoutes);

/** 
 * 3. Workspace-Scoped Resources
 * These routes all expect /workspaces/:workspaceId/...
 * Because we use mergeParams: true in the child routess, 
 * they can access the :workspaceId for data filtering.
 */
routes.use("/workspaces/:workspaceId/projects",     projectRoutes);
routes.use("/workspaces/:workspaceId/tasks",        taskRoutes);
routes.use("/workspaces/:workspaceId/dependencies", dependencyRoutes);
routes.use("/workspaces/:workspaceId/activities",   activityRoutes);
routes.use("/workspaces/:workspaceId/attachments",  attachmentRoutes);

/**
 * 4. CRM Module
 * Grouped under the workspace to ensure companies, contacts, and deals
 * are always tied to a specific organization/workspace.
 */
routes.use("/workspaces/:workspaceId/crm", crmRoutes);

routes.use("/api/workspaces/:workspaceId", paymentRouter);


export default routes;
