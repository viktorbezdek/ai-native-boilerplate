import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
  baseUrl?: string;
  brandName?: string;
}

export function EmailLayout({
  preview,
  children,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  brandName = "AI Native Boilerplate",
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={`${baseUrl}/logo.png`}
              width="40"
              height="40"
              alt="Logo"
              style={logo}
            />
            <Text style={brandNameStyle}>{brandName}</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} {brandName}. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              You're receiving this because you signed up for an account.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px 0",
  display: "flex" as const,
  alignItems: "center" as const,
  gap: "12px",
};

const logo = {
  borderRadius: "8px",
};

const brandNameStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1a1a1a",
  margin: "0",
};

const content = {
  padding: "32px 48px",
};

const footer = {
  padding: "32px 48px 0",
  borderTop: "1px solid #e6ebf1",
};

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0 0 8px",
};

const footerSubtext = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "0",
};
