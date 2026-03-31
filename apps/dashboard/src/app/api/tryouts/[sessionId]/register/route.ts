export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// POST /api/tryouts/[sessionId]/register — register a player for tryouts
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const body = await req.json();
  const { playerId, playerName, ageGroup } = body;

  if (!playerId || !playerName || !ageGroup) {
    return NextResponse.json({ error: "playerId, playerName, and ageGroup required" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession, TryoutRegistration, Attendance, Roster } = getOrgModels(conn);

  const session = await TryoutSession.findById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check duplicate
  const existing = await TryoutRegistration.findOne({
    sessionId: new Types.ObjectId(sessionId),
    playerId: new Types.ObjectId(playerId),
  });
  if (existing) {
    return NextResponse.json({ error: "Player already registered", registration: existing }, { status: 409 });
  }

  // Assign tryout number (atomic increment)
  const tryoutNumber = session.nextTryoutNumber;
  session.nextTryoutNumber = tryoutNumber + 1;
  await session.save();

  // Calculate historical bonus
  const historicalSummary = await calculateHistorical(playerId, Roster, Attendance);
  const historicalBonus = Math.round(
    (historicalSummary.attendanceRate * 3 +
      Math.min(historicalSummary.seasonsWithOrg, 5) +
      Math.min(historicalSummary.totalGamesPlayed / 10, 3)) *
    session.historicalBonusWeight * 10,
  ) / 10;

  // Check for previous tryout scores
  const prevRegs = await TryoutRegistration.find({
    playerId: new Types.ObjectId(playerId),
    sessionId: { $ne: new Types.ObjectId(sessionId) },
  }).lean();

  if (prevRegs.length > 0) {
    const avgScore = prevRegs.reduce((s: number, r: any) => s + (r.historicalBonus || 0), 0) / prevRegs.length;
    historicalSummary.previousTryoutAvgScore = Math.round(avgScore * 10) / 10;
  }

  const registration = await TryoutRegistration.create({
    sessionId: new Types.ObjectId(sessionId),
    playerId: new Types.ObjectId(playerId),
    playerName,
    ageGroup,
    tryoutNumber,
    paymentStatus: "pending",
    historicalBonus,
    historicalSummary,
  });

  return NextResponse.json(registration, { status: 201 });
}

async function calculateHistorical(
  playerId: string,
  Roster: any,
  Attendance: any,
): Promise<{
  seasonsWithOrg: number;
  totalGamesPlayed: number;
  attendanceRate: number;
  previousTryoutAvgScore?: number;
}> {
  const [rosters, attendance] = await Promise.all([
    Roster.find({ playerId: new Types.ObjectId(playerId) }).lean(),
    Attendance.find({ playerId: new Types.ObjectId(playerId) }).lean(),
  ]);

  const seasons = new Set(rosters.map((r: any) => r.season).filter(Boolean));
  const totalGames = attendance.filter(
    (a: any) => a.status === "present" || a.status === "late",
  ).length;
  const totalAttendance = attendance.length;

  return {
    seasonsWithOrg: seasons.size,
    totalGamesPlayed: totalGames,
    attendanceRate: totalAttendance > 0 ? Math.round((totalGames / totalAttendance) * 100) / 100 : 0,
  };
}
