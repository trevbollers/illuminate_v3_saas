export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectPlatformDB, User } from "@goparticipate/db";

/**
 * POST /api/auth/reset-password — validate token + set new password
 *
 * Body: { token, email, newPassword }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, email, newPassword } = await req.json();

  if (!token || !email || !newPassword) {
    return NextResponse.json({ error: "Token, email, and new password required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectPlatformDB();

  // Hash the token to compare with stored hash
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired reset link. Please request a new one." }, { status: 400 });
  }

  // Hash new password and save
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await User.findByIdAndUpdate(user._id, {
    $set: { passwordHash: hashedPassword },
    $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
  });

  return NextResponse.json({ ok: true, message: "Password reset successfully. You can now sign in." });
}
