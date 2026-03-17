import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";


export const authLimiter = (num: number = 5): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: num, 
    message: {
      status: 429,
      message: "Too many requests, please try again later",
    },
    standardHeaders: true, 
    legacyHeaders: false,
  });
};
