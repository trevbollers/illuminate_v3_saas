export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/tryouts/[sessionId] — get session detail with registrations + evaluations
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  if (!Types.ObjectId.isValid(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession, TryoutRegistration, TryoutEvaluation, TryoutDecision } = getOrgModels(conn);

  const [session, registrations, evaluations, decisions] = await Promise.all([
    TryoutSession.findById(sessionId).lean(),
    TryoutRegistration.find({ sessionId: new Types.ObjectId(sessionId) }).sort({ tryoutNumber: 1 }).lean(),
    TryoutEvaluation.find({ sessionId: new Types.ObjectId(sessionId) }).sort({ tryoutNumber: 1, sessionDay: 1 }).lean(),
    TryoutDecision.find({ sessionId: new Types.ObjectId(sessionId) }).lean(),
  ]);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session, registrations, evaluations, decisions });
}

// PATCH /api/tryouts/[sessionId] — update session (status, evaluators, categories)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const body = await req.json();

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession } = getOrgModels(conn);

  const updated = await TryoutSession.findByIdAndUpdate(
    sessionId,
    { $set: body },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
