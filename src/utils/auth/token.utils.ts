import jwt, { SignOptions } from "jsonwebtoken";
import { TokenUser, JwtPayload } from "../../types/auth.types.js"; // Aapka types path

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

/**
 * Type-safe Expiration Constants
 */
const ACCESS_TOKEN_EXPIRY: SignOptions["expiresIn"] = "15m";
const REFRESH_TOKEN_EXPIRY: SignOptions["expiresIn"] = "7d";

/**
 * Generate Access Token
 */
export const generateAccessToken = (user: TokenUser): string => {
  const payload: JwtPayload = {
    sub: user.sub, // Changed from user.id to user.sub
    tv: user.tv,   // Changed from user.tokenVersion to user.tv
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};
/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (user: TokenUser): string => {
  const payload: JwtPayload = {
    sub: user.sub, // Changed from user.id to user.sub
    tv: user.tv,   // Changed from user.tokenVersion to user.tv
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};
/**
 * Verify Tokens with explicit return type
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
};
