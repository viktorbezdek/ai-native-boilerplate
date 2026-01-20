import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresIn?: string;
}

export function PasswordResetEmail({
  name,
  resetUrl,
  expiresIn = "1 hour",
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Heading style={heading}>Reset Your Password</Heading>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to
        create a new password.
      </Text>
      <Button style={button} href={resetUrl}>
        Reset Password
      </Button>
      <Text style={paragraphSmall}>
        This link will expire in {expiresIn}. If you didn't request a password
        reset, you can safely ignore this email.
      </Text>
      <Text style={paragraphSmall}>
        For security, this request was received from a web browser. If you did
        not make this request, please ignore this email or contact support if
        you have concerns.
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;

const heading = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0 0 24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#525f7f",
  margin: "0 0 16px",
};

const paragraphSmall = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#8898aa",
  margin: "0 0 12px",
};

const button = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
  margin: "24px 0",
};
