import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { AppError } from "../utils/AppError.js";


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

      // OVERWRITE with sanitized data (removes extra fields and trims strings)
      req.body = validatedData.body ?? req.body;
      req.params = validatedData.params ?? req.params;
      req.query = validatedData.query ?? req.query;

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
