export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import {
  connectPlatformDB,
  connectTenantDB,
  registerOrgModels,
  getOrgModels,
  registerLeagueModels,
  getLeagueModels,
  Tenant,
} from "@goparticipate/db";

/**
 * GET /api/dashboard — real data for the dashboard home page
 *
 * Returns: stats, upcoming events, recent activity
 */
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");

  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const conn = await connectTenantDB(tenantSlug, "organization");
    registerOrgModels(conn);
    const models = getOrgModels(conn);

    // ── Stat cards ──

    // Active players (across all teams)
    const rosters = await models.Roster.find({ status: "active" }).lean();
    const activePlayers = rosters.length;

    // Teams count
    const teamCount = await models.Team.countDocuments({ isActive: true });

    // Upcoming org events
    const now = new Date();
    const orgEvents = await models.OrgEvent.find({
      startDate: { $gte: now },
    })
      .sort({ startDate: 1 })
      .limit(10)
      .select("title type startDate endDate location teamIds")
      .lean();

    // Pending payments (unpaid transactions)
    const unpaidTotal = await models.Transaction.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const outstandingPayments = unpaidTotal[0]?.total || 0;

    // ── Team record from league standings ──
    let wins = 0;
    let losses = 0;

    await connectPlatformDB();
    const orgTenant = await Tenant.findOne({ slug: tenantSlug }).select("_id").lean();
    const orgTenantId = orgTenant ? (orgTenant as any)._id : null;

    if (orgTenantId) {
      const leagueTenants = await Tenant.find({ tenantType: "league", status: "active" })
        .select("slug")
        .lean();

      for (const league of leagueTenants as any[]) {
        try {
          const lConn = await connectTenantDB(league.slug, "league");
          registerLeagueModels(lConn);
          const lModels = getLeagueModels(lConn);

          // Find registrations for this org
          const regs = await lModels.Registration.find({
            orgTenantId: new Types.ObjectId(orgTenantId.toString()),
            status: { $in: ["approved", "pending"] },
          })
            .select("teamName eventId")
            .lean();

          if (regs.length === 0) continue;

          const teamNames = (regs as any[]).map((r) => r.teamName);
          const eventIds = [...new Set((regs as any[]).map((r) => r.eventId.toString()))];

          // Get standings for these teams
          const standings = await lModels.Standing.find({
            eventId: { $in: eventIds.map((id) => new Types.ObjectId(id)) },
            teamName: { $in: teamNames },
          })
            .select("wins losses")
            .lean();

          for (const s of standings as any[]) {
            wins += s.wins || 0;
            losses += s.losses || 0;
          }
        } catch {}
      }
    }

    // ── Upcoming events (org schedule + league events) ──
    const upcomingEvents: any[] = [];

    // Org events
    for (const ev of orgEvents as any[]) {
      // Get team names for this event
      let teamNames: string[] = [];
      if (ev.teamIds?.length > 0) {
        const teams = await models.Team.find({ _id: { $in: ev.teamIds } })
          .select("name")
          .lean();
        teamNames = (teams as any[]).map((t) => t.name);
      }
      upcomingEvents.push({
        title: ev.title,
        type: ev.type,
        date: ev.startDate,
        location: ev.location,
        teams: teamNames,
        source: "org",
      });
    }

    // League events this org is registered for
    if (orgTenantId) {
      const leagueTenants = await Tenant.find({ tenantType: "league", status: "active" })
        .select("slug name")
        .lean();

      for (const league of leagueTenants as any[]) {
        try {
          const lConn = await connectTenantDB(league.slug, "league");
          registerLeagueModels(lConn);
          const lModels = getLeagueModels(lConn);

          const regs = await lModels.Registration.find({
            orgTenantId: new Types.ObjectId(orgTenantId.toString()),
            status: { $in: ["approved", "pending"] },
          })
            .select("eventId teamName")
            .lean();

          if (regs.length === 0) continue;

          const eventIds = [...new Set((regs as any[]).map((r: any) => r.eventId.toString()))];
          const events = await lModels.Event.find({
            _id: { $in: eventIds.map((id) => new Types.ObjectId(id)) },
            startDate: { $gte: now },
          })
            .sort({ startDate: 1 })
            .select("name startDate locations status")
            .lean();

          for (const ev of events as any[]) {
            const eventRegs = (regs as any[]).filter((r: any) => r.eventId.toString() === ev._id.toString());
            upcomingEvents.push({
              title: ev.name,
              type: "tournament",
              date: ev.startDate,
              location: ev.locations?.[0]?.name || "",
              teams: eventRegs.map((r: any) => r.teamName),
              source: "league",
              leagueName: league.name,
              status: ev.status,
            });
          }
        } catch {}
      }
    }

    upcomingEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // ── Recent activity (aggregate from recent records) ──
    const recentActivity: any[] = [];

    // Recent roster adds
    const recentRoster = await models.Roster.find({})
      .sort({ joinedAt: -1 })
      .limit(5)
      .select("playerName teamId joinedAt")
      .lean();
    for (const r of recentRoster as any[]) {
      const team = await models.Team.findById(r.teamId).select("name").lean();
      recentActivity.push({
        type: "roster_add",
        text: `${r.playerName} added to ${(team as any)?.name || "a team"}`,
        date: r.joinedAt,
      });
    }

    // Recent messages
    const recentMessages = await models.Message.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select("subject channel createdAt")
      .lean();
    for (const m of recentMessages as any[]) {
      recentActivity.push({
        type: "message",
        text: `Message: ${(m as any).subject || "New message"} (${(m as any).channel})`,
        date: (m as any).createdAt,
      });
    }

    // Recent invites accepted
    const recentAccepted = await models.Invite.find({ status: "accepted" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("email role updatedAt")
      .lean();
    for (const inv of recentAccepted as any[]) {
      recentActivity.push({
        type: "invite_accepted",
        text: `${inv.email} accepted invite as ${inv.role}`,
        date: inv.updatedAt,
      });
    }

    // Sort all activity by date
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      stats: {
        activePlayers,
        teamCount,
        upcomingEventCount: upcomingEvents.length,
        outstandingPayments,
        wins,
        losses,
      },
      upcomingEvents: upcomingEvents.slice(0, 5),
      recentActivity: recentActivity.slice(0, 8),
    });
  } catch (err) {
    console.error("[dashboard API]", err);
    return NextResponse.json({
      stats: { activePlayers: 0, teamCount: 0, upcomingEventCount: 0, outstandingPayments: 0, wins: 0, losses: 0 },
      upcomingEvents: [],
      recentActivity: [],
    });
  }
}
