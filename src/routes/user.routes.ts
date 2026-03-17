import { Router } from "express";
import {
  registerUser,
  loginUser,
  getUsers,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { registerSchema, loginSchema } from "../validations/auth.validations.js";
import { authLimiter } from "../middlewares/rateLimit.js";

const router = Router();

router.post("/register", authLimiter(10), validate(registerSchema), registerUser);

router.post("/login", authLimiter(3), validate(loginSchema), loginUser);

router.get("/", protect, authLimiter(5), getUsers);

export default router;
