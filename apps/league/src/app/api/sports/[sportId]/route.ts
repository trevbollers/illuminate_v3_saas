export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, Sport } from "@goparticipate/db";

// GET /api/sports/[sportId] — fetch sport config (division templates, positions, etc.)
export async function GET(
  _req: NextRequest,
  { params }: { params: { sportId: string } },
): Promise<NextResponse> {
  await connectPlatformDB();
  const sport = await Sport.findOne({ sportId: params.sportId }).lean();

  if (!sport) {
    return NextResponse.json({ error: "Sport not found" }, { status: 404 });
  }

  return NextResponse.json(sport);
}
