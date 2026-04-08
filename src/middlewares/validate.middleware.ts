import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

// Extend Express Request type to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedData?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

// Hardcore Validation Middleware
//1. Validates structure
//2. Blocks unknown fields (.strict)
//3. trim/lowercase
//4. Replaces req data with clean data

export const validate = (schema: z.ZodTypeAny) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData: any = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // ✅ Store validated data for later use
      req.validatedData = validatedData;
      
      // ✅ Only overwrite body (which is writable)
      if (validatedData.body) {
        req.body = validatedData.body;
      }
      
      // ❌ DON'T try to set req.params or req.query - they are read-only in Express 5
      // Instead, use req.validatedData.query or req.validatedData.params in controllers
      // req.params = validatedData.params ?? req.params;  // REMOVE THIS LINE
      // req.query = validatedData.query ?? req.query;    // REMOVE THIS LINE

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Precise Error: Returns "body.email: Invalid format"
        const issue = error.issues[0];
        const path = issue.path.join(".");
        const message = `${path}: ${issue.message}`;
        
        return next(new AppError(message, 400));
      }
      next(error);
    }
  };