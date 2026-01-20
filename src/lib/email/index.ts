import { Resend } from "resend";
import type { ReactElement } from "react";

import { WelcomeEmail } from "./templates/welcome";
import { PasswordResetEmail } from "./templates/password-reset";
import { VerifyEmail } from "./templates/verify-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@example.com";
const FROM_NAME = process.env.FROM_NAME ?? "AI Native Boilerplate";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

export async function sendEmail({ to, subject, react, replyTo }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      replyTo,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send exception:", error);
    return { success: false, error: "Failed to send email" };
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: `Welcome to AI Native Boilerplate, ${name}!`,
    react: WelcomeEmail({ name }),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
) {
  return sendEmail({
    to,
    subject: "Reset Your Password",
    react: PasswordResetEmail({ name, resetUrl }),
  });
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
) {
  return sendEmail({
    to,
    subject: "Verify Your Email Address",
    react: VerifyEmail({ name, verificationUrl }),
  });
}

export { WelcomeEmail, PasswordResetEmail, VerifyEmail };
