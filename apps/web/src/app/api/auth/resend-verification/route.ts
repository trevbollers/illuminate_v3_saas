import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { connectPlatformDB, User } from "@goparticipate/db";
import { sendEmail, VerifyEmail } from "@goparticipate/email";

function generateVerifyToken(userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const secret = process.env.EMAIL_VERIFY_SECRET ?? "fallback-secret";
  const payload = `${userId}:${expires}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  await connectPlatformDB();

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return 200 — don't reveal whether the email exists
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const token = generateVerifyToken(user._id.toString());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000";
  const verifyUrl = `${appUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  try {
    await sendEmail({
      to: email,
      subject: "Verify your Go Participate account",
      react: VerifyEmail({ name: user.name, verifyUrl }),
    });
  } catch (err) {
    console.error("[resend-verification] Failed to send email:", err);
  }

  return NextResponse.json({ ok: true });
}
