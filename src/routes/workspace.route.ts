// routes/workspace.routes.ts

import { Router } from "express";
import {
  createWorkspace,
  getMyWorkspaces,
  inviteMember,
  deleteWorkspace,
  restoreWorkspace,
} from "../controllers/workspace.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.js";

import {
  createWorkspaceSchema,
  inviteMemberSchema,
  workspaceIdParamSchema,
} from "../validations/auth.validations.js";

const router = Router();

router.use(protect);

router.post("/", validate(createWorkspaceSchema), createWorkspace);

router.get("/", getMyWorkspaces);

router.post(
  "/:workspaceId/invite",
  validate(inviteMemberSchema),
  authorize,
  inviteMember
);

router.delete(
  "/:workspaceId",
  validate(workspaceIdParamSchema),
  authorize,
  deleteWorkspace
);

router.patch(
  "/:workspaceId/restore",
  validate(workspaceIdParamSchema),
  authorize,
  restoreWorkspace
);

export default router;