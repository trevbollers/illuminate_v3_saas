export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getLeagueTenant } from "@/lib/tenant-db";

/**
 * GET /api/dashboard — league dashboard stats
 *
 * Returns: registeredTeams, totalPlayers, totalGames, completedGames, revenue
 */
export async function GET(): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { models } = tenant;

  // Count registrations (approved + pending = registered teams)
  const registeredTeams = await models.Registration.countDocuments({
    status: { $in: ["approved", "pending"] },
  });

  // Count unique players across all rosters in registrations
  const playerAgg = await models.Registration.aggregate([
    { $match: { status: { $in: ["approved", "pending"] } } },
    { $unwind: "$roster" },
    { $group: { _id: "$roster.playerId" } },
    { $count: "total" },
  ]);
  const totalPlayers = playerAgg[0]?.total || 0;

  // Game stats
  const [totalGames, completedGames] = await Promise.all([
    models.Game.countDocuments({}),
    models.Game.countDocuments({ status: "completed" }),
  ]);

  // Revenue from paid registrations
  const revenueAgg = await models.Registration.aggregate([
    { $match: { paymentStatus: "paid", amountPaid: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$amountPaid" } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total || 0;

  // Events by status
  const eventStatusAgg = await models.Event.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const eventsByStatus: Record<string, number> = {};
  for (const s of eventStatusAgg) {
    eventsByStatus[s._id] = s.count;
  }

  return NextResponse.json({
    registeredTeams,
    totalPlayers,
    totalGames,
    completedGames,
    totalRevenue,
    eventsByStatus,
  });
}
