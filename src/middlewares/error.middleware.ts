import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { ZodError } from "zod";
import { MulterError } from "multer";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Use a logger like Pino or Winston here in the future
  if (process.env.NODE_ENV === "development") {
    console.error("DEBUG ERROR 💥:", err);
  }

  // 1. Operational Errors (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // 2. Zod Validation (Your logic is perfect here)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // 3. Prisma Unique Constraint (e.g., Email already exists)
  if (err.code === "P2002") {
    const field = (err.meta?.target as string[])?.join(", ") || "Field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists.`,
    });
  }

  // 4. Prisma Record Not Found
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Resource not found or already deleted.",
    });
  }

  // 5. JWT Errors (Caught automatically from your protect middleware)
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please log in again.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again.",
    });
  }

  // 6. Multer Errors
  if (err instanceof MulterError) {
    return res.status(400).json({
      success: false,
      message: err.code === "LIMIT_FILE_SIZE" ? "File too large (Max 5MB)" : err.message,
    });
  }

   if (err.type === "StripeSignatureVerificationError") {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature.",
    });
  }

  // 7. Final Fallback
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "development" ? err.message : "Internal Server Error",
    // Only show stack trace in dev
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

