export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// PATCH /api/teams/[teamId]/roster/[rosterId] — update a roster entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string; rosterId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId) || !Types.ObjectId.isValid(params.rosterId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const updates: any = {};

  if (body.jerseyNumber !== undefined) {
    updates.jerseyNumber = body.jerseyNumber || undefined;
  }
  if (body.position !== undefined) updates.position = body.position || undefined;
  if (body.status !== undefined) {
    const validStatuses = ["active", "inactive", "injured", "suspended"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === "inactive") {
      updates.leftAt = new Date();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  // Check jersey number conflict
  if (updates.jerseyNumber != null) {
    const jerseyNum = typeof updates.jerseyNumber === "string"
      ? parseInt(updates.jerseyNumber, 10)
      : updates.jerseyNumber;
    if (!isNaN(jerseyNum)) {
      const conflict = await models.Roster.findOne({
        teamId: new Types.ObjectId(params.teamId),
        jerseyNumber: jerseyNum,
        status: "active",
        _id: { $ne: new Types.ObjectId(params.rosterId) },
      }).lean();

      if (conflict) {
        return NextResponse.json(
          { error: `Jersey #${jerseyNum} is already assigned to ${(conflict as any).playerName}` },
          { status: 409 },
        );
      }
    }
  }

  const entry = await models.Roster.findOneAndUpdate(
    {
      _id: new Types.ObjectId(params.rosterId),
      teamId: new Types.ObjectId(params.teamId),
    },
    { $set: updates },
    { new: true },
  ).lean();

  if (!entry) {
    return NextResponse.json({ error: "Roster entry not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
