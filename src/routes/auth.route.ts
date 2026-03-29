import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  changePassword,
  getMe,
  getSessions,
} from "../controllers/auth.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

import {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
} from "../validations/auth.validations.js";

const router = Router();

// 🔓 Public Routes (No 'protect' here)
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);

/**
 * 🔄 Refresh Token Route
 * Usually, 'protect' is NOT used here because 'protect' checks the Access Token.
 * The 'refresh' controller should manually check the Refresh Token from cookies/body.
 */
router.post("/refresh", authLimiter, refresh);

// 🔒 Protected Routes (Apply 'protect' to everything below)
router.use(protect);

router.get("/me", getMe);
router.get("/sessions", getSessions);

// Logout needs 'protect' to know WHICH user/session to delete
router.post("/logout", logout);
router.post("/logout-all", logoutAll);

router.patch(
  "/change-password",
  validate(updatePasswordSchema),
  changePassword
);

export default router;
