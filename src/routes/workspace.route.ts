import { Router } from "express";
import { WorkspaceController } from "../controllers/workspace.controller.js";

// Middlewares
import { protect } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

// Validations (Assume these exist in your validation folder)
import { 
    createWorkspaceSchema, 
    inviteMemberSchema, 
    workspaceIdParamSchema 
} from "../validations/workspace.validations.js";

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * GLOBAL WORKSPACE ACTIONS
 */
router.get("/me", WorkspaceController.getMyWorkspaces);
router.post("/", validate(createWorkspaceSchema), WorkspaceController.create);

/**
 * SPECIFIC WORKSPACE ACTIONS
 * authorize middleware is critical here to set req.membership
 */
router.post(
  "/:workspaceId/invite",
  validate(inviteMemberSchema),
  authorize, 
  WorkspaceController.inviteMember
);

router.delete(
  "/:workspaceId",
  validate(workspaceIdParamSchema),
  authorize,
  WorkspaceController.delete
);

router.post(
  "/:workspaceId/restore",
  validate(workspaceIdParamSchema),
  authorize,
  WorkspaceController.restore
);

export default router;
