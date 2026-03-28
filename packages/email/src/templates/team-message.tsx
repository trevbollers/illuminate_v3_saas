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

export interface TeamMessageEmailProps {
  authorName: string;
  teamName: string;
  subject?: string;
  body: string;
  priority: "normal" | "urgent";
  requiresAck: boolean;
  ackOptions?: string[];
  messageUrl: string;
}

export function TeamMessageEmail({
  authorName,
  teamName,
  subject,
  body: messageBody,
  priority,
  requiresAck,
  ackOptions = [],
  messageUrl,
}: TeamMessageEmailProps) {
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
              <Text style={urgentText}>URGENT MESSAGE</Text>
            </Section>
          )}

          <Text style={heading}>
            {subject || `New message from ${authorName}`}
          </Text>

          <Text style={metaText}>
            From <strong>{authorName}</strong> &middot; {teamName}
          </Text>

          <Section style={messageBox}>
            <Text style={messageBodyStyle}>
              {messageBody.length > 500
                ? messageBody.slice(0, 500) + "..."
                : messageBody}
            </Text>
          </Section>

          {requiresAck && ackOptions.length > 0 && (
            <>
              <Text style={ackLabel}>Please respond:</Text>
              <Section style={buttonSection}>
                {ackOptions.map((option) => (
                  <Button
                    key={option}
                    style={ackButton}
                    href={messageUrl}
                  >
                    {option}
                  </Button>
                ))}
              </Section>
            </>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={messageUrl}>
              View Full Message
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button above doesn't work, copy and paste the following URL
            into your browser:
          </Text>

          <Text style={linkText}>
            <Link href={messageUrl} style={link}>
              {messageUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            You received this because you're a member of {teamName} on Go
            Participate. Manage your notification preferences in your account
            settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TeamMessageEmail;

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

const ackLabel: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#374151",
  margin: "0 0 8px",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const ackButton: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "10px 20px",
  display: "inline-block",
  margin: "0 4px",
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
