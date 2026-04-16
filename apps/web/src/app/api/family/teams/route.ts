export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import {
  connectPlatformDB,
  connectTenantDB,
  connectFamilyDB,
  getOrgModels,
  registerOrgModels,
  getFamilyModels,
  User,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/family/teams — teams this user is connected to, split by role.
 *
 * Returns two arrays:
 *   coaching: teams the user is a coach / assistant coach / team manager of
 *             (derived from their user.memberships with staff roles and
 *              teamIds; enriched with team + org details)
 *   playing:  teams that family players are rostered on
 *             (derived from FamilyPlayer.teamHistory entries with no leftAt)
 *
 * Both include a deep link to the relevant dashboard (coaching) or the
 * team name for display (playing). The UI renders each as a card.
 */

const STAFF_ROLES = new Set([
  "org_owner",
  "org_admin",
  "head_coach",
  "assistant_coach",
  "team_manager",
]);

const ROLE_LABELS: Record<string, string> = {
  org_owner: "Owner",
  org_admin: "Admin",
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  team_manager: "Team Manager",
};

interface CoachingTeam {
  tenantSlug: string;
  tenantName: string;
  teamId: string;
  teamName: string;
  divisionKey?: string;
  sport?: string;
  role: string;
  roleLabel: string;
  teamUrl: string;
}

interface PlayingTeam {
  tenantSlug: string;
  tenantName: string;
  teamId: string;
  teamName: string;
  sport?: string;
  season?: string;
  year?: number;
  playerId: string;
  playerName: string;
  playerPhotoUrl?: string;
  jerseyNumber?: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = (await User.findById(session.user.id).lean()) as any;
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dashUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dash.goparticipate.com";

  // ─── Coaching teams (from user.memberships) ─────────────────────────────
  const coaching: CoachingTeam[] = [];
  const staffMemberships = (user.memberships ?? []).filter(
    (m: any) =>
      m.isActive &&
      m.tenantType === "organization" &&
      STAFF_ROLES.has(m.role) &&
      (m.teamIds?.length ?? 0) > 0,
  );

  if (staffMemberships.length > 0) {
    const tenantIds = staffMemberships.map((m: any) => m.tenantId);
    const tenants = (await Tenant.find({ _id: { $in: tenantIds } })
      .select("_id name slug")
      .lean()) as any[];
    const tenantMap = new Map(tenants.map((t) => [t._id.toString(), t]));

    for (const m of staffMemberships as any[]) {
      const tenant = tenantMap.get(m.tenantId.toString());
      if (!tenant) continue;
      try {
        const orgConn = await connectTenantDB(tenant.slug, "organization");
        registerOrgModels(orgConn);
        const orgModels = getOrgModels(orgConn);
        const teams = (await orgModels.Team.find({
          _id: { $in: m.teamIds },
          isActive: true,
        })
          .select("_id name divisionKey sport")
          .lean()) as any[];
        for (const t of teams) {
          coaching.push({
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            teamId: t._id.toString(),
            teamName: t.name,
            divisionKey: t.divisionKey,
            sport: t.sport,
            role: m.role,
            roleLabel: ROLE_LABELS[m.role] ?? m.role,
            teamUrl: `${dashUrl}/teams/${t._id.toString()}`,
          });
        }
      } catch (err) {
        console.error("[family/teams] coaching fetch failed", tenant.slug, err);
      }
    }
  }

  // ─── Playing teams (from FamilyPlayer.teamHistory) ──────────────────────
  const playing: PlayingTeam[] = [];
  if (user.familyId) {
    try {
      const famConn = await connectFamilyDB(user.familyId.toString());
      const famModels = getFamilyModels(famConn);
      const players = (await famModels.FamilyPlayer.find({ isActive: true })
        .select("_id firstName lastName currentPhotoUrl teamHistory")
        .lean()) as any[];

      for (const p of players) {
        const current = (p.teamHistory ?? []).filter(
          (t: any) => !t.leftAt,
        );
        for (const t of current) {
          playing.push({
            tenantSlug: t.tenantSlug,
            tenantName: t.tenantName,
            teamId: t.teamId,
            teamName: t.teamName,
            sport: t.sport,
            season: t.season,
            year: t.year,
            playerId: p._id.toString(),
            playerName: `${p.firstName} ${p.lastName}`.trim(),
            playerPhotoUrl: p.currentPhotoUrl,
            jerseyNumber: t.jerseyNumber,
          });
        }
      }
    } catch (err) {
      console.error("[family/teams] playing fetch failed", err);
    }
  }

  return NextResponse.json({ coaching, playing });
}
