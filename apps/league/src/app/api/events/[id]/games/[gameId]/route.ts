export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// PATCH /api/events/[id]/games/[gameId] — update a game (scores, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; gameId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id) || !Types.ObjectId.isValid(params.gameId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.homeScore !== undefined) update.homeScore = body.homeScore;
  if (body.awayScore !== undefined) update.awayScore = body.awayScore;
  if (body.status) update.status = body.status;
  if (body.homeTeamName) update.homeTeamName = body.homeTeamName;
  if (body.awayTeamName) update.awayTeamName = body.awayTeamName;
  if (body.homeTeamId) update.homeTeamId = new Types.ObjectId(body.homeTeamId);
  if (body.awayTeamId) update.awayTeamId = new Types.ObjectId(body.awayTeamId);
  if (body.field) update.field = body.field;
  if (body.timeSlot) update.timeSlot = body.timeSlot;
  if (body.scheduledAt) update.scheduledAt = new Date(body.scheduledAt);

  // Auto-determine winner when completing
  if (body.status === "completed" && body.homeScore !== undefined && body.awayScore !== undefined) {
    update.completedAt = new Date();
    update.scoredBy = new Types.ObjectId(tenant.userId);
    if (body.homeScore > body.awayScore && body.homeTeamId) {
      update.winnerId = new Types.ObjectId(body.homeTeamId);
    } else if (body.awayScore > body.homeScore && body.awayTeamId) {
      update.winnerId = new Types.ObjectId(body.awayTeamId);
    }
  }

  const game = await tenant.models.Game.findOneAndUpdate(
    { _id: new Types.ObjectId(params.gameId), eventId: new Types.ObjectId(params.id) },
    { $set: update },
    { new: true },
  ).lean();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(game);
}
