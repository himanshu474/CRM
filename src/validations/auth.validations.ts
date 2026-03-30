import { z } from "zod";
import { emailSchema, passwordSchema, nameSchema } from "./common.validations.js";

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    name:     nameSchema(2, 50),
    email:    emailSchema,
    password: passwordSchema,
  }).strict(),
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export const loginSchema = z.object({
  body: z.object({
    email:    emailSchema,
    password: z.string().min(1, "Password is required"),
  }).strict(),
});

// ─────────────────────────────────────────────
// CHANGE PASSWORD (authenticated)
// ─────────────────────────────────────────────

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword:    z.string().min(1, "Current password is required"),
    newPassword:        passwordSchema,
    confirmNewPassword: z.string(),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path:    ["confirmNewPassword"],
  }),
});

// ─────────────────────────────────────────────
// REQUEST PASSWORD RESET
// Previously named forgotPasswordSchema — renamed to match controller/route
// ─────────────────────────────────────────────

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: emailSchema,
  }).strict(),
});

// Keep the old name as an alias so existing imports don't break
export const forgotPasswordSchema = requestPasswordResetSchema;

// ─────────────────────────────────────────────
// RESET PASSWORD
// ✅ token comes from req.query (?token=...) — it's in the email link URL,
//    not the request body. Validating it here in `query` means the validate
//    middleware checks it automatically alongside the body fields.
// ─────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  query: z.object({
    token: z.string().min(1, "Reset token is required"),
  }),
  body: z.object({
    newPassword: passwordSchema,
  }).strict(),
});

// ─────────────────────────────────────────────
// RESEND VERIFICATION
// ✅ Added — was missing, referenced in routes
// ─────────────────────────────────────────────

export const resendVerificationSchema = z.object({
  body: z.object({
    email: emailSchema,
  }).strict(),
});