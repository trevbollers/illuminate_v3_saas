"use client";

import {
  DollarSign,
  Building2,
  UserPlus,
  TrendingDown,
  ArrowUpRight,
  ExternalLink,
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

const revenueData = [
  { month: "Jul", revenue: 28400 },
  { month: "Aug", revenue: 31200 },
  { month: "Sep", revenue: 33800 },
  { month: "Oct", revenue: 35100 },
  { month: "Nov", revenue: 38400 },
  { month: "Dec", revenue: 40200 },
  { month: "Jan", revenue: 42800 },
  { month: "Feb", revenue: 44100 },
  { month: "Mar", revenue: 47600 },
];

const recentSignups = [
  {
    business: "Coastal Coffee Co.",
    owner: "Sarah Mitchell",
    plan: "Professional",
    date: "Mar 18, 2026",
  },
  {
    business: "Urban Bites",
    owner: "James Chen",
    plan: "Starter",
    date: "Mar 17, 2026",
  },
  {
    business: "Fresh & Local Market",
    owner: "Maria Rodriguez",
    plan: "Enterprise",
    date: "Mar 16, 2026",
  },
  {
    business: "The Daily Grind",
    owner: "Tom Baker",
    plan: "Professional",
    date: "Mar 15, 2026",
  },
  {
    business: "Sakura Sushi Bar",
    owner: "Yuki Tanaka",
    plan: "Starter",
    date: "Mar 14, 2026",
  },
];

const planBadgeVariant = (plan: string) => {
  switch (plan) {
    case "Enterprise":
      return "default" as const;
    case "Professional":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export default function AdminDashboard() {
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
          value="$47,600"
          change="+8.2%"
          changeType="positive"
          icon={DollarSign}
          description="from last month"
        />
        <StatCard
          title="Active Tenants"
          value="284"
          change="+12"
          changeType="positive"
          icon={Building2}
          description="this month"
        />
        <StatCard
          title="New Signups"
          value="38"
          change="+14.3%"
          changeType="positive"
          icon={UserPlus}
          description="this month"
        />
        <StatCard
          title="Churn Rate"
          value="2.4%"
          change="-0.3%"
          changeType="positive"
          icon={TrendingDown}
          description="from last month"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>
              Monthly recurring revenue over the past 9 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
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
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: "hsl(215.4, 16.3%, 46.9%)" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(215.4, 16.3%, 46.9%)" }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
            <Button variant="outline" className="justify-start gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Stripe Dashboard
              <ArrowUpRight className="ml-auto h-3 w-3 opacity-50" />
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
                {recentSignups.map((signup, i) => (
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
                    <td className="py-3 text-muted-foreground">{signup.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
