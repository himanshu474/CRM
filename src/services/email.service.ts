import { transporter } from "../config/email.js"; // Config se transporter laya
import { AppError } from "../utils/AppError.js";

export const EmailService = {
  /**
   * Private helper for sending mail
   */
  async send(to: string, subject: string, html: string) {
    try {
      await transporter.sendMail({
        from: `"CRM Support" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error(`📧 Error sending email [${subject}]:`, error);
      throw new AppError("Failed to send email. Please try again later.", 500);
    }
  },

  async sendVerificationEmail(email: string, token: string) {
    const url = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    const html = `<h1>Verify your email</h1><a href="${url}">Click here</a>`;
    
    await this.send(email, "Verify your account 🚀", html);
  },

  async sendResetPasswordEmail(email: string, token: string) {
    const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    const html = `<h1>Reset Password</h1><a href="${url}">Reset now</a>`;

    await this.send(email, "Password Reset Request 🔑", html);
  }
};
