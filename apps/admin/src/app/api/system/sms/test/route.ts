export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { detectSMSProvider, sendSMS } from "@goparticipate/email";
import { requireAdmin } from "@/lib/require-admin";

// POST /api/system/sms/test — send a test SMS
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { status: "error", message: "Phone number is required" },
        { status: 400 },
      );
    }

    const provider = detectSMSProvider();
    if (!provider) {
      return NextResponse.json({
        status: "error",
        message: "No SMS provider configured",
        detail: "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER, or AWS_SMS_REGION + AWS credentials.",
      });
    }

    const result = await sendSMS({
      to: phone,
      body: "Go Participate SMS test — if you received this message, SMS delivery is working!",
    });

    if (result.success) {
      return NextResponse.json({
        status: "success",
        message: `Test SMS sent via ${result.provider === "twilio" ? "Twilio" : "AWS SNS"}`,
        detail: `Message ID: ${result.messageId}`,
      });
    }

    return NextResponse.json({
      status: "error",
      message: `SMS send failed via ${result.provider === "twilio" ? "Twilio" : "AWS SNS"}`,
      detail: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      message: "SMS test failed",
      detail: err.message,
    });
  }
}
