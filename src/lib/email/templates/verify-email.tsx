import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface VerifyEmailProps {
  name: string;
  verificationUrl: string;
  expiresIn?: string;
}

export function VerifyEmail({
  name,
  verificationUrl,
  expiresIn = "24 hours",
}: VerifyEmailProps) {
  return (
    <EmailLayout preview="Verify your email address">
      <Heading style={heading}>Verify Your Email</Heading>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        Thanks for signing up! Please verify your email address by clicking the
        button below.
      </Text>
      <Button style={button} href={verificationUrl}>
        Verify Email
      </Button>
      <Text style={paragraphSmall}>
        This link will expire in {expiresIn}. If you didn't create an account,
        you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default VerifyEmail;

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
