import type { ReactElement } from "react";
import { Resend } from "resend";

import { PasswordResetEmail } from "./templates/password-reset";
import { VerifyEmail } from "./templates/verify-email";
import { WelcomeEmail } from "./templates/welcome";

interface EmailConfig {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
}

export function createEmailClient(config: EmailConfig = {}) {
  const apiKey = config.apiKey ?? process.env.RESEND_API_KEY;
  const fromEmail =
    config.fromEmail ?? process.env.FROM_EMAIL ?? "noreply@example.com";
  const fromName =
    config.fromName ?? process.env.FROM_NAME ?? "AI Native Boilerplate";

  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set - emails will not be sent");
  }

  const resend = new Resend(apiKey);

  async function sendEmail({ to, subject, react, replyTo }: SendEmailOptions) {
    try {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        react,
        replyTo,
      });

      if (error) {
        console.error("Email send error:", error);
        return { success: false as const, error: error.message };
      }

      return { success: true as const, data };
    } catch (error) {
      console.error("Email send exception:", error);
      return { success: false as const, error: "Failed to send email" };
    }
  }

  /**
   * Send welcome email to new users
   */
  async function sendWelcomeEmail(to: string, name: string, baseUrl?: string) {
    return sendEmail({
      to,
      subject: `Welcome to ${fromName}, ${name}!`,
      react: WelcomeEmail({ name, baseUrl }),
    });
  }

  /**
   * Send password reset email
   */
  async function sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    baseUrl?: string
  ) {
    return sendEmail({
      to,
      subject: "Reset Your Password",
      react: PasswordResetEmail({ name, resetUrl, baseUrl }),
    });
  }

  /**
   * Send email verification email
   */
  async function sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
    baseUrl?: string
  ) {
    return sendEmail({
      to,
      subject: "Verify Your Email Address",
      react: VerifyEmail({ name, verificationUrl, baseUrl }),
    });
  }

  return {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
  };
}

// Re-export templates
export {
  WelcomeEmail,
  PasswordResetEmail,
  VerifyEmail,
  EmailLayout,
} from "./templates";
