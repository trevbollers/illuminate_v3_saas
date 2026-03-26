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

export interface SubscriptionConfirmedEmailProps {
  name: string;
  /** Plan name, e.g. "Pro" or "Enterprise". */
  planName: string;
  /** Human-readable amount, e.g. "$49.00/month". */
  amount: string;
  /** URL to the dashboard. */
  dashboardUrl: string;
}

export function SubscriptionConfirmedEmail({
  name,
  planName,
  amount,
  dashboardUrl,
}: SubscriptionConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Img
            src="https://goparticipate.app/logo.png"
            width="140"
            height="40"
            alt="Go Participate"
            style={logo}
          />

          <Text style={heading}>Subscription Confirmed</Text>

          <Text style={paragraph}>Hi {name},</Text>

          <Text style={paragraph}>
            Your subscription to the <strong>{planName}</strong> plan has been
            confirmed. You will be billed <strong>{amount}</strong> going
            forward.
          </Text>

          <Section style={detailBox}>
            <Text style={detailRow}>
              <strong>Plan:</strong> {planName}
            </Text>
            <Text style={detailRow}>
              <strong>Amount:</strong> {amount}
            </Text>
          </Section>

          <Text style={paragraph}>
            All premium features are now unlocked. Head to your dashboard to
            start using them right away.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You can manage your subscription at any time from your{" "}
            <Link href={`${dashboardUrl}/settings/billing`} style={link}>
              billing settings
            </Link>
            . If you have any questions, contact us at{" "}
            <Link href="mailto:support@goparticipate.app" style={link}>
              support@goparticipate.app
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SubscriptionConfirmedEmail;

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

const detailBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "16px 0 24px",
  border: "1px solid #e5e7eb",
};

const detailRow: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "4px 0",
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
