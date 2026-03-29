import { Request } from "express";
import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";
import { generateAccessToken } from "../utils/auth/token.utils.js";
import { generateFingerprint } from "../utils/auth/fingerprint.util.js";
import { generateSecureToken, hashToken } from "../utils/security/crypto.utils.js";
import { EmailService } from "./email.service.js";
import { logAuditEvent } from "../utils/security/audit.utils.js";

export const AuthService = {
  async register(req: Request, body: any) {
   const { email, name, password } = body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError("Email already in use", 400);

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, name, password: hashed },
    });

    await this.sendVerification(user.id, user.email);

    await logAuditEvent({
      userId: user.id,
      action: "USER_REGISTERED",
    });

    return this.createSession(req, user);
  },

  async login(req: Request, body: any) {
    const { email, password } = body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("Invalid credentials", 401);

    if (!user.isVerified) throw new AppError("Please verify your email", 403);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new AppError("Invalid credentials", 401);

    await logAuditEvent({
      userId: user.id,
      action: "LOGIN",
    });

    return this.createSession(req, user);
  },

  async createSession(req: Request, user: User) {
     const fingerprint = generateFingerprint(req);
    const refreshToken = generateSecureToken();
    const tokenHash = hashToken(refreshToken);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        fingerprint,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    return {
      accessToken: generateAccessToken({
        sub: user.id,
        tv: user.tokenVersion,
      }),
      refreshToken,
    };
  },

  async verifyEmail(token: string) {
    const hash = hashToken(token);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("Invalid or expired verification link", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { isVerified: true },
      }),
      prisma.emailVerificationToken.delete({
        where: { id: record.id },
      }),
    ]);

    await logAuditEvent({
      userId: record.userId,
      action: "EMAIL_VERIFIED",
    });
  },

  // REFRESH WITH ROTATION
 
  async refresh(req: Request, token: string) {
    const hash = hashToken(token);
    const fingerprint = generateFingerprint(req);

    return prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { tokenHash: hash },
        include: { user: true },
      });

      // Token reuse detection (Compromise recovery)
      if (!session || session.isRevoked) {
        if (session?.userId) {
          await tx.session.updateMany({
            where: { userId: session.userId },
            data: { isRevoked: true },
          });
        }
        throw new AppError("Session compromised or expired", 401);
      }

      if (session.fingerprint !== fingerprint) {
        throw new AppError("Session hijacked", 401);
      }

      // Revoke the old session immediately
      await tx.session.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });

      // Explicitly use AuthService to avoid 'this' context issues
      return AuthService.createSession(req, session.user);
    });
  },


  async requestPasswordReset(email: string) {
   const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const rawToken = generateSecureToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await EmailService.sendResetPasswordEmail(email, rawToken);
  },


  async resetPassword(token: string, newPassword: string) {
     const hash = hashToken(token);

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError("Token expired", 400);
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          password: hashed,
          tokenVersion: { increment: 1 }, // logout all
        },
      }),
      prisma.passwordResetToken.delete({
        where: { id: record.id },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true },
      }),
    ]);

    await logAuditEvent({
      userId: record.userId,
      action: "PASSWORD_RESET",
    });
  },

  async logout(userId: string, token: string) {
    const hash = hashToken(token);
    await prisma.session.updateMany({ where: { tokenHash: hash, userId }, data: { isRevoked: true } });
    await logAuditEvent({ userId, action: "LOGOUT" });
  },

  async logoutAll(userId: string) {
    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
    
    await logAuditEvent({ userId, action: "LOGOUT_ALL_SESSIONS" });
  },

 async changePassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { password: true } // Only fetch what you need
  });

  if (!user) throw new AppError("User not found", 404);

  const match = await bcrypt.compare(current, user.password);
  if (!match) throw new AppError("Wrong password", 401);

  const hash = await bcrypt.hash(next, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password: hash,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.session.updateMany({
      where: { userId, isRevoked: false }, // Only update active sessions
      data: { isRevoked: true },
    }),
  ]);
},


  async getSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, isRevoked: false },
    });
  },

  async sendVerification(userId: string, email: string) {
    const rawToken = generateSecureToken();
    await prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 3600000) },
    });
    await EmailService.sendVerificationEmail(email, rawToken);
  }
};
