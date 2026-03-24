import { z } from "zod";

/**
 * Common reusable validation blocks
 */

export const emailSchema = z
  .string()
  .trim()
  .email("Invalid email format")
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .max(64)
  .regex(/[A-Z]/, "One uppercase required")
  .regex(/[a-z]/, "One lowercase required")
  .regex(/[0-9]/, "One number required")
  .regex(/[^A-Za-z0-9]/, "One special character required");

export const nameSchema = (min = 2, max = 50) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .regex(/^[a-zA-Z0-9 _-]+$/);

export const cuidSchema = (field: string) =>
  z.string().cuid(`Invalid ${field}`);

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});