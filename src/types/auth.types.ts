/**
 * Auth-related types
 */

export interface JwtPayload {
  sub: string; // userId
  tv: number;  // tokenVersion
  iat?: number;
  exp?: number;
}

export interface TokenUser {
  sub: string;
  tv: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tokenVersion: number;
  isVerified: boolean;
}