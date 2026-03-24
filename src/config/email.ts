import nodemailer from "nodemailer";

/**
 * NodeMailer Transporter Configuration
 * Sirf Connection handle karega.
 */
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 16-character App Password
  },
});

export const connectEmail = async () => {
  try {
    await transporter.verify();
    console.log("Email service ready (SMTP Connected)");
  } catch (error) {
    console.error("Email service connection failed:", error);
  }
};
