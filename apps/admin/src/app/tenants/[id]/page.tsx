"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  MapPin,
  Package,
  ShoppingCart,
  Calendar,
  CreditCard,
  Ban,
  ArrowUpCircle,
  Clock,
  Trash2,
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
import { Separator } from "@illuminate/ui/src/components/separator";

// Mock tenant data
const tenant = {
  id: "t_1",
  businessName: "Coastal Coffee Co.",
  slug: "coastal-coffee",
  status: "active",
  createdAt: "January 12, 2026",
  plan: "Professional",
  subscriptionStatus: "active",
  renewalDate: "April 12, 2026",
  mrr: 79,
  trialEndsAt: null,
  usage: {
    users: 8,
    maxUsers: 15,
    locations: 3,
    maxLocations: 5,
    products: 142,
    maxProducts: 500,
    orders: 1284,
  },
  users: [
    {
      name: "Sarah Mitchell",
      email: "sarah@coastalcoffee.com",
      role: "owner",
      lastActive: "2 hours ago",
    },
    {
      name: "Mike Johnson",
      email: "mike@coastalcoffee.com",
      role: "admin",
      lastActive: "1 day ago",
    },
    {
      name: "Emma Wilson",
      email: "emma@coastalcoffee.com",
      role: "staff",
      lastActive: "3 hours ago",
    },
    {
      name: "Alex Brown",
      email: "alex@coastalcoffee.com",
      role: "staff",
      lastActive: "5 days ago",
    },
    {
      name: "Chris Lee",
      email: "chris@coastalcoffee.com",
      role: "staff",
      lastActive: "1 hour ago",
    },
  ],
};

function UsageBar({
  current,
  max,
  label,
}: {
  current: number;
  max: number;
  label: string;
}) {
  const pct = Math.min((current / max) * 100, 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/tenants"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {tenant.businessName}
              </h1>
              <p className="mt-1 text-muted-foreground">
                /{tenant.slug} &middot; Created {tenant.createdAt}
              </p>
            </div>
          </div>
          <Badge
            variant={
              tenant.status === "active" ? "default" : "destructive"
            }
            className="text-sm"
          >
            {tenant.status}
          </Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2">
          <ArrowUpCircle className="h-4 w-4" />
          Upgrade Plan
        </Button>
        <Button variant="outline" className="gap-2">
          <Clock className="h-4 w-4" />
          Extend Trial
        </Button>
        <Button variant="outline" className="gap-2 text-orange-600 hover:text-orange-700">
          <Ban className="h-4 w-4" />
          Suspend
        </Button>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Tenant
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>Billing and plan information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{tenant.plan}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge variant="default">{tenant.subscriptionStatus}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Renewal Date</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {tenant.renewalDate}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  ${tenant.mrr}/mo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>Current resource utilization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageBar
              current={tenant.usage.users}
              max={tenant.usage.maxUsers}
              label="Users"
            />
            <UsageBar
              current={tenant.usage.locations}
              max={tenant.usage.maxLocations}
              label="Locations"
            />
            <UsageBar
              current={tenant.usage.products}
              max={tenant.usage.maxProducts}
              label="Products"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium">
                {tenant.usage.orders.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            label: "Users",
            value: tenant.usage.users,
            icon: Users,
          },
          {
            label: "Locations",
            value: tenant.usage.locations,
            icon: MapPin,
          },
          {
            label: "Products",
            value: tenant.usage.products,
            icon: Package,
          },
          {
            label: "Orders",
            value: tenant.usage.orders.toLocaleString(),
            icon: ShoppingCart,
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Users associated with this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="pb-3 text-left font-medium text-muted-foreground">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenant.users.map((user, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{user.email}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          user.role === "owner"
                            ? "default"
                            : user.role === "admin"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {user.lastActive}
                    </td>
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
