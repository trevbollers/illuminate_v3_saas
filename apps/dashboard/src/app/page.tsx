import {
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Package,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@illuminate/ui";
import { StatCard } from "@/components/stat-card";
import { RecentOrders } from "@/components/recent-orders";
import { LowStockAlert } from "@/components/low-stock-alert";
import { QuickActions } from "@/components/quick-actions";
import { auth } from "@illuminate/auth/edge";
import { connectPlatformDB, Tenant } from "@illuminate/db";

const ONBOARDING_STEPS = [
  { id: 1, title: "Create your first product" },
  { id: 2, title: "Set up a recipe" },
  { id: 3, title: "Add inventory items" },
  { id: 4, title: "Create a sales order" },
  { id: 5, title: "Invite a team member" },
];

export default async function DashboardPage() {
  const session = await auth();

  let userName = "there";
  let businessName = "your business";
  let onboardingStep = 0;
  let showOnboarding = true;

  if (session?.user) {
    userName = session.user.name?.split(" ")[0] ?? "there";

    if (session.user.tenantSlug) {
      try {
        await connectPlatformDB();
        const tenant = await Tenant.findOne({ slug: session.user.tenantSlug })
          .select("name onboardingStep status")
          .lean();

        if (tenant) {
          businessName = tenant.name;
          onboardingStep = tenant.onboardingStep ?? 0;
          showOnboarding = tenant.status === "onboarding" || onboardingStep < ONBOARDING_STEPS.length;
        }
      } catch (err) {
        console.error("[dashboard:page] Failed to fetch tenant:", err);
      }
    }
  }

  const onboardingSteps = ONBOARDING_STEPS.map((step, idx) => ({
    ...step,
    completed: idx < onboardingStep,
  }));
  const completedSteps = onboardingSteps.filter((s) => s.completed).length;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening at {businessName} today.
        </p>
      </div>

      {/* Onboarding checklist */}
      {showOnboarding && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Getting Started Checklist
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {completedSteps} of {onboardingSteps.length} completed
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${(completedSteps / onboardingSteps.length) * 100}%`,
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {onboardingSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2 rounded-md p-2"
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span
                    className={`text-sm ${
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Orders"
          value="0"
          change="No orders yet"
          changeType="neutral"
          icon={ShoppingCart}
        />
        <StatCard
          title="Revenue (This Month)"
          value="$0"
          change="Getting started"
          changeType="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Low Stock Alerts"
          value="0"
          change="No inventory yet"
          changeType="neutral"
          icon={AlertTriangle}
        />
        <StatCard
          title="Active Products"
          value="0"
          change="Add your first product"
          changeType="neutral"
          icon={Package}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RecentOrders />
        </div>
        <div className="space-y-6">
          <LowStockAlert />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
