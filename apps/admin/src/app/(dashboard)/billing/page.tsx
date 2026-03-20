"use client";

import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@illuminate/ui/src/components/card";
import { Badge } from "@illuminate/ui/src/components/badge";
import { Button } from "@illuminate/ui/src/components/button";
import { StatCard } from "@/components/stat-card";

const failedPayments = [
  {
    tenant: "Mountain View Bakery",
    email: "lisa@mountainviewbakery.com",
    amount: "$79.00",
    failedAt: "Mar 16, 2026",
    reason: "Card declined",
    retries: 2,
  },
  {
    tenant: "Green Leaf Bistro",
    email: "david@greenleafbistro.com",
    amount: "$29.00",
    failedAt: "Mar 14, 2026",
    reason: "Insufficient funds",
    retries: 3,
  },
  {
    tenant: "Sunset Grill",
    email: "anna@sunsetgrill.com",
    amount: "$79.00",
    failedAt: "Mar 12, 2026",
    reason: "Card expired",
    retries: 1,
  },
];

const upcomingRenewals = [
  {
    tenant: "Coastal Coffee Co.",
    plan: "Professional",
    amount: "$79.00",
    renewsAt: "Mar 22, 2026",
  },
  {
    tenant: "Harbor Fish Market",
    plan: "Enterprise",
    amount: "$199.00",
    renewsAt: "Mar 23, 2026",
  },
  {
    tenant: "Urban Bites",
    plan: "Starter",
    amount: "$29.00",
    renewsAt: "Mar 25, 2026",
  },
  {
    tenant: "Sakura Sushi Bar",
    plan: "Starter",
    amount: "$29.00",
    renewsAt: "Mar 26, 2026",
  },
  {
    tenant: "The Daily Grind",
    plan: "Professional",
    amount: "$79.00",
    renewsAt: "Mar 28, 2026",
  },
  {
    tenant: "Fresh & Local Market",
    plan: "Enterprise",
    amount: "$199.00",
    renewsAt: "Mar 30, 2026",
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-muted-foreground">
            Revenue overview and payment management
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Open Stripe Dashboard
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value="$47,600"
          change="+8.2%"
          changeType="positive"
          icon={DollarSign}
          description="from last month"
        />
        <StatCard
          title="Annual Run Rate"
          value="$571,200"
          change="+8.2%"
          changeType="positive"
          icon={TrendingUp}
          description="projected"
        />
        <StatCard
          title="Avg Revenue / Tenant"
          value="$167.61"
          change="+$4.20"
          changeType="positive"
          icon={DollarSign}
          description="from last month"
        />
        <StatCard
          title="Failed Payments"
          value="3"
          change="+1"
          changeType="negative"
          icon={AlertTriangle}
          description="requiring attention"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Failed Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Failed Payments</CardTitle>
                <CardDescription>
                  Payments that need attention
                </CardDescription>
              </div>
              <Badge variant="destructive">{failedPayments.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {failedPayments.map((payment, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{payment.tenant}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.email}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="destructive" className="text-[10px]">
                        {payment.reason}
                      </Badge>
                      <span className="text-muted-foreground">
                        {payment.retries} retries
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{payment.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.failedAt}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 gap-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Renewals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Upcoming Renewals</CardTitle>
                <CardDescription>
                  Subscriptions renewing in the next 14 days
                </CardDescription>
              </div>
              <CalendarClock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Tenant
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Plan
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Renews
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingRenewals.map((renewal, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 font-medium">{renewal.tenant}</td>
                      <td className="py-3">
                        <Badge variant="outline">{renewal.plan}</Badge>
                      </td>
                      <td className="py-3 text-right font-medium">
                        {renewal.amount}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {renewal.renewsAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
