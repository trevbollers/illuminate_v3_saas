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

export interface InviteEmailProps {
  /** Name of the person sending the invite. */
  inviterName: string;
  /** Name of the team / organization. */
  teamName: string;
  /** Role the invitee will receive. */
  role: string;
  /** URL the invitee should visit to accept the invitation. */
  inviteUrl: string;
}

export function InviteEmail({
  inviterName,
  teamName,
  role,
  inviteUrl,
}: InviteEmailProps) {
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

          <Text style={heading}>You've Been Invited!</Text>

          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you to join{" "}
            <strong>{teamName}</strong> on Illuminate as a{" "}
            <strong>{role}</strong>.
          </Text>

          <Text style={paragraph}>
            Illuminate helps food businesses manage their recipes, inventory,
            production, and sales — all in one place.
          </Text>

          <Section style={buttonSection}>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={paragraph}>
            If the button above doesn't work, copy and paste the following URL
            into your browser:
          </Text>

          <Text style={linkText}>
            <Link href={inviteUrl} style={link}>
              {inviteUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This invitation will expire in 7 days. If you weren't expecting this
            email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InviteEmail;

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
