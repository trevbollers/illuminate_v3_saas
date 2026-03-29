export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { connectPlatformDB, Tenant, Plan } from "@goparticipate/db";
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

  const activeTenants = tenants.filter((t) => t.plan.status === "active");
  const mrr = activeTenants.reduce(
    (sum, t) => sum + (planPriceMap.get(t.plan.planId) ?? 0) / 100,
    0
  );
  const arr = mrr * 12;
  const avgRevenuePerTenant =
    activeTenants.length > 0 ? mrr / activeTenants.length : 0;

  // Failed payments — tenants with past_due status
  const failedPayments = tenants
    .filter((t) => t.plan.status === "past_due")
    .map((t) => ({
      tenant: t.name,
      email: (t.owner as any)?.email ?? "—",
      amount: t.plan.lastPaymentAmount
        ? `$${(t.plan.lastPaymentAmount / 100).toFixed(2)}`
        : `$${((planPriceMap.get(t.plan.planId) ?? 0) / 100).toFixed(2)}`,
      failedAt: t.plan.lastPaymentAt
        ? new Date(t.plan.lastPaymentAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      reason: "Payment failed",
      retries: 0,
    }));

  // Upcoming renewals — next 14 days
  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const upcomingRenewals = tenants
    .filter((t) => {
      if (!t.plan.currentPeriodEnd) return false;
      const end = new Date(t.plan.currentPeriodEnd);
      return end >= now && end <= in14Days;
    })
    .sort(
      (a, b) =>
        new Date(a.plan.currentPeriodEnd!).getTime() -
        new Date(b.plan.currentPeriodEnd!).getTime()
    )
    .map((t) => ({
      tenant: t.name,
      plan: planNameMap.get(t.plan.planId) ?? t.plan.planId,
      amount: `$${((planPriceMap.get(t.plan.planId) ?? 0) / 100).toFixed(2)}`,
      renewsAt: new Date(t.plan.currentPeriodEnd!).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      ),
    }));

  return NextResponse.json({
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    avgRevenuePerTenant: Math.round(avgRevenuePerTenant * 100) / 100,
    failedPaymentCount: failedPayments.length,
    failedPayments,
    upcomingRenewals,
  });
}
