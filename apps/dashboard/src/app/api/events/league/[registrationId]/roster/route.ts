export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectTenantDB, getLeagueModels } from "@goparticipate/db";
import { auth } from "@goparticipate/auth/edge";

// PUT /api/events/league/[registrationId]/roster — submit/update event roster for a registration
export async function PUT(
  req: NextRequest,
  { params }: { params: { registrationId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug || !session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.registrationId)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  const body = await req.json();
  const { leagueSlug, roster } = body;

  if (!leagueSlug || !roster || !Array.isArray(roster)) {
    return NextResponse.json(
      { error: "Missing required fields: leagueSlug, roster (array)" },
      { status: 400 },
    );
  }

  // Connect to the league DB
  const conn = await connectTenantDB(leagueSlug, "league");
  const models = getLeagueModels(conn);

  // Find registration and verify it belongs to this org
  const registration = await models.Registration.findById(params.registrationId).lean();
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if ((registration as any).orgTenantId.toString() !== session.user.tenantId) {
    return NextResponse.json({ error: "Not authorized to modify this registration" }, { status: 403 });
  }

  // Check roster lock date
  const event = await models.Event.findById((registration as any).eventId).lean();
  if (event && (event as any).rosterLockDate) {
    const lockDate = new Date((event as any).rosterLockDate);
    if (new Date() > lockDate) {
      return NextResponse.json(
        { error: `Roster is locked as of ${lockDate.toLocaleDateString()}. Contact the league admin for changes.` },
        { status: 400 },
      );
    }
  }

  // Validate roster entries
  const validatedRoster = roster.map((entry: any) => ({
    playerId: new Types.ObjectId(entry.playerId),
    playerName: entry.playerName,
    jerseyNumber: entry.jerseyNumber || undefined,
    position: entry.position || undefined,
    eligibilityStatus: "pending_verification",
  }));

  // Check roster size limits
  const settings = (event as any)?.settings;
  if (settings?.maxRosterSize && validatedRoster.length > settings.maxRosterSize) {
    return NextResponse.json(
      { error: `Roster exceeds maximum size of ${settings.maxRosterSize} players` },
      { status: 400 },
    );
  }
  if (settings?.minRosterSize && validatedRoster.length < settings.minRosterSize) {
    return NextResponse.json(
      { error: `Roster must have at least ${settings.minRosterSize} players` },
      { status: 400 },
    );
  }

  // Update the registration roster
  const updated = await models.Registration.findByIdAndUpdate(
    params.registrationId,
    { $set: { roster: validatedRoster } },
    { new: true },
  ).lean();

  return NextResponse.json({
    success: true,
    rosterCount: validatedRoster.length,
    registration: updated,
  });
}

// GET /api/events/league/[registrationId]/roster — get current submitted roster
export async function GET(
  req: NextRequest,
  { params }: { params: { registrationId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug || !session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leagueSlug = searchParams.get("leagueSlug");

  if (!leagueSlug) {
    return NextResponse.json({ error: "leagueSlug query param required" }, { status: 400 });
  }

  const conn = await connectTenantDB(leagueSlug, "league");
  const models = getLeagueModels(conn);

  const registration = await models.Registration.findById(params.registrationId).lean();
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if ((registration as any).orgTenantId.toString() !== session.user.tenantId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  return NextResponse.json({
    roster: (registration as any).roster || [],
    teamName: (registration as any).teamName,
    status: (registration as any).status,
  });
}
