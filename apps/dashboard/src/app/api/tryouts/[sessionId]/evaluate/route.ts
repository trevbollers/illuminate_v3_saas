export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

/**
 * POST /api/tryouts/[sessionId]/evaluate — submit an evaluation
 *
 * Body: {
 *   tryoutNumber: number,
 *   sessionDay: number,
 *   rawTranscript: string,        // from voice capture
 *   scores?: { category, score }[],
 *   positives?: string[],
 *   negatives?: string[],
 *   overallSentiment?: string,
 *   notes?: string,
 * }
 *
 * If scores/positives/negatives are empty, the frontend should call
 * the AI extraction endpoint first, then submit the confirmed results here.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const userName = h.get("x-user-name") || "Evaluator";
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const body = await req.json();
  const { tryoutNumber, sessionDay, rawTranscript, scores, positives, negatives, overallSentiment, notes } = body;

  if (!tryoutNumber) {
    return NextResponse.json({ error: "tryoutNumber required" }, { status: 400 });
  }

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession, TryoutRegistration, TryoutEvaluation } = getOrgModels(conn);

  // Verify session exists and user is evaluator
  const session = await TryoutSession.findById(sessionId).lean();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Find registration by tryout number
  const registration = await TryoutRegistration.findOne({
    sessionId: new Types.ObjectId(sessionId),
    tryoutNumber,
  }).lean();

  if (!registration) {
    return NextResponse.json({ error: `No player with tryout number ${tryoutNumber}` }, { status: 404 });
  }

  const evaluation = await TryoutEvaluation.create({
    sessionId: new Types.ObjectId(sessionId),
    registrationId: (registration as any)._id,
    playerId: (registration as any).playerId,
    tryoutNumber,
    evaluatorId: new Types.ObjectId(userId),
    evaluatorName: userName,
    sessionDay: sessionDay || 1,
    rawTranscript: rawTranscript || "",
    positives: positives || [],
    negatives: negatives || [],
    scores: scores || [],
    overallSentiment: overallSentiment || "neutral",
    notes: notes || "",
    manuallyEdited: false,
  });

  return NextResponse.json(evaluation, { status: 201 });
}

// GET /api/tryouts/[sessionId]/evaluate?tryoutNumber=32 — get evals for a player
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const url = new URL(req.url);
  const tryoutNumber = url.searchParams.get("tryoutNumber");

  const conn = await connectTenantDB(slug, "organization");
  const { TryoutEvaluation, TryoutRegistration } = getOrgModels(conn);

  const filter: any = { sessionId: new Types.ObjectId(sessionId) };
  if (tryoutNumber) filter.tryoutNumber = parseInt(tryoutNumber);

  const [evaluations, registration] = await Promise.all([
    TryoutEvaluation.find(filter).sort({ sessionDay: 1, createdAt: 1 }).lean(),
    tryoutNumber
      ? TryoutRegistration.findOne({
          sessionId: new Types.ObjectId(sessionId),
          tryoutNumber: parseInt(tryoutNumber),
        }).lean()
      : null,
  ]);

  return NextResponse.json({ evaluations, registration });
}
