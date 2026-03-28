export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";
import { connectPlatformDB, Tenant } from "@goparticipate/db";

// GET /api/announcements — list announcements for this league
export async function GET(): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const announcements = await tenant.models.Announcement.find({})
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ announcements });
}

// POST /api/announcements — create a new announcement
export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only league_owner and league_admin can create announcements
  const role = tenant.session.user.role;
  if (role !== "league_owner" && role !== "league_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    body: announcementBody,
    priority = "normal",
    targetType,
    targetEventId,
    targetDivisionId,
    deliveryChannels = ["in_app"],
  } = body;

  if (!title || !announcementBody || !targetType) {
    return NextResponse.json(
      { error: "title, body, and targetType are required" },
      { status: 400 }
    );
  }

  const validTargets = ["all_registered", "event", "division"];
  if (!validTargets.includes(targetType)) {
    return NextResponse.json(
      { error: `targetType must be one of: ${validTargets.join(", ")}` },
      { status: 400 }
    );
  }

  if (targetType === "event" && !targetEventId) {
    return NextResponse.json(
      { error: "targetEventId is required for event-scoped announcements" },
      { status: 400 }
    );
  }

  if (targetType === "division" && !targetDivisionId) {
    return NextResponse.json(
      { error: "targetDivisionId is required for division-scoped announcements" },
      { status: 400 }
    );
  }

  // Get author name from platform DB
  await connectPlatformDB();
  const platformDb = (await import("mongoose")).default;
  const userDoc = await platformDb
    .model("User")
    .findById(tenant.userId)
    .select("name")
    .lean() as { name: string } | null;

  const announcement = await tenant.models.Announcement.create({
    title,
    body: announcementBody,
    authorId: new Types.ObjectId(tenant.userId),
    authorName: userDoc?.name || tenant.session.user.name || "League Admin",
    priority,
    targetType,
    targetEventId: targetEventId
      ? new Types.ObjectId(targetEventId)
      : undefined,
    targetDivisionId: targetDivisionId
      ? new Types.ObjectId(targetDivisionId)
      : undefined,
    deliveryChannels,
    readByOrgAdmins: [],
    deliveryLog: [],
  });

  // TODO: trigger email delivery to registered org admins

  return NextResponse.json({ announcement }, { status: 201 });
}
