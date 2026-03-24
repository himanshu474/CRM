/**
 * Standard API Response Types
 */

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}