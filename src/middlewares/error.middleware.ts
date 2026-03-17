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
  // Production mein console.error ki jagah ek logger (pino/winston) use karna chahiye
  console.error("ERROR:", err);

  // 1. Custom AppError (Jo aapne controllers mein 'throw' kiya hai)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // 2. Zod Validation Error (Fix: Use .issues instead of .errors)
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

  // 3. Prisma Errors (Unique constraint violation)
 if (err.code === "P2002") {
  const target = (err.meta?.target as string[])?.join(", ") || "Record";
  return res.status(409).json({
    success: false,
    message: `${target} already exists.`,
  });
}

  // 4. Prisma Record Not Found
  if (err.code === "P2025") {
  return res.status(404).json({
    success: false,
    message: err.meta?.cause || "Record not found",
  });
}

  // 5. JWT Authentication Errors
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

  if (err instanceof MulterError) {
  const message = err.code === 'LIMIT_FILE_SIZE' 
    ? 'File is too large (max 5MB)' 
    : `Upload error: ${err.message}`;
    
  return res.status(400).json({
    success: false,
    message,
  });
}

  // 6. Default Fallback (Anjaan galtiyon ke liye)
  return res.status(500).json({
    success: false,
    message: "Something went very wrong!",
  });
};
