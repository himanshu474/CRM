import rateLimit from "express-rate-limit";
// import { ERROR_MESSAGES } from "../constants/errorMessages.js";

// General API requests (CRM data fetching)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limits for Sensitive Routes (Login, Register, Forgot Password)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Sirf 10 attempts allowed
  message: { success: false, message: "Too many login attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});
