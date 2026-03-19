import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface WelcomeEmailProps {
  name: string;
  verifyUrl: string;
}

export function WelcomeEmail({ name, verifyUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Img
            src="https://illuminate.app/logo.png"
            width="140"
            height="40"
            alt="Illuminate"
            style={logo}
          />

          <Text style={heading}>Welcome to Illuminate!</Text>

          <Text style={paragraph}>Hi {name},</Text>

          <Text style={paragraph}>
            Thank you for signing up for Illuminate. We're excited to help you
            streamline your food business operations — from recipes and
            inventory to sales and production.
          </Text>

          <Text style={paragraph}>
            To get started, please verify your email address by clicking the
            button below:
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={verifyUrl}>
              Verify Email Address
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button above doesn't work, copy and paste the following URL
            into your browser:
          </Text>

          <Text style={linkText}>
            <Link href={verifyUrl} style={link}>
              {verifyUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent by{" "}
            <Link href="https://illuminate.app" style={link}>
              Illuminate
            </Link>
            . If you didn't create an account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const body: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "560px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
};

const logo: React.CSSProperties = {
  margin: "0 auto 24px",
  display: "block",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#111827",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#3b82f6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  display: "inline-block",
};

const linkText: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  wordBreak: "break-all" as const,
  margin: "0 0 16px",
};

const link: React.CSSProperties = {
  color: "#3b82f6",
  textDecoration: "underline",
};

const hr: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#9ca3af",
};
