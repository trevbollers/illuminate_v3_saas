import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export interface TryoutInviteEmailProps {
  orgName: string;
  playerName: string;
  tryoutName: string;
  dates: string;
  location: string;
  fee: string;
  ageGroup: string;
  registerUrl: string;
  personalNote?: string;
}

export function TryoutInviteEmail({
  orgName,
  playerName,
  tryoutName,
  dates,
  location,
  fee,
  ageGroup,
  registerUrl,
  personalNote,
}: TryoutInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>{orgName}</Text>
          <Text style={subheading}>Tryout Invitation</Text>
          <Hr style={hr} />

          <Text style={text}>
            Hi {playerName || "there"},
          </Text>

          <Text style={text}>
            You're invited to register for <strong>{tryoutName}</strong>!
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLine}><strong>Dates:</strong> {dates}</Text>
            <Text style={detailLine}><strong>Location:</strong> {location}</Text>
            <Text style={detailLine}><strong>Age Group:</strong> {ageGroup}</Text>
            {fee && fee !== "$0.00" && (
              <Text style={detailLine}><strong>Fee:</strong> {fee}</Text>
            )}
          </Section>

          {personalNote && (
            <Text style={{ ...text, fontStyle: "italic", color: "#6b7280" }}>
              "{personalNote}"
            </Text>
          )}

          <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
            <Button style={button} href={registerUrl}>
              Register Now
            </Button>
          </Section>

          <Text style={footer}>
            If you're unable to attend, no action is needed. This invitation expires in 14 days.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Powered by Go Participate · goparticipate.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f9fafb",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "520px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#111827",
  margin: "0 0 4px",
};

const subheading = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 16px",
};

const hr = { borderColor: "#e5e7eb", margin: "16px 0" };

const text = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#374151",
  margin: "0 0 12px",
};

const detailsBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const detailLine = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#374151",
  margin: "0 0 4px",
};

const button = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 32px",
  borderRadius: "6px",
  textDecoration: "none",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "16px 0 0",
};
