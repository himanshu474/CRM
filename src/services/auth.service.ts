import { Request } from "express";
import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";
import { generateAccessToken } from "../utils/auth/token.utils.js";
import { generateFingerprint } from "../utils/auth/fingerprint.util.js";
import { generateSecureToken, hashToken, DUMMY_BCRYPT_HASH } from "../utils/security/crypto.utils.js";
import { EmailService } from "./email.service.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";
import { emailQueue } from "../jobs/email.queue.js";

export const AuthService = {

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────
  async register(req: Request, body: any) {
    const { email, name, password } = body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError("Email already in use", 400);

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, name, password: hashed },
    });

    await this.sendVerification(user.id, user.email);
    await logAuditEvent({ userId: user.id, action: "USER_REGISTERED" });

    // Don't issue tokens — user must verify email before logging in
    return { message: "Registration successful. Please verify your email." };
  },

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  async login(req: Request, body: any) {
    const { email, password } = body;

    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, email: true, name: true, password: true, isVerified: true, tokenVersion: true },
    });

    // ✅ Always run bcrypt.compare to prevent timing attacks that enumerate valid emails
    const match = await bcrypt.compare(password, user?.password ?? DUMMY_BCRYPT_HASH);

    if (!user || !match) throw new AppError("Invalid credentials", 401);
    if (!user.isVerified) throw new AppError("Please verify your email first", 403);

    await logAuditEvent({ userId: user.id, action: "LOGIN" });

    return this.createSession(req, user as User);
  },

  // ─────────────────────────────────────────────
  // CREATE SESSION
  // ─────────────────────────────────────────────
  async createSession(req: Request, user: User) {
    const fingerprint = generateFingerprint(req);
    const refreshToken = generateSecureToken();
    const tokenHash = hashToken(refreshToken);

    await prisma.session.create({
      data: {
        userId:    user.id,
        tokenHash,
        fingerprint,
        userAgent: req.headers["user-agent"] ?? null,
        ipAddress: req.ip ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken:  generateAccessToken({ sub: user.id, tv: user.tokenVersion }),
      refreshToken,
    };
  },

  // ─────────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────────
 async verifyEmail(token: string) {
    const hash = hashToken(token);
 
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hash },
    });
 
    if (!record || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired verification link", 400);
    }
 
    // ✅ Fetch name before the transaction so we have it for the welcome email
    const user = await prisma.user.findUnique({
      where:  { id: record.userId },
      select: { name: true, email: true },
    });
 
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
      prisma.emailVerificationToken.delete({ where: { id: record.id } }),
    ]);
 
    await logAuditEvent({ userId: record.userId, action: "EMAIL_VERIFIED" });
 
    // ✅ Queue welcome email — non-blocking, retried by BullMQ if it fails.
    // Don't send inline here: verification should be instant;
    // a slow SMTP call shouldn't delay the response or cause a 500.
    if (user) {
      await emailQueue.add(
        "welcome",
        { type: "WELCOME", email: user.email, name: user.name },
        { delay: 2000 } // ✅ 2s delay — gives the frontend time to redirect before inbox fills
      );
    }
  },

  // ─────────────────────────────────────────────
  // RESEND VERIFICATION
  // ✅ Added — was callable internally but had no public service method,
  //    so the controller endpoint had no way to drive it without exposing userId
  // ─────────────────────────────────────────────
  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, isVerified: true },
    });

    // ✅ Silent return — don't reveal whether email exists or is already verified
    if (!user || user.isVerified) return;

    await this.sendVerification(user.id, email);
  },

  // ─────────────────────────────────────────────
  // REFRESH (token rotation + reuse detection)
  // ─────────────────────────────────────────────
  async refresh(req: Request, token: string) {
    const hash        = hashToken(token);
    const fingerprint = generateFingerprint(req);

    return prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where:   { tokenHash: hash },
        include: { user: true },
      });

      // Token reuse detection — revoked token replayed = likely compromise
      if (!session || session.isRevoked) {
        if (session?.userId) {
          await tx.session.updateMany({ where: { userId: session.userId }, data: { isRevoked: true } });
          await logAuditEvent({ userId: session.userId, action: "SESSION_COMPROMISED" });
        }
        throw new AppError("Session compromised or expired", 401);
      }

      if (session.expiresAt < new Date()) {
        await tx.session.update({ where: { id: session.id }, data: { isRevoked: true } });
        throw new AppError("Session expired, please log in again", 401);
      }

      if (session.fingerprint !== fingerprint) {
        await tx.session.update({ where: { id: session.id }, data: { isRevoked: true } });
        await logAuditEvent({ userId: session.userId, action: "SESSION_HIJACK_DETECTED" });
        throw new AppError("Session hijacked", 401);
      }

      // Rotate — revoke old, issue new
      await tx.session.update({ where: { id: session.id }, data: { isRevoked: true } });

      return AuthService.createSession(req, session.user);
    });
  },

  // ─────────────────────────────────────────────
  // REQUEST PASSWORD RESET
  // ─────────────────────────────────────────────
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

    // Silent return — don't reveal whether email exists
    if (!user) return;

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = generateSecureToken();

    await prisma.passwordResetToken.create({
      data: {
        userId:    user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await EmailService.sendResetPasswordEmail(email, rawToken);
  },

  // ─────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const hash = hashToken(token);

    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("Token expired or invalid", 400);
    }

    if (record.usedAt) {
      throw new AppError("Token already used", 400);
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data:  { password: hashed, tokenVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.delete({ where: { id: record.id } }),
      prisma.session.updateMany({ where: { userId: record.userId }, data: { isRevoked: true } }),
    ]);

    await logAuditEvent({ userId: record.userId, action: "PASSWORD_RESET" });
  },

  // ─────────────────────────────────────────────
  // LOGOUT (single session)
  // ─────────────────────────────────────────────
  async logout(userId: string, token: string) {
    const hash = hashToken(token);

    const session = await prisma.session.findUnique({ where: { tokenHash: hash } });

    if (!session || session.userId !== userId) {
      throw new AppError("Session not found", 404);
    }

    await prisma.session.update({ where: { tokenHash: hash }, data: { isRevoked: true } });
    await logAuditEvent({ userId, action: "LOGOUT" });
  },

  // ─────────────────────────────────────────────
  // LOGOUT ALL
  // ─────────────────────────────────────────────
  async logoutAll(userId: string) {
    await prisma.session.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });
    await logAuditEvent({ userId, action: "LOGOUT_ALL_SESSIONS" });
  },

  // ─────────────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────────────
  async changePassword(userId: string, current: string, next: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw new AppError("User not found", 404);

    const match = await bcrypt.compare(current, user.password);
    if (!match) throw new AppError("Current password is incorrect", 401);

    const same = await bcrypt.compare(next, user.password);
    if (same) throw new AppError("New password must differ from current password", 400);

    const hash = await bcrypt.hash(next, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data:  { password: hash, tokenVersion: { increment: 1 } },
      }),
      prisma.session.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } }),
    ]);

    await logAuditEvent({ userId, action: "PASSWORD_CHANGED" });
  },

  // ─────────────────────────────────────────────
  // GET SESSIONS
  // ─────────────────────────────────────────────
  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id:           true,
        ipAddress:    true,
        userAgent:    true,
        lastActivity: true,
        createdAt:    true,
        expiresAt:    true,
        // tokenHash intentionally excluded
      },
      orderBy: { lastActivity: "desc" },
    });
  },

  // ─────────────────────────────────────────────
  // SEND VERIFICATION (internal)
  // ─────────────────────────────────────────────
  async sendVerification(userId: string, email: string) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId } });

    const rawToken = generateSecureToken();

    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await EmailService.sendVerificationEmail(email, rawToken);
  },
};