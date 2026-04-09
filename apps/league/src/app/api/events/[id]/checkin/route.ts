export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import crypto from "crypto";
import { getLeagueTenant } from "@/lib/tenant-db";

function verifyChecksum(playerId: string, registrationId: string, eventId: string, tenantSlug: string, checksum: string): boolean {
  const secret = `${process.env.NEXTAUTH_SECRET || "gp-dev-secret"}-${tenantSlug}`;
  const payload = `${playerId}|${registrationId}|${eventId}|${tenantSlug}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 12);
  return expected === checksum;
}

// POST /api/events/[id]/checkin — scan QR code and check in a player
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();
  const { qrData, dayIndex } = body;

  if (!qrData) {
    return NextResponse.json({ error: "QR data is required" }, { status: 400 });
  }

  // Parse QR payload
  let qr: { v: number; pid: string; rid: string; eid: string; ts: string; cs: string };
  try {
    qr = typeof qrData === "string" ? JSON.parse(qrData) : qrData;
  } catch {
    return NextResponse.json({
      status: "rejected",
      reason: "invalid_qr",
      message: "Invalid QR code format",
    }, { status: 400 });
  }

  if (!qr.pid || !qr.rid || !qr.eid || !qr.ts || !qr.cs) {
    return NextResponse.json({
      status: "rejected",
      reason: "invalid_qr",
      message: "QR code missing required fields",
    }, { status: 400 });
  }

  // 1. Verify checksum — prevents forged QR codes
  if (!verifyChecksum(qr.pid, qr.rid, qr.eid, qr.ts, qr.cs)) {
    return NextResponse.json({
      status: "rejected",
      reason: "invalid_checksum",
      message: "QR code verification failed — possible forgery",
    }, { status: 400 });
  }

  // 2. Verify this QR belongs to this event
  if (qr.eid !== params.id) {
    return NextResponse.json({
      status: "rejected",
      reason: "wrong_event",
      message: "This QR code is for a different event",
    }, { status: 400 });
  }

  // 3. Verify this QR belongs to this league tenant
  if (qr.ts !== tenant.tenantSlug) {
    return NextResponse.json({
      status: "rejected",
      reason: "wrong_league",
      message: "This QR code is for a different league",
    }, { status: 400 });
  }

  // 4. Load the event
  const event = await tenant.models.Event.findById(params.id).lean();
  if (!event) {
    return NextResponse.json({
      status: "rejected",
      reason: "event_not_found",
      message: "Event not found",
    }, { status: 404 });
  }

  // 5. Verify event is active (in_progress or registration_closed)
  const activeStatuses = ["in_progress", "registration_closed", "registration_open"];
  if (!activeStatuses.includes((event as any).status)) {
    return NextResponse.json({
      status: "rejected",
      reason: "event_not_active",
      message: `Event is in "${(event as any).status}" status — check-in not available`,
    });
  }

  // 6. Load registration
  if (!Types.ObjectId.isValid(qr.rid)) {
    return NextResponse.json({
      status: "rejected",
      reason: "invalid_registration",
      message: "Invalid registration ID in QR code",
    });
  }

  const registration = await tenant.models.Registration.findById(qr.rid).lean();
  if (!registration) {
    return NextResponse.json({
      status: "rejected",
      reason: "registration_not_found",
      message: "Registration not found — team may have been withdrawn",
    });
  }

  // 7. Check registration is approved
  if ((registration as any).status !== "approved") {
    return NextResponse.json({
      status: "rejected",
      reason: "registration_not_approved",
      message: `Registration status is "${(registration as any).status}" — must be approved`,
      teamName: (registration as any).teamName,
    });
  }

  // 8. Check payment
  if ((registration as any).paymentStatus !== "paid" && (event as any).pricing?.amount > 0) {
    return NextResponse.json({
      status: "rejected",
      reason: "unpaid",
      message: `Registration payment status: ${(registration as any).paymentStatus}`,
      teamName: (registration as any).teamName,
    });
  }

  // 9. Find player on roster
  const rosterEntry = ((registration as any).roster || []).find(
    (r: any) => r.playerId.toString() === qr.pid,
  );

  if (!rosterEntry) {
    return NextResponse.json({
      status: "rejected",
      reason: "not_on_roster",
      message: "Player is not on the submitted roster for this event",
      teamName: (registration as any).teamName,
    });
  }

  // 10. Check eligibility
  if (rosterEntry.eligibilityStatus === "ineligible") {
    return NextResponse.json({
      status: "rejected",
      reason: "ineligible",
      message: `Player "${rosterEntry.playerName}" is marked as ineligible`,
      playerName: rosterEntry.playerName,
      teamName: (registration as any).teamName,
    });
  }

  // 11. Determine which day
  const currentDay = dayIndex ?? 0;
  const dayLabel = (event as any).days?.[currentDay]?.label || `Day ${currentDay + 1}`;

  // 12. Check if already checked in today
  const existingCheckIn = await tenant.models.CheckIn.findOne({
    eventId: new Types.ObjectId(params.id),
    playerId: new Types.ObjectId(qr.pid),
    registrationId: new Types.ObjectId(qr.rid),
    dayIndex: currentDay,
    status: "checked_in",
  }).lean();

  if (existingCheckIn) {
    return NextResponse.json({
      status: "already_checked_in",
      reason: "already_checked_in",
      message: `${rosterEntry.playerName} already checked in for ${dayLabel}`,
      playerName: rosterEntry.playerName,
      teamName: (registration as any).teamName,
      jerseyNumber: rosterEntry.jerseyNumber,
      checkedInAt: (existingCheckIn as any).scannedAt,
    });
  }

  // Look up division label for the player card
  let divisionLabel = "";
  let ageGroup = "";
  if ((registration as any).divisionId) {
    const division = await tenant.models.Division.findById((registration as any).divisionId)
      .select("label minAge maxAge")
      .lean();
    if (division) {
      divisionLabel = (division as any).label || "";
      if ((division as any).minAge && (division as any).maxAge) {
        ageGroup = `Ages ${(division as any).minAge}–${(division as any).maxAge}`;
      }
    }
  }

  // ALL CHECKS PASSED — record check-in
  const checkIn = await tenant.models.CheckIn.create({
    eventId: new Types.ObjectId(params.id),
    divisionId: (registration as any).divisionId,
    registrationId: new Types.ObjectId(qr.rid),
    playerId: new Types.ObjectId(qr.pid),
    playerName: rosterEntry.playerName,
    teamName: (registration as any).teamName,
    jerseyNumber: rosterEntry.jerseyNumber,
    status: "checked_in",
    dayIndex: currentDay,
    dayLabel,
    scannedBy: new Types.ObjectId(tenant.userId),
    scannedByName: tenant.session.user?.name || "Staff",
    scannedAt: new Date(),
    qrPayload: typeof qrData === "string" ? qrData : JSON.stringify(qrData),
  });

  return NextResponse.json({
    status: "checked_in",
    message: `${rosterEntry.playerName} checked in successfully`,
    playerName: rosterEntry.playerName,
    teamName: (registration as any).teamName,
    jerseyNumber: rosterEntry.jerseyNumber,
    divisionId: (registration as any).divisionId?.toString(),
    divisionLabel,
    ageGroup,
    eligibilityStatus: rosterEntry.eligibilityStatus,
    dayLabel,
    checkInId: checkIn._id,
  });
}

// GET /api/events/[id]/checkin — get check-in status for an event
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const dayIndex = parseInt(searchParams.get("dayIndex") || "0", 10);
  const registrationId = searchParams.get("registrationId");
  const divisionId = searchParams.get("divisionId");

  const filter: any = {
    eventId: new Types.ObjectId(params.id),
    dayIndex,
  };
  if (registrationId && Types.ObjectId.isValid(registrationId)) {
    filter.registrationId = new Types.ObjectId(registrationId);
  }
  if (divisionId && Types.ObjectId.isValid(divisionId)) {
    filter.divisionId = new Types.ObjectId(divisionId);
  }

  const checkIns = await tenant.models.CheckIn.find(filter)
    .sort({ scannedAt: -1 })
    .lean();

  // Build summary per team
  const registrations = await tenant.models.Registration.find({
    eventId: new Types.ObjectId(params.id),
    status: "approved",
  }).lean();

  const teamSummaries = registrations.map((reg: any) => {
    const teamCheckIns = checkIns.filter(
      (ci: any) => ci.registrationId.toString() === reg._id.toString() && ci.status === "checked_in",
    );
    return {
      registrationId: reg._id.toString(),
      teamName: reg.teamName,
      divisionId: reg.divisionId.toString(),
      rosterCount: reg.roster?.length || 0,
      checkedInCount: teamCheckIns.length,
      checkedInPlayers: teamCheckIns.map((ci: any) => ({
        playerId: ci.playerId.toString(),
        playerName: ci.playerName,
        jerseyNumber: ci.jerseyNumber,
        scannedAt: ci.scannedAt,
      })),
      missingPlayers: (reg.roster || [])
        .filter((r: any) =>
          !teamCheckIns.some((ci: any) => ci.playerId.toString() === r.playerId.toString()),
        )
        .map((r: any) => ({
          playerId: r.playerId.toString(),
          playerName: r.playerName,
          jerseyNumber: r.jerseyNumber,
        })),
    };
  });

  return NextResponse.json({
    eventId: params.id,
    dayIndex,
    totalCheckIns: checkIns.filter((ci: any) => ci.status === "checked_in").length,
    totalRejected: checkIns.filter((ci: any) => ci.status === "rejected").length,
    teams: teamSummaries,
    recentScans: checkIns.slice(0, 20),
  });
}
