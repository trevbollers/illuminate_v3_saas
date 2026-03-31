export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels, connectTenantDB, getOrgModels } from "@goparticipate/db";

/**
 * GET /api/family/schedule — aggregate upcoming schedule across all connected orgs
 *
 * Reads family DB for org connections + player team history,
 * then queries each org's DB for upcoming events on those teams.
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ events: [] });

  const conn = await connectFamilyDB(familyId);
  const models = getFamilyModels(conn);

  const [profile, players] = await Promise.all([
    models.FamilyProfile.findOne().lean(),
    models.FamilyPlayer.find({ isActive: true }).lean(),
  ]);

  if (!profile) return NextResponse.json({ events: [] });

  // Collect all active org connections + team IDs from player history
  const orgSlugs = (profile as any).orgConnections
    ?.filter((c: any) => c.status === "active")
    .map((c: any) => c.tenantSlug) || [];

  // Also extract team IDs per org from player team history
  const orgTeamMap = new Map<string, Set<string>>();
  for (const player of players as any[]) {
    for (const th of player.teamHistory || []) {
      if (!th.tenantSlug || !th.teamId) continue;
      if (!orgTeamMap.has(th.tenantSlug)) orgTeamMap.set(th.tenantSlug, new Set());
      orgTeamMap.get(th.tenantSlug)!.add(th.teamId);
      if (!orgSlugs.includes(th.tenantSlug)) orgSlugs.push(th.tenantSlug);
    }
  }

  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const allEvents: any[] = [];

  for (const slug of orgSlugs) {
    try {
      const orgConn = await connectTenantDB(slug, "organization");
      const orgModels = getOrgModels(orgConn);

      const teamIds = orgTeamMap.get(slug);
      const filter: any = {
        isCancelled: { $ne: true },
        startTime: { $gte: now, $lte: twoWeeksOut },
      };

      // Only show events for the family's teams + org-wide events
      if (teamIds && teamIds.size > 0) {
        const teamIdArray = [...teamIds];
        filter.$or = [
          { teamId: { $in: teamIdArray } },
          { teamIds: { $in: teamIdArray } },
          { isOrgWide: true },
        ];
      } else {
        filter.isOrgWide = true;
      }

      const events = await orgModels.OrgEvent.find(filter)
        .sort({ startTime: 1 })
        .limit(20)
        .lean();

      // Resolve team names
      const allTeamIds = new Set<string>();
      for (const e of events as any[]) {
        if (e.teamId) allTeamIds.add(e.teamId.toString());
        if (e.teamIds) for (const id of e.teamIds) allTeamIds.add(id.toString());
      }

      const teams = allTeamIds.size > 0
        ? await orgModels.Team.find({ _id: { $in: [...allTeamIds] } }).select("_id name").lean()
        : [];
      const teamMap = new Map((teams as any[]).map((t) => [t._id.toString(), t.name]));

      for (const e of events as any[]) {
        const eventTeamIds = e.teamIds?.length > 0
          ? e.teamIds.map((id: any) => id.toString())
          : e.teamId ? [e.teamId.toString()] : [];

        allEvents.push({
          ...e,
          _id: e._id.toString(),
          orgSlug: slug,
          orgName: (profile as any).orgConnections?.find((c: any) => c.tenantSlug === slug)?.tenantName || slug,
          teamName: e.isOrgWide ? "All Teams" : eventTeamIds.map((id: string) => teamMap.get(id) || "").filter(Boolean).join(", "),
        });
      }
    } catch (err) {
      console.error(`[family:schedule] Error loading ${slug}:`, err);
    }
  }

  // Sort all events by start time
  allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return NextResponse.json({ events: allEvents });
}
