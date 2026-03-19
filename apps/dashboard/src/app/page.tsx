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

const onboardingSteps = [
  { id: 1, title: "Create your first product", completed: true },
  { id: 2, title: "Set up a recipe", completed: true },
  { id: 3, title: "Add inventory items", completed: false },
  { id: 4, title: "Create a sales order", completed: false },
  { id: 5, title: "Invite a team member", completed: false },
];

const showOnboarding = true;

export default function DashboardPage() {
  const completedSteps = onboardingSteps.filter((s) => s.completed).length;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, Mike
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening at Premium Meats Co. today.
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
          value="12"
          change="+3 from yesterday"
          changeType="positive"
          icon={ShoppingCart}
        />
        <StatCard
          title="Revenue (This Month)"
          value="$48,290"
          change="+12.5% from last month"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Low Stock Alerts"
          value="4"
          change="2 critical items"
          changeType="negative"
          icon={AlertTriangle}
        />
        <StatCard
          title="Active Products"
          value="47"
          change="3 added this week"
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
