export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectPlatformDB, Tenant, User, Plan } from "@goparticipate/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectPlatformDB();

  const [tenants, plans] = await Promise.all([
    Tenant.find().populate("owner", "name email").lean(),
    Plan.find().lean(),
  ]);

  const planPriceMap = new Map(plans.map((p) => [p.planId, p.pricing.monthly]));
  const planNameMap = new Map(plans.map((p) => [p.planId, p.name]));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Active/trialing tenant set
  const liveStatuses = new Set(["active", "trialing"]);

  // MRR — only count "active" tenants (trialing haven't paid yet)
  const activeTenants = tenants.filter((t) => t.plan.status === "active");
  const mrr = activeTenants.reduce(
    (sum, t) => sum + (planPriceMap.get(t.plan.planId) ?? 0) / 100,
    0
  );

  // All active+trialing count
  const activeTenantCount = tenants.filter((t) =>
    liveStatuses.has(t.plan.status)
  ).length;

  // New signups this month
  const newSignupsThisMonth = tenants.filter(
    (t) => new Date(t.createdAt as Date) >= startOfMonth
  ).length;

  // Churn rate — canceled in last 30 days / (active 30 days ago estimate)
  const canceledLast30 = tenants.filter(
    (t) =>
      t.plan.status === "canceled" &&
      t.plan.canceledAt &&
      new Date(t.plan.canceledAt) >= thirtyDaysAgo
  ).length;
  const churnRate =
    tenants.length > 0
      ? ((canceledLast30 / tenants.length) * 100).toFixed(1)
      : "0.0";

  // Revenue trend — last 6 months (approximate from tenant creation + plan price)
  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthLabel = monthStart.toLocaleString("en-US", { month: "short" });

    const activeAtMonth = tenants.filter((t) => {
      const created = new Date(t.createdAt as Date);
      if (created >= monthEnd) return false; // not yet created
      if (t.plan.status === "canceled") {
        // exclude if canceled before this month
        const canceledAt = t.plan.canceledAt
          ? new Date(t.plan.canceledAt)
          : null;
        if (canceledAt && canceledAt < monthStart) return false;
      }
      return t.plan.status === "active" || t.plan.status === "trialing";
    });

    const monthMrr = activeAtMonth.reduce(
      (sum, t) => sum + (planPriceMap.get(t.plan.planId) ?? 0) / 100,
      0
    );
    revenueByMonth.push({ month: monthLabel, revenue: Math.round(monthMrr) });
  }

  // Recent signups — latest 5 tenants
  const recentSignups = [...tenants]
    .sort(
      (a, b) =>
        new Date(b.createdAt as Date).getTime() -
        new Date(a.createdAt as Date).getTime()
    )
    .slice(0, 5)
    .map((t) => ({
      business: t.name,
      owner: (t.owner as any)?.name ?? "—",
      plan: planNameMap.get(t.plan.planId) ?? t.plan.planId,
      date: new Date(t.createdAt as Date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }));

  return NextResponse.json({
    mrr: Math.round(mrr),
    activeTenants: activeTenantCount,
    newSignupsThisMonth,
    churnRate,
    revenueByMonth,
    recentSignups,
  });
}
