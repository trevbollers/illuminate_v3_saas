export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/teams/[teamId] — get team details
export async function GET(
  _req: Request,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const team = await models.Team.findById(params.teamId).lean();
  if (!team || !(team as any).isActive) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}

// PUT /api/teams/[teamId] — update team
export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const body = await req.json();
  const allowedFields = ["name", "sport", "divisionKey", "season"];
  const updates: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  const team = await models.Team.findByIdAndUpdate(
    params.teamId,
    { $set: updates },
    { new: true },
  ).lean();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json(team);
}

// DELETE /api/teams/[teamId] — soft-delete (archive) team
export async function DELETE(
  _req: Request,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const models = getOrgModels(conn);

  await models.Team.findByIdAndUpdate(params.teamId, { $set: { isActive: false } });

  return NextResponse.json({ success: true });
}
