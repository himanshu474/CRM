import { Router } from "express";
import {
  createProject,
  getWorkspaceProjects,
  updateProject,
  deleteProject,
  restoreProject,
} from "../controllers/project.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createProjectSchema,
  updateProjectSchema, // Added for the PATCH route
  projectIdParamSchema,
  workspaceIdParamSchema,
} from "../validations/project.validations.js";

const router = Router();

// All project routes require a valid session
router.use(protect);

// POST: /api/workspaces/:workspaceId/projects
router.post(
  "/:workspaceId/projects",
  validate(createProjectSchema),
  authorize,
  createProject
);

// GET: /api/workspaces/:workspaceId/projects
router.get(
  "/:workspaceId/projects",
  validate(workspaceIdParamSchema),
  authorize,
  getWorkspaceProjects
);

// PATCH: /api/workspaces/:workspaceId/projects/:projectId
router.patch(
  "/:workspaceId/projects/:projectId",
  validate(updateProjectSchema), // Now validates params AND body
  authorize,
  updateProject
);

// DELETE: /api/workspaces/:workspaceId/projects/:projectId
router.delete(
  "/:workspaceId/projects/:projectId",
  validate(projectIdParamSchema),
  authorize,
  deleteProject
);

// PATCH: /api/workspaces/:workspaceId/projects/:projectId/restore
router.patch(
  "/:workspaceId/projects/:projectId/restore",
  validate(projectIdParamSchema),
  authorize,
  restoreProject
);

export default router;
