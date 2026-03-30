import rateLimit, { Options } from "express-rate-limit";

// ─────────────────────────────────────────────
// Shared base options applied to every limiter
// ─────────────────────────────────────────────

const baseOptions: Partial<Options> = {
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders:   false, // Disable X-RateLimit-* headers
  // ✅ Skip rate limiting in test environment so tests don't flake
  skip: () => process.env.NODE_ENV === "test",
};

// ─────────────────────────────────────────────
// Global limiter — all API routes
// 100 requests per 15 minutes
// ─────────────────────────────────────────────

export const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many requests, please try again later." },
});

// ─────────────────────────────────────────────
// Auth limiter — login, refresh
// 10 requests per 15 minutes
// ─────────────────────────────────────────────

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many attempts. Please wait 15 minutes." },
});

// ─────────────────────────────────────────────
// Strict limiter — register, password reset, resend verification
// 5 requests per hour — these trigger emails or create accounts
// ─────────────────────────────────────────────

export const strictLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max:      5,
  message:  { success: false, message: "Too many attempts. Please try again in an hour." },
});