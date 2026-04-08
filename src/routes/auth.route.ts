import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authLimiter, strictLimiter } from "../middlewares/rateLimit.middleware.js";
import {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from "../validations/auth.validations.js";

const router = Router();

// ─────────────────────────────────────────────
// Public routes
// ─────────────────────────────────────────────

router.post("/register",
  strictLimiter, // stricter than authLimiter — 5/hr vs 10/15min
  validate(registerSchema),
  AuthController.register
);

router.post("/login",
  authLimiter,
  validate(loginSchema),
  AuthController.login
);

router.post("/refresh",
  authLimiter,
  AuthController.refresh
);

//  GET — email link clicks are GET requests, not POST
router.get("/verify-email",   AuthController.verifyEmail);

router.post("/resend-verification",
  strictLimiter, // email flooding prevention
  validate(resendVerificationSchema),
  AuthController.resendVerification
);

router.post("/request-password-reset",
  strictLimiter,
  validate(requestPasswordResetSchema),
  AuthController.requestPasswordReset
);

router.post("/reset-password",
  strictLimiter,
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

// ─────────────────────────────────────────────
// Protected routes
// ─────────────────────────────────────────────

router.use(protect);

router.get("/me",          AuthController.getMe);
router.get("/sessions",    AuthController.getSessions);
router.post("/logout",     AuthController.logout);
router.post("/logout-all", AuthController.logoutAll);

router.patch("/change-password",
  validate(updatePasswordSchema),
  AuthController.changePassword
);

export default router;