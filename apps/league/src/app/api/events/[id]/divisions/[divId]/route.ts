export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";
import { generateBracketMatches } from "@goparticipate/db/src/utils/bracket-generator";

// PATCH /api/events/[id]/divisions/[divId] — update an event division
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; divId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.divId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  const body = await req.json();
  const updated = await tenant.models.Division.findByIdAndUpdate(
    params.divId,
    { $set: body },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  // Auto-generate bracket shells when bracketTiers are defined/updated
  if (body.bracketTiers && Array.isArray(body.bracketTiers) && body.bracketTiers.length > 0) {
    const eventId = params.id;
    const divisionId = params.divId;

    // Remove existing draft brackets for this division (don't touch in_progress/completed)
    await tenant.models.Bracket.deleteMany({
      eventId: new Types.ObjectId(eventId),
      divisionId: new Types.ObjectId(divisionId),
      status: "draft",
    });

    // Generate one bracket shell per tier
    for (const tier of body.bracketTiers) {
      const tierTeamCount = tier.teamCount || 4;
      const tierBracketType = tier.bracketType || "single_elimination";
      const matches = generateBracketMatches([], tierBracketType, tierTeamCount);

      await tenant.models.Bracket.create({
        eventId: new Types.ObjectId(eventId),
        divisionId: new Types.ObjectId(divisionId),
        name: `${(updated as any).label} — ${tier.name} Bracket`,
        type: tierBracketType,
        matches,
        status: "draft",
        createdBy: new Types.ObjectId(tenant.userId),
      });
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/events/[id]/divisions/[divId] — remove a division from an event
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; divId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.divId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  await tenant.models.Division.findByIdAndDelete(params.divId);

  // Remove from event's divisionIds
  await tenant.models.Event.findByIdAndUpdate(params.id, {
    $pull: { divisionIds: new Types.ObjectId(params.divId) },
  });

  return NextResponse.json({ ok: true });
}
