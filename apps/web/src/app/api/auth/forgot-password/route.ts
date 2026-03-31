export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectPlatformDB, User } from "@goparticipate/db";
import { sendEmail, PasswordResetEmail } from "@goparticipate/email";

/**
 * POST /api/auth/forgot-password — generate reset token + send email
 *
 * Always returns 200 even if email not found (security best practice).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ ok: true }); // Don't reveal missing field
  }

  await connectPlatformDB();
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal whether email exists
    return NextResponse.json({ ok: true });
  }

  // Generate token — 32 bytes hex, expires in 1 hour
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store hashed token on user (never store plaintext)
  await User.findByIdAndUpdate(user._id, {
    $set: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: expiresAt,
    },
  });

  // Build reset URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

  // Send email (fire-and-forget)
  sendEmail({
    to: email.toLowerCase(),
    subject: "Reset your Go Participate password",
    react: PasswordResetEmail({
      name: user.name || "there",
      resetUrl,
    }),
  }).catch((err) => console.error("[forgot-password] Email failed:", err));

  return NextResponse.json({ ok: true });
}
