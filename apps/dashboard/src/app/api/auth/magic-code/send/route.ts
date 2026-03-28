export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, User, MagicCode } from "@goparticipate/db";
import {
  generateCode,
  hashCode,
  getCodeExpiry,
  canSendNewCode,
  CODE_EXPIRY_MINUTES,
} from "@goparticipate/auth";
import { sendEmail } from "@goparticipate/email";

// POST /api/auth/magic-code/send — send a login code via email or SMS
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { identifier } = body as { identifier?: string };

  if (!identifier?.trim()) {
    return NextResponse.json({ error: "Email or phone number is required" }, { status: 400 });
  }

  const cleaned = identifier.trim().toLowerCase();
  const isEmail = cleaned.includes("@");
  const identifierType = isEmail ? "email" : "phone";

  await connectPlatformDB();

  const userFilter = isEmail ? { email: cleaned } : { phone: cleaned };
  const user = await User.findOne(userFilter).lean();

  // Don't reveal user existence
  if (!user) {
    return NextResponse.json({ sent: true, identifierType, expiresInMinutes: CODE_EXPIRY_MINUTES });
  }

  const recentCode = await MagicCode.findOne({
    identifier: cleaned,
    purpose: "login",
  }).sort({ createdAt: -1 }).lean();

  if (recentCode && !canSendNewCode(recentCode.createdAt)) {
    return NextResponse.json({ error: "Please wait before requesting another code" }, { status: 429 });
  }

  const code = generateCode();
  const hashed = await hashCode(code);

  await MagicCode.create({
    identifier: cleaned,
    identifierType,
    code: process.env.NODE_ENV === "development" ? code : "******",
    hashedCode: hashed,
    expiresAt: getCodeExpiry(),
    purpose: "login",
  });

  if (isEmail) {
    try {
      await sendEmail({
        to: cleaned,
        subject: `Your Go Participate login code: ${code}`,
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;"><h2>Your login code</h2><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f4f4f5;border-radius:8px;margin:16px 0;">${code}</div><p style="color:#999;font-size:13px;">Expires in ${CODE_EXPIRY_MINUTES} minutes.</p></div>`,
      });
    } catch (err) {
      console.error("[magic-code] email send failed:", err);
    }
  } else {
    try {
      const { sendSMS } = await import("@goparticipate/email");
      await sendSMS({ to: cleaned, body: `Your Go Participate code is ${code}. Expires in ${CODE_EXPIRY_MINUTES} min.` });
    } catch (err) {
      console.error("[magic-code] SMS send failed:", err);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`\n[MAGIC CODE] ${identifierType}: ${cleaned} → Code: ${code}\n`);
  }

  return NextResponse.json({
    sent: true,
    identifierType,
    expiresInMinutes: CODE_EXPIRY_MINUTES,
    ...(process.env.NODE_ENV === "development" ? { _devCode: code } : {}),
  });
}
