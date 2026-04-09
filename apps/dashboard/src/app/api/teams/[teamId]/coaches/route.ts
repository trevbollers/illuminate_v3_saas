export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import {
  connectPlatformDB,
  connectTenantDB,
  registerOrgModels,
  getOrgModels,
  User,
} from "@goparticipate/db";

/**
 * GET /api/teams/[teamId]/coaches — get coaches assigned to this team
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;
  if (!Types.ObjectId.isValid(teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  // Get team to find coach IDs
  const team = await models.Team.findById(teamId)
    .select("headCoachId coachIds managerIds")
    .lean();
  if (!team) {
    return NextResponse.json([]);
  }

  const t = team as any;
  const allIds = new Set<string>();
  if (t.headCoachId) allIds.add(t.headCoachId.toString());
  (t.coachIds || []).forEach((id: any) => allIds.add(id.toString()));
  (t.managerIds || []).forEach((id: any) => allIds.add(id.toString()));

  if (allIds.size === 0) {
    return NextResponse.json([]);
  }

  // Look up coach profiles
  const profiles = await models.CoachProfile.find({
    userId: { $in: [...allIds].map((id) => new Types.ObjectId(id)) },
    isActive: true,
  })
    .select("userId name photoUrl role email phone checkInCode")
    .lean();

  // Build role mapping from the team record
  const roleMap = new Map<string, string>();
  if (t.headCoachId) roleMap.set(t.headCoachId.toString(), "head_coach");
  (t.coachIds || []).forEach((id: any) => {
    if (!roleMap.has(id.toString())) roleMap.set(id.toString(), "assistant_coach");
  });
  (t.managerIds || []).forEach((id: any) => {
    if (!roleMap.has(id.toString())) roleMap.set(id.toString(), "team_manager");
  });

  // For coaches without profiles, create basic entries from the user IDs
  const profileUserIds = new Set((profiles as any[]).map((p) => p.userId.toString()));
  const result = (profiles as any[]).map((p) => ({
    ...p,
    role: roleMap.get(p.userId.toString()) || p.role,
  }));

  // Add entries for coaches without profiles — look up names from platform User records
  const missingIds = [...allIds].filter((id) => !profileUserIds.has(id));
  if (missingIds.length > 0) {
    await connectPlatformDB();
    const users = await User.find({
      _id: { $in: missingIds.map((id) => new Types.ObjectId(id)) },
    })
      .select("name email image")
      .lean();
    const userMap = new Map((users as any[]).map((u) => [u._id.toString(), u]));

    for (const id of missingIds) {
      const u = userMap.get(id);
      result.push({
        _id: id,
        userId: id,
        name: u?.name || "Coach",
        email: u?.email,
        photoUrl: u?.image,
        role: roleMap.get(id) || "assistant_coach",
      });
    }
  }

  return NextResponse.json(result);
}
