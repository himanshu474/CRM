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
import { validate } from "../middlewares/validate.js";
import { authLimiter } from "../middlewares/rateLimit.js";

import {
  registerSchema,
  loginSchema,
  updatePasswordSchema,
} from "../validations/auth.validations.js";

const router = Router();

// 🔓 Public Routes
router.post("/register", authLimiter(10), validate(registerSchema), register);
router.post("/login", authLimiter(5), validate(loginSchema), login);
router.post("/refresh", authLimiter(20), refresh);

// 🔒 Protected Routes
router.use(protect);

router.get("/me", getMe);
router.get("/sessions", getSessions);

router.post("/logout", logout);
router.post("/logout-all", logoutAll);

router.patch(
  "/change-password",
  validate(updatePasswordSchema),
  changePassword
);

export default router;