import { Response } from "express";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { AuthService } from "../services/auth.service.js";
import { Req } from "../types/express.js";
import { AppError } from "../utils/AppError.js";

// ─────────────────────────────────────────────
// Cookie config
// ─────────────────────────────────────────────

const cookieOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days — matches session expiresAt
};

// clearCookie requires the same options as set (except maxAge)
// so we share the base options for consistency
const clearOptions = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path:     "/",
};

// ─────────────────────────────────────────────
// Controllers
// ─────────────────────────────────────────────

export const AuthController = {

  register: asyncHandler(async (req: Req, res: Response) => {
    const result = await AuthService.register(req, req.body);

    // ✅ register now returns { message } only — no tokens (unverified users don't get a session)
    // No cookie to set here. If result ever has tokens in future, add cookie here.
    res.status(201).json({
      success: true,
      message: result.message,
    });
  }),

  login: asyncHandler(async (req: Req, res: Response) => {
    const result = await AuthService.login(req, req.body);

    // ✅ Set refresh token in HttpOnly cookie — never expose in response body
    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    res.status(200).json({
      success: true,
      data:    { accessToken: result.accessToken },
      message: "Login successful",
    });
  }),

  verifyEmail: asyncHandler(async (req: Req, res: Response) => {
    //  Token comes from query param (?token=...) from the email link
    const { token } = req.query as { token: string };
    if (!token) throw new AppError("Verification token is required", 400);

    await AuthService.verifyEmail(token);

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  }),

  // ✅ Resend verification — was in service but had no controller endpoint
  resendVerification: asyncHandler(async (req: Req, res: Response) => {
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    // Fetch user to get id — service needs both id and email
    // We delegate entirely to service which handles the "user not found" case silently
    await AuthService.resendVerification(email);

    // ✅ Always return 200 regardless — don't reveal whether email exists
    res.status(200).json({
      success: true,
      message: "If that email is registered and unverified, a new link has been sent.",
    });
  }),

  getMe: asyncHandler(async (req: Req, res: Response) => {
    // req.user is attached by auth middleware — safe to return directly
    // Make sure auth middleware strips password before attaching to req.user
    res.status(200).json({ success: true, data: req.user });
  }),

  refresh: asyncHandler(async (req: Req, res: Response) => {
    const token = req.cookies?.refreshToken;
    if (!token) throw new AppError("No session found, please log in", 401);

    const result = await AuthService.refresh(req, token);

    // ✅ Rotate cookie alongside token
    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    res.status(200).json({
      success: true,
      data: { accessToken: result.accessToken },
    });
  }),

  logout: asyncHandler(async (req: Req, res: Response) => {
    const token = req.cookies?.refreshToken;

    // ✅ Always clear the cookie regardless of whether token exists in DB
    // This prevents a stuck cookie if the session was already revoked server-side
    if (token && req.user) {
      await AuthService.logout(req.user.id, token);
    }

    res.clearCookie("refreshToken", clearOptions);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  }),

  logoutAll: asyncHandler(async (req: Req, res: Response) => {
    await AuthService.logoutAll(req.user!.id);
    res.clearCookie("refreshToken", clearOptions);
    res.status(200).json({ success: true, message: "Logged out from all devices" });
  }),

  requestPasswordReset: asyncHandler(async (req: Req, res: Response) => {
    // ✅ was missing entirely — service exists but had no controller
    const { email } = req.body;
    if (!email) throw new AppError("Email is required", 400);

    await AuthService.requestPasswordReset(email);

    // ✅ Always 200 — don't reveal whether email exists
    res.status(200).json({
      success: true,
      message: "If that email is registered, a password reset link has been sent.",
    });
  }),

  resetPassword: asyncHandler(async (req: Req, res: Response) => {
    // ✅ was missing entirely — service exists but had no controller
    const { token } = req.query as { token: string };
    const { newPassword } = req.body;

    if (!token)       throw new AppError("Reset token is required", 400);
    if (!newPassword) throw new AppError("New password is required", 400);

    await AuthService.resetPassword(token, newPassword);

    // ✅ Clear cookie in case the user had an active session on this device
    res.clearCookie("refreshToken", clearOptions);

    res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  }),

  changePassword: asyncHandler(async (req: Req, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Both current and new password are required", 400);
    }

    await AuthService.changePassword(req.user!.id, currentPassword, newPassword);

    // Clear cookie — all sessions revoked in service, current device should re-login
    res.clearCookie("refreshToken", clearOptions);

    res.status(200).json({
      success: true,
      message: "Password updated. Please log in again.",
    });
  }),

  getSessions: asyncHandler(async (req: Req, res: Response) => {
    const sessions = await AuthService.getSessions(req.user!.id);
    res.status(200).json({ success: true, data: sessions });
  }),
};