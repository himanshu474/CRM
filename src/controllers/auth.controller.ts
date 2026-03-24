import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AuthService } from "../services/auth.service.js";
import { Req } from "../types/express.js";


const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export const register = asyncHandler(async (req: Req, res: Response) => {
  const result = await AuthService.register(req, req.body);

  res.cookie("refreshToken", result.refreshToken, cookieOptions);

  res.status(201).json({
    success: true,
    data: { accessToken: result.accessToken },
    message: "User registered",
  });
});

export const login = asyncHandler(async (req: Req, res: Response) => {
  const result = await AuthService.login(req, req.body);

  res.cookie("refreshToken", result.refreshToken, cookieOptions);

  res.json({
    success: true,
    data: { accessToken: result.accessToken },
    message: "Login successful",
  });
});


// ================= GET ME =================
export const getMe = asyncHandler(async (req: Req, res: Response) => {
  res.json({
    success: true,
    data: req.user,
  });
});

export const refresh = asyncHandler(async (req: Req, res: Response) => {
  const token = req.cookies.refreshToken;

  const result = await AuthService.refresh(req, token);

  res.cookie("refreshToken", result.refreshToken, cookieOptions);

  res.json({
    success: true,
    data: { accessToken: result.accessToken },
    message: "Token refreshed",
  });
});

export const logout = asyncHandler(async (req: Req, res: Response) => {
  const token = req.cookies.refreshToken;

  await AuthService.logout(token);

  res.clearCookie("refreshToken", cookieOptions);

  res.json({
    success: true,
    message: "Logged out",
  });
});

export const logoutAll = asyncHandler(async (req: Req, res: Response) => {
  await AuthService.logoutAll(req.user!.id);

  res.clearCookie("refreshToken", cookieOptions);

  res.json({
    success: true,
    message: "Logged out from all devices",
  });
});


// ================= CHANGE PASSWORD =================
export const changePassword = asyncHandler(async (req: Req, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  await AuthService.changePassword(
    req.user!.id,
    currentPassword,
    newPassword
  );

  res.json({
    success: true,
    message: "Password updated. Please login again.",
  });
});

// ================= GET SESSIONS =================
export const getSessions = asyncHandler(async (req: Req, res: Response) => {
  const sessions = await AuthService.getSessions(req.user!.id);

  res.json({
    success: true,
    data: sessions,
  });
});
