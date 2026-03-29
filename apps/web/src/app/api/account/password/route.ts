export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectPlatformDB, User } from "@goparticipate/db";
import bcrypt from "bcryptjs";

// POST /api/account/password — change password
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("passwordHash");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If user has a password, verify the current one
  if (user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 },
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(session.user.id, { passwordHash: hash });

  return NextResponse.json({ ok: true });
}
