export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels, connectPlatformDB, Tenant } from "@goparticipate/db";

/**
 * POST /api/tryouts/[sessionId]/extract — AI-extract structured evaluation from transcript
 *
 * Uses the tenant's BYO API key. If no key configured, returns 400.
 *
 * Body: { rawTranscript: string, tryoutNumber?: number }
 * Returns: { tryoutNumber, positives, negatives, scores, overallSentiment }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = params;
  const body = await req.json();
  const { rawTranscript, tryoutNumber: hintNumber } = body;

  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  // Get tenant AI config
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug }).select("settings").lean();
  const aiConfig = (tenant as any)?.settings?.ai;

  if (!aiConfig?.apiKey) {
    return NextResponse.json({
      error: "No AI API key configured. Go to Settings → AI to add your Anthropic API key.",
      fallback: true,
    }, { status: 400 });
  }

  // Get session scoring categories and registered players
  const conn = await connectTenantDB(slug, "organization");
  const { TryoutSession, TryoutRegistration } = getOrgModels(conn);

  const [session, registrations] = await Promise.all([
    TryoutSession.findById(sessionId).lean(),
    TryoutRegistration.find({ sessionId: new Types.ObjectId(sessionId) })
      .select("tryoutNumber playerName ageGroup")
      .sort({ tryoutNumber: 1 })
      .lean(),
  ]);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const categories = (session as any).scoringCategories || [];
  const playerList = (registrations as any[])
    .map((r) => `#${r.tryoutNumber} ${r.playerName} (${r.ageGroup})`)
    .join("\n");

  const systemPrompt = `You are a youth sports tryout evaluation assistant. Extract structured evaluation data from a coach's spoken notes about a player.

Scoring categories (1-${categories[0]?.maxScore || 10} scale):
${categories.map((c: any) => `- ${c.key}: ${c.label}`).join("\n")}

Registered players:
${playerList}

Rules:
- Identify which player number the evaluator is talking about
- Extract positive observations and negative/improvement areas as short phrases
- Suggest a score for each category based on the evaluator's language
- Determine overall sentiment (positive/neutral/negative)
- If no player number is mentioned, use the hint number if provided
- Return valid JSON only`;

  const userPrompt = `Extract evaluation from this transcript:

"${rawTranscript}"

${hintNumber ? `Hint: evaluator was looking at player #${hintNumber}` : ""}

Return JSON: { "tryoutNumber": number, "positives": string[], "negatives": string[], "scores": [{"category": string, "score": number}], "overallSentiment": "positive"|"neutral"|"negative" }`;

  try {
    const apiUrl = "https://api.anthropic.com/v1/messages";
    const model = aiConfig.model || "claude-sonnet-4-6";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": aiConfig.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `AI API error: ${response.status}`, detail: err }, { status: 502 });
    }

    const aiResult = await response.json();
    const text = aiResult.content?.[0]?.text || "";

    // Parse JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI did not return valid JSON", raw: text }, { status: 502 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      ...extracted,
      aiModel: model,
      aiProcessedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: `AI extraction failed: ${err.message}` }, { status: 500 });
  }
}
