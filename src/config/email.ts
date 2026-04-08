// src/config/email.ts
import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST || "localhost";
const smtpPort = Number(process.env.SMTP_PORT) || 1025;
const fromName = process.env.EMAIL_FROM_NAME || "My App";

// Check if using Mailpit (no auth needed)
const isMailpit = smtpHost === 'localhost' || smtpHost === '127.0.0.1';

// Only require SMTP credentials in production and not using Mailpit
if (!isMailpit && process.env.NODE_ENV === 'production') {
  if (!smtpUser || !smtpPass) {
    throw new Error(
      "SMTP_USER and SMTP_PASS environment variables are required for email in production."
    );
  }
}

// Create transporter
const transporterConfig: any = {
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587/1025
};

// Add auth only if credentials exist
if (smtpUser && smtpPass && !isMailpit) {
  transporterConfig.auth = {
    user: smtpUser,
    pass: smtpPass,
  };
}

// For Mailpit, ignore TLS issues in development
if (isMailpit || process.env.NODE_ENV === 'development') {
  transporterConfig.tls = {
    rejectUnauthorized: false,
  };
}

export const transporter = nodemailer.createTransport(
  transporterConfig,
  {
    // Default from address
    from: `"${fromName}" <${smtpUser || 'noreply@localhost'}>`,
  }
);

export const connectEmail = async (): Promise<void> => {
  try {
    await transporter.verify();
    console.log(`✅ Email: SMTP connection verified (${smtpHost}:${smtpPort})`);
    if (isMailpit) {
      console.log(`   📬 Mailpit UI: http://localhost:8025`);
    }
  } catch (error) {
    console.error(`❌ Email: SMTP connection failed (${smtpHost}:${smtpPort})`, error);
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.warn('⚠️ Continuing in development mode without email');
  }
};