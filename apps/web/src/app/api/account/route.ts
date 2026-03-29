export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectPlatformDB, User, Tenant } from "@goparticipate/db";

// GET /api/account — return current user profile
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id)
    .select("name email phone image emailVerified notificationPreferences memberships createdAt")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Resolve tenant names for memberships
  const tenantIds = (user as any).memberships
    ?.filter((m: any) => m.isActive)
    .map((m: any) => m.tenantId) || [];

  const tenants = tenantIds.length
    ? await Tenant.find({ _id: { $in: tenantIds } })
        .select("name slug tenantType")
        .lean()
    : [];

  const tenantMap = new Map(
    tenants.map((t: any) => [t._id.toString(), t]),
  );

  const memberships = ((user as any).memberships || [])
    .filter((m: any) => m.isActive)
    .map((m: any) => {
      const tenant = tenantMap.get(m.tenantId.toString());
      return {
        tenantId: m.tenantId.toString(),
        tenantName: tenant?.name || "Unknown",
        tenantType: m.tenantType,
        role: m.role,
      };
    });

  return NextResponse.json({
    name: (user as any).name,
    email: (user as any).email,
    phone: (user as any).phone,
    image: (user as any).image,
    emailVerified: (user as any).emailVerified,
    notificationPreferences: (user as any).notificationPreferences || {
      emailMessages: true,
      smsUrgent: false,
      emailAnnouncements: true,
    },
    memberships,
    createdAt: (user as any).createdAt,
  });
}

// PATCH /api/account — update profile
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, phone, notificationPreferences } = body;

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectPlatformDB();

  const update: any = {};
  if (name !== undefined) update.name = name.trim();
  if (phone !== undefined) update.phone = phone || undefined;
  if (notificationPreferences) {
    update.notificationPreferences = {
      emailMessages: notificationPreferences.emailMessages ?? true,
      smsUrgent: notificationPreferences.smsUrgent ?? false,
      emailAnnouncements: notificationPreferences.emailAnnouncements ?? true,
    };
  }

  await User.findByIdAndUpdate(session.user.id, update);

  return NextResponse.json({ ok: true });
}
