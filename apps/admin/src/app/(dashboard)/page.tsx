"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  Building2,
  UserPlus,
  TrendingDown,
  ArrowUpRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

interface Stats {
  mrr: number;
  activeTenants: number;
  newSignupsThisMonth: number;
  churnRate: string;
  revenueByMonth: { month: string; revenue: number }[];
  recentSignups: {
    business: string;
    owner: string;
    plan: string;
    date: string;
  }[];
}

const planBadgeVariant = (plan: string) => {
  const lower = plan.toLowerCase();
  if (lower === "enterprise") return "default" as const;
  if (lower === "professional") return "secondary" as const;
  return "outline" as const;
};

function fmt(dollars: number) {
  if (dollars >= 1000)
    return `$${(dollars / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `$${dollars.toLocaleString()}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Platform overview and key metrics
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${(stats?.mrr ?? 0).toLocaleString()}`}
          icon={DollarSign}
          description="active subscriptions"
        />
        <StatCard
          title="Active Tenants"
          value={String(stats?.activeTenants ?? 0)}
          icon={Building2}
          description="active + trialing"
        />
        <StatCard
          title="New Signups"
          value={String(stats?.newSignupsThisMonth ?? 0)}
          icon={UserPlus}
          description="this month"
        />
        <StatCard
          title="Churn Rate"
          value={`${stats?.churnRate ?? "0.0"}%`}
          icon={TrendingDown}
          description="canceled last 30 days"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>
              Monthly recurring revenue over the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.revenueByMonth?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats!.revenueByMonth}>
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(221.2, 83.2%, 53.3%)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(221.2, 83.2%, 53.3%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: "hsl(215.4, 16.3%, 46.9%)" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(215.4, 16.3%, 46.9%)" }}
                    tickFormatter={(v) => fmt(v)}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(214.3, 31.8%, 91.4%)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(221.2, 83.2%, 53.3%)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/tenants">
                <Building2 className="h-4 w-4" />
                View All Tenants
                <ArrowUpRight className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/billing">
                <DollarSign className="h-4 w-4" />
                Billing Overview
                <ArrowUpRight className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/features">
                <span className="flex h-4 w-4 items-center justify-center">
                  <span className="text-xs">FF</span>
                </span>
                Manage Feature Flags
                <ArrowUpRight className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="/plans">
                <span className="flex h-4 w-4 items-center justify-center">
                  <span className="text-xs">PP</span>
                </span>
                Plans & Pricing
                <ArrowUpRight className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Open Stripe Dashboard
                <ArrowUpRight className="ml-auto h-3 w-3 opacity-50" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Signups</CardTitle>
          <CardDescription>
            Latest businesses that joined the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(stats?.recentSignups?.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No signups yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Business
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Owner
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Plan
                    </th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats!.recentSignups.map((signup, i) => (
                    <tr
                      key={i}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3 font-medium">{signup.business}</td>
                      <td className="py-3 text-muted-foreground">
                        {signup.owner}
                      </td>
                      <td className="py-3">
                        <Badge variant={planBadgeVariant(signup.plan)}>
                          {signup.plan}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {signup.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
