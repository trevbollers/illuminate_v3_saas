export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { sendEmail, LeagueAnnouncementEmail } from "@goparticipate/email";

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

  // --- Email delivery to registered org admins ---
  if (deliveryChannels.includes("email")) {
    const announcementId = (announcement._id as Types.ObjectId).toString();

    // Resolve org admins who should receive this announcement
    deliverAnnouncement({
      tenant,
      announcement: {
        id: announcementId,
        title,
        body: announcementBody,
        priority,
        targetType,
        targetEventId,
        targetDivisionId,
      },
      Announcement: tenant.models.Announcement,
    }).catch(() => {});
  }

  return NextResponse.json({ announcement }, { status: 201 });
}

/**
 * Resolve org admin recipients and send announcement emails.
 * Runs after response to avoid blocking.
 *
 * Resolution: Registration.orgTenantId → Tenant → User.memberships (org_owner/org_admin)
 */
async function deliverAnnouncement({
  tenant,
  announcement,
  Announcement,
}: {
  tenant: NonNullable<Awaited<ReturnType<typeof getLeagueTenant>>>;
  announcement: {
    id: string;
    title: string;
    body: string;
    priority: string;
    targetType: string;
    targetEventId?: string;
    targetDivisionId?: string;
  };
  Announcement: any;
}) {
  const { models } = tenant;
  const platformDb = await connectPlatformDB();

  // 1. Find distinct orgTenantIds from registrations matching the target scope
  const regFilter: Record<string, unknown> = {};
  if (announcement.targetType === "event" && announcement.targetEventId) {
    regFilter.eventId = new Types.ObjectId(announcement.targetEventId);
  } else if (announcement.targetType === "division" && announcement.targetDivisionId) {
    regFilter.divisionId = new Types.ObjectId(announcement.targetDivisionId);
  }
  // For "all_registered", no filter — get all orgs that have any registration

  const orgTenantIds: Types.ObjectId[] = await models.Registration.distinct(
    "orgTenantId",
    regFilter
  );

  if (orgTenantIds.length === 0) return;

  // 2. Look up org tenant names for context
  const TenantModel = platformDb.model("Tenant") as any;
  const orgTenants = await TenantModel.find({
    _id: { $in: orgTenantIds },
  })
    .select("_id name slug")
    .lean() as Array<{ _id: Types.ObjectId; name: string; slug: string }>;

  const orgTenantMap = new Map(
    orgTenants.map((t) => [t._id.toString(), t])
  );

  // 3. Find org admins (org_owner, org_admin) for these tenants
  const UserModel = platformDb.model("User") as any;
  const orgAdmins = await UserModel.find({
    memberships: {
      $elemMatch: {
        tenantId: { $in: orgTenantIds },
        tenantType: "organization",
        role: { $in: ["org_owner", "org_admin"] },
        isActive: true,
      },
    },
    "notificationPreferences.emailAnnouncements": { $ne: false },
  })
    .select("_id name email memberships notificationPreferences")
    .lean() as Array<{
      _id: Types.ObjectId;
      name: string;
      email: string;
      memberships: Array<{
        tenantId: Types.ObjectId;
        role: string;
        isActive: boolean;
        tenantType: string;
      }>;
    }>;

  if (orgAdmins.length === 0) return;

  // 4. Get league name and optional event name
  const leagueTenant = await TenantModel.findOne({
    slug: tenant.tenantSlug,
    tenantType: "league",
  })
    .select("name")
    .lean() as { name: string } | null;

  const leagueName = leagueTenant?.name || "League";

  let eventName: string | undefined;
  if (announcement.targetType === "event" && announcement.targetEventId) {
    const event = await models.Event.findById(announcement.targetEventId)
      .select("name")
      .lean() as { name: string } | null;
    eventName = event?.name;
  }

  // 5. Send emails and build delivery log
  const deliveryLog: Array<{
    orgTenantId: Types.ObjectId;
    adminUserId: Types.ObjectId;
    channel: "email";
    sentAt: Date;
    status: "sent" | "failed";
  }> = [];

  const baseUrl = process.env.NEXTAUTH_URL || "https://goparticipate.com";
  const announcementUrl = `${baseUrl}/communication?tab=announcements`;

  for (const admin of orgAdmins) {
    // Find which org tenant this admin belongs to (could be multiple)
    const relevantMembership = admin.memberships.find(
      (m) =>
        orgTenantIds.some((id) => id.toString() === m.tenantId.toString()) &&
        m.tenantType === "organization" &&
        ["org_owner", "org_admin"].includes(m.role) &&
        m.isActive
    );

    const orgTenantId = relevantMembership?.tenantId;
    if (!orgTenantId) continue;

    try {
      await sendEmail({
        to: admin.email,
        subject: `${leagueName}: ${announcement.title}`,
        react: LeagueAnnouncementEmail({
          leagueName,
          title: announcement.title,
          body: announcement.body,
          priority: announcement.priority as "normal" | "urgent",
          eventName,
          announcementUrl,
        }),
      });

      deliveryLog.push({
        orgTenantId,
        adminUserId: admin._id,
        channel: "email",
        sentAt: new Date(),
        status: "sent",
      });
    } catch {
      deliveryLog.push({
        orgTenantId,
        adminUserId: admin._id,
        channel: "email",
        sentAt: new Date(),
        status: "failed",
      });
    }
  }

  // 6. Persist delivery log
  if (deliveryLog.length > 0) {
    await Announcement.findByIdAndUpdate(announcement.id, {
      $push: { deliveryLog: { $each: deliveryLog } },
    });
  }
}
