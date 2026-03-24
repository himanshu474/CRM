import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";


export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
});

export const authLimiter = (limit = 5): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    message: {
      success: false,
      error: "Too many requests",
    },
  });
