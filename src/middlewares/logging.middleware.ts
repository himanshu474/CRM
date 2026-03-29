import pino from "pino";
import { Request, Response, NextFunction } from "express";

/**
 * 1. Pino Instance Configuration
 */
export const logger = pino({
  transport: process.env.NODE_ENV !== "production" 
    ? { 
        target: "pino-pretty", 
        options: { colorize: true, translateTime: "SYS:standard" } 
      } 
    : undefined,
});

/**
 * 2. Request Logger Middleware
 * Ismein hum check karenge ki request kitni der mein poori hui (Performance)
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Response khatam hone par log karein taaki Status Code mil sake
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get("user-agent"),
      userId: (req as any).user?.id || "guest", // CRM audit ke liye helpful hai
    });
  });

  next();
};
