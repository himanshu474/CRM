import { transporter } from "../config/email.js";
import { AppError } from "../utils/AppError.js";

const CLIENT_URL = process.env.CLIENT_URL;
const EMAIL_FROM = process.env.EMAIL_USER;
const APP_NAME   = process.env.APP_NAME ?? "CRM App";

if (!CLIENT_URL) throw new Error("CLIENT_URL environment variable is not set");
if (!EMAIL_FROM) throw new Error("EMAIL_USER environment variable is not set");

const baseTemplate = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:8px;overflow:hidden;
                 box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#4f46e5;padding:28px 40px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${APP_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;color:#374151;font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                If you did not request this, you can safely ignore this email.<br/>
                This link expires in <strong>${title.includes("Password") ? "30 minutes" : "1 hour"}</strong>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const EmailService = {

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    try {
      await transporter.sendMail({
        from: `"${APP_NAME}" <${EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: text ?? subject, // ✅ proper plain-text fallback per method
      });
    } catch (error) {
      console.error(`[EmailService] Failed to send "${subject}" to ${to}:`, error);
      throw new AppError("Failed to send email. Please try again later.", 500);
    }
  },

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url  = `${CLIENT_URL}/verify-email?token=${token}`;
    const html = baseTemplate("Verify Your Email", `
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Verify your email address</h2>
      <p style="margin:0 0 24px;">
        Thanks for signing up! Click the button below to verify your email address and activate your account.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 28px;background:#4f46e5;
              color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
        Verify Email
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
        Or copy this link into your browser:<br/>
        <span style="color:#4f46e5;word-break:break-all;">${url}</span>
      </p>
    `);
    await this.send(email, `Verify your ${APP_NAME} account`, html, `Verify your email: ${url}`);
  },

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const url  = `${CLIENT_URL}/reset-password?token=${token}`;
    const html = baseTemplate("Reset Your Password", `
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Reset your password</h2>
      <p style="margin:0 0 8px;">
        We received a request to reset your password. Click the button below to choose a new one.
      </p>
      <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
        This link expires in <strong>30 minutes</strong>.
        If you did not request a password reset, no action is required.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 28px;background:#dc2626;
              color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">
        Reset Password
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
        Or copy this link into your browser:<br/>
        <span style="color:#dc2626;word-break:break-all;">${url}</span>
      </p>
    `);
    await this.send(email, `Password reset request — ${APP_NAME}`, html, `Reset your password: ${url}`);
  },

  // ✅ Added — was referenced in email.queue.ts worker but missing from service
  // Triggered after email verification succeeds — sent via the email queue
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = baseTemplate("Welcome!", `
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Welcome to ${APP_NAME}, ${name}!</h2>
      <p style="margin:0 0 16px;">
        Your account is verified and ready to go. Here's what you can do next:
      </p>
      <ul style="margin:0 0 24px;padding-left:20px;color:#374151;">
        <li style="margin-bottom:8px;">Create or join a workspace</li>
        <li style="margin-bottom:8px;">Invite your team members</li>
        <li style="margin-bottom:8px;">Start managing tasks and deals</li>
      </ul>
      <a href="${CLIENT_URL}/dashboard"
         style="display:inline-block;padding:12px 28px;background:#4f46e5;
                color:#ffffff;text-decoration:none;border-radius:6px;
                font-weight:600;font-size:15px;">
        Go to Dashboard
      </a>
    `);
    await this.send(
      email,
      `Welcome to ${APP_NAME}!`,
      html,
      `Welcome to ${APP_NAME}, ${name}! Visit your dashboard: ${CLIENT_URL}/dashboard`
    );
  },

  async sendSecurityAlertEmail(email: string, event: string, ipAddress?: string): Promise<void> {
    const html = baseTemplate("Security Alert", `
      <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Security alert on your account</h2>
      <p style="margin:0 0 16px;">We detected the following activity on your account:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;
                     font-weight:600;width:140px;color:#374151;">Event</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${event}</td>
        </tr>
        ${ipAddress ? `
        <tr>
          <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;
                     font-weight:600;color:#374151;">IP Address</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">${ipAddress}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;
                     font-weight:600;color:#374151;">Time</td>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;color:#111827;">
            ${new Date().toUTCString()}
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#dc2626;font-weight:600;">
        If this was not you, please reset your password immediately and log out of all sessions.
      </p>
    `);
    await this.send(
      email,
      `Security alert — ${APP_NAME}`,
      html,
      `Security alert on your ${APP_NAME} account: ${event}. If this was not you, reset your password immediately.`
    );
  },
};