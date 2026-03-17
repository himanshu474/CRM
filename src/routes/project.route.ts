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
import { validate } from "../middlewares/validate.js";

import {
  createProjectSchema,
  projectIdParamSchema,
  workspaceIdParamSchema,
} from "../validations/auth.validations.js";

const router = Router();

router.use(protect);

router.post(
    "/:workspaceId/projects",
  validate(createProjectSchema),
  authorize,
  createProject
);

router.get(
  "/:workspaceId/projects",
  validate(workspaceIdParamSchema),
  authorize,
  getWorkspaceProjects
);

router.patch(
  "/:workspaceId/projects/:projectId",
    validate(projectIdParamSchema),
  authorize,
  updateProject
);

router.delete(
    "/:workspaceId/projects/:projectId",
  validate(projectIdParamSchema),
  authorize,
  deleteProject
);

router.patch(
  "/:workspaceId/projects/:projectId/restore",
  validate(projectIdParamSchema),
  authorize,
  restoreProject
);

export default router;