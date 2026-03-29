// src/validations/auth.validations.ts

import { z } from "zod";
import { emailSchema, passwordSchema, nameSchema } from "./common.validations.js";

export const registerSchema = z.object({
  body: z.object({
    name: nameSchema(2, 50),
    email: emailSchema,
    password: passwordSchema,
  }).strict(),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1),
  }).strict(),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  }).strict()
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }).strict(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    newPassword: passwordSchema,
  }).strict(),
});