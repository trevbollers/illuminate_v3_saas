export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/schedule — list events in a date range
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params are required (ISO dates)" },
      { status: 400 },
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const filter: any = {
    isCancelled: { $ne: true },
    $or: [
      // Non-recurring events in range
      { startTime: { $lte: endDate }, endTime: { $gte: startDate } },
      // Recurring events that started before range end (client expands them)
      { "recurrence.frequency": { $exists: true }, startTime: { $lte: endDate } },
    ],
  };

  const teamId = searchParams.get("teamId");
  if (teamId && Types.ObjectId.isValid(teamId)) {
    // Show events for this specific team + org-wide events
    filter.$and = [
      filter.$or ? { $or: filter.$or } : {},
      {
        $or: [
          { teamId: new Types.ObjectId(teamId) },
          { teamIds: new Types.ObjectId(teamId) },
          { isOrgWide: true },
        ],
      },
    ];
    delete filter.$or;
  }

  const type = searchParams.get("type");
  if (type) {
    filter.type = type;
  }

  const events = await models.OrgEvent.find(filter)
    .sort({ startTime: 1 })
    .lean();

  // Populate team names
  const allTeamIds = new Set<string>();
  for (const e of events as any[]) {
    if (e.teamId) allTeamIds.add(e.teamId.toString());
    if (e.teamIds) for (const id of e.teamIds) allTeamIds.add(id.toString());
  }
  const teams = await models.Team.find({
    _id: { $in: [...allTeamIds].map((id) => new Types.ObjectId(id)) },
  })
    .select("_id name")
    .lean();

  const teamMap = new Map(teams.map((t: any) => [t._id.toString(), t.name]));

  const enriched = events.map((e: any) => {
    const eventTeamIds = e.teamIds?.length > 0
      ? e.teamIds.map((id: any) => id.toString())
      : e.teamId ? [e.teamId.toString()] : [];
    const teamNames = eventTeamIds.map((id: string) => teamMap.get(id) ?? "Unknown");

    return {
      ...e,
      _id: e._id.toString(),
      teamId: e.teamId?.toString(),
      teamIds: eventTeamIds,
      isOrgWide: e.isOrgWide || false,
      teamName: e.isOrgWide ? "All Teams" : teamNames.join(", ") || "Unknown Team",
    };
  });

  return NextResponse.json(enriched);
}

// POST /api/schedule — create a new event
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    teamId,
    teamIds: bodyTeamIds,
    isOrgWide: bodyIsOrgWide,
    title,
    type,
    startTime,
    endTime,
    location,
    opponentName,
    homeAway,
    leagueEventId,
    recurrence,
    notes,
  } = body;

  // Must have at least one team or be org-wide
  if (!bodyIsOrgWide && !teamId && (!bodyTeamIds || bodyTeamIds.length === 0)) {
    return NextResponse.json({ error: "Select at least one team or mark as org-wide" }, { status: 400 });
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const validTypes = ["practice", "scrimmage", "meeting", "tryout", "game", "tournament", "other"];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }
  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Start and end times are required" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const eventData: any = {
    title: title.trim(),
    type,
    startTime: start,
    endTime: end,
    isOrgWide: bodyIsOrgWide || false,
    createdBy: new Types.ObjectId(session.user.id),
  };

  if (bodyIsOrgWide) {
    eventData.teamIds = [];
  } else {
    const ids = bodyTeamIds?.length > 0
      ? bodyTeamIds.filter((id: string) => Types.ObjectId.isValid(id))
      : teamId ? [teamId] : [];
    eventData.teamIds = ids.map((id: string) => new Types.ObjectId(id));
    // Legacy: set teamId to first for backwards compat
    if (ids.length > 0) eventData.teamId = new Types.ObjectId(ids[0]);
  }

  if (location?.name) {
    eventData.location = {
      name: location.name.trim(),
      address: location.address?.trim() || undefined,
    };
  }

  if (type === "game") {
    if (opponentName) eventData.opponentName = opponentName.trim();
    if (homeAway) eventData.homeAway = homeAway;
  }

  if (type === "tournament" && leagueEventId) {
    eventData.leagueEventId = leagueEventId;
  }

  if (recurrence?.frequency) {
    eventData.recurrence = {
      frequency: recurrence.frequency,
      daysOfWeek: recurrence.daysOfWeek || undefined,
      endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
    };
  }

  if (notes?.trim()) {
    eventData.notes = notes.trim();
  }

  const created = await models.OrgEvent.create(eventData);

  return NextResponse.json(
    { ...created.toObject(), teamName: (team as any).name },
    { status: 201 },
  );
}
