export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, Player } from "@goparticipate/db";

// GET /api/players — search platform players (for adding to rosters)
// Returns players that belong to the current user's family, or all players
// if the user has org_owner/org_admin role (broader search for adding any known player)
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const familyOnly = searchParams.get("familyOnly") === "true";

  await connectPlatformDB();

  const filter: any = { isActive: true };

  if (familyOnly && session.user.familyId) {
    // Only return players from this user's family
    filter.familyId = session.user.familyId;
  } else if (query.length >= 2) {
    // Search by name (for org admins adding known players)
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
    ];
  } else {
    // No query and not family-only — return empty to prevent loading all players
    return NextResponse.json([]);
  }

  const players = await Player.find(filter)
    .select("firstName lastName dateOfBirth gender photo familyId")
    .sort({ lastName: 1, firstName: 1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    players.map((p: any) => ({
      _id: p._id.toString(),
      firstName: p.firstName,
      lastName: p.lastName,
      name: `${p.firstName} ${p.lastName}`,
      dateOfBirth: p.dateOfBirth,
      gender: p.gender,
      photo: p.photo,
    })),
  );
}
