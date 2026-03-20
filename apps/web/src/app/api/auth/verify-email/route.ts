import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ObjectId } from "mongodb";
import { connectPlatformDB, User } from "@illuminate/db";

function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, expiresStr, sig] = decoded.split(":");
    if (!userId || !expiresStr || !sig) return null;

    const expires = parseInt(expiresStr, 10);
    if (Date.now() / 1000 > expires) return null; // expired

    const secret = process.env.EMAIL_VERIFY_SECRET ?? "fallback-secret";
    const expected = createHmac("sha256", secret)
      .update(`${userId}:${expiresStr}`)
      .digest("hex");

    if (sig !== expected) return null;
    return { userId };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token is required." }, { status: 400 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired verification link." },
      { status: 400 }
    );
  }

  await connectPlatformDB();

  const user = await User.findByIdAndUpdate(
    new ObjectId(payload.userId),
    { $set: { emailVerified: new Date() } },
    { new: true }
  );

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
