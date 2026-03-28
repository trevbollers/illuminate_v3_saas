export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/announcements/[id] — get announcement detail
export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const announcement = await tenant.models.Announcement.findById(id).lean();
  if (!announcement) {
    return NextResponse.json(
      { error: "Announcement not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ announcement });
}

// DELETE /api/announcements/[id] — delete announcement
export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = tenant.session.user.role;
  if (role !== "league_owner" && role !== "league_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await tenant.models.Announcement.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
