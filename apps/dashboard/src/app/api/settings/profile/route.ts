export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectPlatformDB, User } from "@goparticipate/db";

export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const user = await User.findById(userId).select("name email phone notificationPreferences").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    name: (user as any).name,
    email: (user as any).email,
    phone: (user as any).phone,
    notificationPreferences: (user as any).notificationPreferences || {
      emailMessages: true, smsUrgent: false, emailAnnouncements: true,
    },
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const userId = h.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, phone, notificationPreferences } = body;

  await connectPlatformDB();
  const update: Record<string, unknown> = {};
  if (name) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (notificationPreferences) update.notificationPreferences = notificationPreferences;

  await User.findByIdAndUpdate(userId, { $set: update });
  return NextResponse.json({ ok: true });
}
