// src/middlewares/auth.middleware.ts
import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/common/asyncHandler.js";
import { verifyAccessToken } from "../utils/auth/token.utils.js";
import { Req } from "../types/express.js";

export const protect = asyncHandler(async (req: Req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401);
  }

  const token = authHeader.split(" ")[1];

  const decoded = verifyAccessToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
  });

  if (!user) throw new AppError("User not found", 401);

  if (user.tokenVersion !== decoded.tv) {
    throw new AppError("Session expired", 401);
  }

  if (!user.isVerified) {
    throw new AppError("Email not verified", 403);
  }

  req.user = user;

  next();
});