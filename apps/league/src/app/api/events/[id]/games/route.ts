export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id]/games — list games for an event
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
  const divisionId = searchParams.get("divisionId");
  const dayIndex = searchParams.get("dayIndex");

  const filter: Record<string, unknown> = {
    eventId: new Types.ObjectId(params.id),
  };
  if (divisionId && divisionId !== "all") {
    filter.divisionId = new Types.ObjectId(divisionId);
  }
  if (dayIndex !== null && dayIndex !== "" && dayIndex !== "all") {
    filter.dayIndex = parseInt(dayIndex, 10);
  }

  const games = await tenant.models.Game.find(filter)
    .sort({ dayIndex: 1, scheduledAt: 1, field: 1 })
    .lean();

  return NextResponse.json(games);
}

// POST /api/events/[id]/games — create a single game
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

  const game = await tenant.models.Game.create({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(body.divisionId),
    bracketId: body.bracketId ? new Types.ObjectId(body.bracketId) : undefined,
    poolId: body.poolId ? new Types.ObjectId(body.poolId) : undefined,
    homeTeamId: body.homeTeamId ? new Types.ObjectId(body.homeTeamId) : undefined,
    awayTeamId: body.awayTeamId ? new Types.ObjectId(body.awayTeamId) : undefined,
    homeTeamName: body.homeTeamName || "TBD",
    awayTeamName: body.awayTeamName || "TBD",
    scheduledAt: new Date(body.scheduledAt),
    dayIndex: body.dayIndex ?? 0,
    locationName: body.locationName,
    field: body.field,
    timeSlot: body.timeSlot,
    sport: body.sport || "7v7_football",
    round: body.round,
    gameNumber: body.gameNumber,
    status: "scheduled",
  });

  return NextResponse.json(game, { status: 201 });
}

// DELETE /api/events/[id]/games — delete all games for an event (regenerate)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  // Only allow deleting games that haven't started
  const result = await tenant.models.Game.deleteMany({
    eventId: new Types.ObjectId(params.id),
    status: "scheduled",
  });

  return NextResponse.json({ deleted: result.deletedCount });
}
