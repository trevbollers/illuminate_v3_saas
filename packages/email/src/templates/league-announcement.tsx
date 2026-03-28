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

export interface LeagueAnnouncementEmailProps {
  leagueName: string;
  title: string;
  body: string;
  priority: "normal" | "urgent";
  eventName?: string;
  announcementUrl: string;
}

export function LeagueAnnouncementEmail({
  leagueName,
  title,
  body: announcementBody,
  priority,
  eventName,
  announcementUrl,
}: LeagueAnnouncementEmailProps) {
  const isUrgent = priority === "urgent";

  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container style={container}>
          <Img
            src="https://goparticipate.app/logo.png"
            width="140"
            height="40"
            alt="Go Participate"
            style={logo}
          />

          {isUrgent && (
            <Section style={urgentBanner}>
              <Text style={urgentText}>URGENT ANNOUNCEMENT</Text>
            </Section>
          )}

          <Text style={leagueBadge}>{leagueName}</Text>

          <Text style={heading}>{title}</Text>

          {eventName && (
            <Text style={metaText}>
              Regarding: <strong>{eventName}</strong>
            </Text>
          )}

          <Section style={messageBox}>
            <Text style={messageBodyStyle}>{announcementBody}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={announcementUrl}>
              View in Dashboard
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button above doesn't work, copy and paste the following URL
            into your browser:
          </Text>

          <Text style={linkText}>
            <Link href={announcementUrl} style={link}>
              {announcementUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            You received this as a registered organization admin in{" "}
            {leagueName}. Manage your notification preferences in your Go
            Participate account settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default LeagueAnnouncementEmail;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const bodyStyle: React.CSSProperties = {
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

const urgentBanner: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  padding: "8px 16px",
  marginBottom: "16px",
  textAlign: "center" as const,
};

const urgentText: React.CSSProperties = {
  color: "#dc2626",
  fontWeight: "700",
  fontSize: "13px",
  letterSpacing: "0.05em",
  margin: "0",
};

const leagueBadge: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#7c3aed",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "0 0 8px",
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 8px",
};

const metaText: React.CSSProperties = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 20px",
};

const messageBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 0 20px",
};

const messageBodyStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
  display: "inline-block",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const linkText: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  wordBreak: "break-all" as const,
  margin: "0 0 16px",
};

const link: React.CSSProperties = {
  color: "#7c3aed",
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
