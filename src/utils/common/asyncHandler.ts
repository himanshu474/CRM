import { Response, NextFunction, RequestHandler } from "express";

/**
 * Generic Async Handler
 * T can be a standard Request or your custom Req type
 */
export const asyncHandler = <T = any>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    // We cast to 'any' here only at the internal Express layer 
    // to bypass the strict ParamsDictionary mismatch.
    Promise.resolve(fn(req as any, res, next)).catch(next);
  };
};
