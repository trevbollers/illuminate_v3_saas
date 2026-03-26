export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { sendEmail } from "@goparticipate/email";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// POST /api/system/email/test
// Body: { to: string }
// Sends a simple test email to verify that the email pipeline is functional.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const to: string = body?.to ?? "";

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { error: "A valid recipient email address is required" },
        { status: 400 }
      );
    }

    const sentAt = new Date().toUTCString();

    // Build a minimal inline React element — no external template needed.
    const emailElement = React.createElement(
      "div",
      { style: { fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" } },
      React.createElement(
        "h2",
        { style: { color: "#1a1a1a" } },
        "Go Participate — Test Email"
      ),
      React.createElement(
        "p",
        { style: { color: "#444", lineHeight: "1.6" } },
        "This is a test email from the Go Participate admin panel. If you received this, email delivery is working correctly."
      ),
      React.createElement(
        "hr",
        { style: { border: "none", borderTop: "1px solid #eee", margin: "24px 0" } }
      ),
      React.createElement(
        "p",
        { style: { color: "#888", fontSize: "12px" } },
        `Sent at: ${sentAt}`
      )
    );

    const result = await sendEmail({
      to,
      subject: "Go Participate — Test Email",
      react: emailElement,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent",
      id: result.id,
    });
  } catch (error) {
    console.error("[POST /api/system/email/test]", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to send test email",
      },
      { status: 500 }
    );
  }
}
