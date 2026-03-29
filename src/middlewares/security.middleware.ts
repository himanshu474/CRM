import helmet from "helmet";
import cors from "cors";
import { globalLimiter } from"./rateLimit.middleware.js";

/**
 * 🛡️ Combined Security Middleware Array
 * Inhe app.ts mein routes se PEHLE mount karein.
 */
export const securityMiddleware = [
  helmet(), // Sets security HTTP headers
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
  globalLimiter, // General rate limit (100 requests per 15 mins)
];
