export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/attendance?eventId=xxx — get attendance for an event
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return NextResponse.json(
      { error: "eventId query param is required" },
      { status: 400 }
    );
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Attendance, OrgEvent, Team } = getOrgModels(conn);

  // Verify event exists
  const event = await OrgEvent.findById(eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Get team name
  const team = await Team.findById(event.teamId).lean();

  const records = await Attendance.find({
    orgEventId: new Types.ObjectId(eventId),
  })
    .sort({ playerName: 1 })
    .lean();

  return NextResponse.json({
    event: {
      _id: event._id,
      title: event.title,
      type: event.type,
      startTime: event.startTime,
      teamId: event.teamId,
      teamName: team?.name,
    },
    attendance: records,
  });
}

// POST /api/attendance — initialize attendance for an event (pre-fill roster)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { eventId } = body;

  if (!eventId || !Types.ObjectId.isValid(eventId)) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 }
    );
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Attendance, OrgEvent, Roster } = getOrgModels(conn);

  const event = await OrgEvent.findById(eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Check if already initialized
  const existing = await Attendance.countDocuments({
    orgEventId: new Types.ObjectId(eventId),
  });

  if (existing > 0) {
    return NextResponse.json(
      { error: "Attendance already initialized for this event" },
      { status: 409 }
    );
  }

  // Get active roster for this team
  const roster = await Roster.find({
    teamId: event.teamId,
    status: "active",
  }).lean();

  if (roster.length === 0) {
    return NextResponse.json(
      { error: "No active players on this team's roster" },
      { status: 400 }
    );
  }

  // Create attendance records for all rostered players
  const records = roster.map((r) => ({
    orgEventId: new Types.ObjectId(eventId),
    teamId: event.teamId,
    playerId: r.playerId,
    playerName: r.playerName,
    status: "absent" as const,
    rsvp: "no_response" as const,
  }));

  const created = await Attendance.insertMany(records);

  return NextResponse.json({ attendance: created }, { status: 201 });
}
