import { Button, Heading, Link, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface WelcomeEmailProps {
  name: string;
  dashboardUrl?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function WelcomeEmail({
  name,
  dashboardUrl = `${baseUrl}/dashboard`,
}: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to AI Native Boilerplate, ${name}!`}>
      <Heading style={heading}>Welcome, {name}! 🎉</Heading>
      <Text style={paragraph}>
        Thanks for signing up for AI Native Boilerplate. We're excited to have
        you on board.
      </Text>
      <Text style={paragraph}>
        Your account is ready to go. You can now create projects, manage your
        team, and start building amazing things.
      </Text>
      <Button style={button} href={dashboardUrl}>
        Go to Dashboard
      </Button>
      <Text style={paragraph}>
        Need help getting started? Check out our{" "}
        <Link style={link} href={`${baseUrl}/docs`}>
          documentation
        </Link>{" "}
        or reach out to our support team.
      </Text>
      <Text style={signature}>
        Best regards,
        <br />
        The AI Native Team
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;

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

const link = {
  color: "#0f172a",
  textDecoration: "underline",
};

const signature = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#525f7f",
  margin: "32px 0 0",
};
