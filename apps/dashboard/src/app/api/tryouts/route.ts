export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/tryouts — list tryout sessions
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession } = getOrgModels(conn);

  const sessions = await TryoutSession.find()
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(sessions);
}

// POST /api/tryouts — create a tryout session from a program
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { programId, scoringCategories } = body;

  if (!programId || !Types.ObjectId.isValid(programId)) {
    return NextResponse.json({ error: "Invalid programId" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { Program, TryoutSession } = getOrgModels(conn);

  const program = await Program.findById(programId).lean();
  if (!program || (program as any).programType !== "tryout") {
    return NextResponse.json({ error: "Program not found or not a tryout" }, { status: 404 });
  }

  const p = program as any;

  const defaultCategories = scoringCategories || [
    { key: "athleticism", label: "Athleticism", maxScore: 10 },
    { key: "skill", label: "Skill", maxScore: 10 },
    { key: "basketball_iq", label: "Basketball IQ", maxScore: 10 },
    { key: "coachability", label: "Coachability", maxScore: 10 },
    { key: "attitude", label: "Attitude", maxScore: 10 },
  ];

  const session = await TryoutSession.create({
    programId: new Types.ObjectId(programId),
    name: p.name,
    sport: p.sport,
    season: p.season || "2026",
    ageGroups: p.ageGroups?.map((ag: any) => ag.label) || [],
    dates: p.sessions?.map((s: any) => s.date) || [p.startDate],
    evaluatorIds: [new Types.ObjectId(userId)],
    status: "registration",
    scoringCategories: defaultCategories,
    historicalBonusWeight: 0.1,
    nextTryoutNumber: 1,
    createdBy: new Types.ObjectId(userId),
  });

  return NextResponse.json(session, { status: 201 });
}
