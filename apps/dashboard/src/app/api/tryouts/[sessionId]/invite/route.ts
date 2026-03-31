export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { format } from "date-fns";
import { connectTenantDB, getOrgModels, connectPlatformDB, Player, User } from "@goparticipate/db";
import { sendEmail, TryoutInviteEmail, sendSMS } from "@goparticipate/email";

/**
 * POST /api/tryouts/[sessionId]/invite — bulk invite players to tryouts
 *
 * Body: {
 *   playerIds: string[],        // Platform player IDs to invite
 *   personalNote?: string,      // Optional note from coach
 *   sendVia: "email" | "sms" | "both",
 * }
 *
 * Looks up each player's guardian users for contact info, sends invite via
 * email and/or SMS, and auto-registers the player with payment pending.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const body = await req.json();
  const { playerIds, personalNote, sendVia } = body;

  if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
    return NextResponse.json({ error: "playerIds array required" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const models = getOrgModels(conn);
  const { TryoutSession, TryoutRegistration, Program, Roster, Attendance } = models;

  const session = await TryoutSession.findById(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const program = await Program.findById(session.programId).lean();
  const p = program as any;

  // Build registration URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";
  const registerUrl = `${baseUrl}/${slug}?register=tryout&session=${sessionId}`;

  // Resolve player + guardian info from platform DB
  await connectPlatformDB();

  const results: { playerId: string; playerName: string; status: string; error?: string }[] = [];

  for (const pid of playerIds) {
    if (!Types.ObjectId.isValid(pid)) {
      results.push({ playerId: pid, playerName: "", status: "skipped", error: "Invalid ID" });
      continue;
    }

    // Check already registered
    const existing = await TryoutRegistration.findOne({
      sessionId: new Types.ObjectId(sessionId),
      playerId: new Types.ObjectId(pid),
    });
    if (existing) {
      results.push({ playerId: pid, playerName: (existing as any).playerName, status: "already_registered" });
      continue;
    }

    // Get player
    const player = await Player.findById(pid).select("firstName lastName guardianUserIds").lean();
    if (!player) {
      results.push({ playerId: pid, playerName: "", status: "skipped", error: "Player not found" });
      continue;
    }

    const pl = player as any;
    const playerName = `${pl.firstName} ${pl.lastName}`;

    // Auto-register with pending payment
    const tryoutNumber = session.nextTryoutNumber;
    session.nextTryoutNumber = tryoutNumber + 1;

    // Historical bonus
    const rosters = await Roster.find({ playerId: new Types.ObjectId(pid) }).lean();
    const attendance = await Attendance.find({ playerId: new Types.ObjectId(pid) }).lean();
    const seasons = new Set((rosters as any[]).map((r) => r.season).filter(Boolean));
    const present = (attendance as any[]).filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) / 100 : 0;
    const historicalBonus = Math.round(
      (attendanceRate * 3 + Math.min(seasons.size, 5) + Math.min(present / 10, 3)) *
        session.historicalBonusWeight * 10,
    ) / 10;

    // Determine age group (first matching)
    const ageGroup = session.ageGroups[0] || "Open";

    await TryoutRegistration.create({
      sessionId: new Types.ObjectId(sessionId),
      playerId: new Types.ObjectId(pid),
      playerName,
      ageGroup,
      tryoutNumber,
      paymentStatus: "pending",
      historicalBonus,
      historicalSummary: {
        seasonsWithOrg: seasons.size,
        totalGamesPlayed: present,
        attendanceRate,
      },
    });

    // Get guardian contact info
    const guardianIds = pl.guardianUserIds || [];
    if (guardianIds.length === 0) {
      results.push({ playerId: pid, playerName, status: "registered_no_contact" });
      continue;
    }

    const guardians = await User.find({ _id: { $in: guardianIds } })
      .select("email phone name notificationPreferences")
      .lean();

    const dateStr = p?.startDate
      ? format(new Date(p.startDate), "MMM d, yyyy") +
        (p.endDate ? ` — ${format(new Date(p.endDate), "MMM d, yyyy")}` : "")
      : session.dates.map((d: Date) => format(d, "MMM d")).join(", ");
    const feeStr = p?.fee ? `$${(p.fee / 100).toFixed(2)}` : "Free";

    let sent = false;

    for (const guardian of guardians) {
      const g = guardian as any;

      // Email
      if ((sendVia === "email" || sendVia === "both") && g.email) {
        sendEmail({
          to: g.email,
          subject: `Tryout Invitation: ${session.name} — ${playerName}`,
          react: TryoutInviteEmail({
            orgName: slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            playerName,
            tryoutName: session.name,
            dates: dateStr,
            location: p?.location || "TBD",
            fee: feeStr,
            ageGroup,
            registerUrl,
            personalNote,
          }),
        }).catch((err) => console.error("[tryout:invite] Email failed:", err));
        sent = true;
      }

      // SMS
      if ((sendVia === "sms" || sendVia === "both") && g.phone) {
        const smsBody = `${playerName} is invited to ${session.name}! ${dateStr} at ${p?.location || "TBD"}. Fee: ${feeStr}. Register: ${registerUrl}`;
        sendSMS({ to: g.phone, body: smsBody }).catch((err) =>
          console.error("[tryout:invite] SMS failed:", err),
        );
        sent = true;
      }
    }

    results.push({
      playerId: pid,
      playerName,
      status: sent ? "invited" : "registered_no_delivery",
    });
  }

  await session.save();

  return NextResponse.json({
    invited: results.filter((r) => r.status === "invited").length,
    registered: results.filter((r) => r.status !== "skipped").length,
    results,
  });
}

/**
 * GET /api/tryouts/[sessionId]/invite — list eligible players to invite
 * Returns org roster players NOT yet registered for this session.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const conn = await connectTenantDB(slug, "organization");
  const { TryoutRegistration, Roster } = getOrgModels(conn);

  // Get all active roster players
  const rosters = await Roster.find({ status: "active" })
    .select("playerId playerName teamId")
    .lean();

  // Get already registered player IDs
  const registered = await TryoutRegistration.find({
    sessionId: new Types.ObjectId(sessionId),
  })
    .select("playerId")
    .lean();

  const registeredSet = new Set((registered as any[]).map((r) => r.playerId?.toString()));

  // Deduplicate by playerId (player may be on multiple rosters)
  const playerMap = new Map<string, { playerId: string; playerName: string; registered: boolean }>();
  for (const r of rosters as any[]) {
    const pid = r.playerId?.toString();
    if (!pid || playerMap.has(pid)) continue;
    playerMap.set(pid, {
      playerId: pid,
      playerName: r.playerName,
      registered: registeredSet.has(pid),
    });
  }

  const eligible = [...playerMap.values()].filter((p) => !p.registered);
  const alreadyRegistered = [...playerMap.values()].filter((p) => p.registered);

  return NextResponse.json({ eligible, alreadyRegistered });
}
