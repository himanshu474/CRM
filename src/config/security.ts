import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

/**
 * Helmet config
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: false, // enable later if needed
});

/**
 * CORS whitelist
 */
export const corsConfig = cors({
  origin: process.env.CLIENT_URL?.split(","),
  credentials: true,
});

/**
 * Global rate limiter
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    success: false,
    error: "Too many requests",
  },
});

/**
 * Auth limiter (strict)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: {
    success: false,
    error: "Too many auth attempts",
  },
});