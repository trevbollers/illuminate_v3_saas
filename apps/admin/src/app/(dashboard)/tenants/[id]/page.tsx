"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Trophy,
  Calendar,
  CreditCard,
  Ban,
  ArrowUpCircle,
  Clock,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Button } from "@goparticipate/ui/src/components/button";

interface TenantDetail {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  createdAt: string;
  plan: string;
  planId: string;
  subscriptionStatus: string;
  renewalDate: string | null;
  trialEnd: string | null;
  mrr: number;
  limits: {
    users: number;
    teams: number;
    players: number;
    eventsPerYear: number;
  } | null;
  usage: {
    users: number;
    maxUsers: number;
    teams: number;
    maxTeams: number;
  };
  members: {
    name: string;
    email: string;
    role: string;
    lastActive: string;
  }[];
}

function UsageBar({
  current,
  max,
  label,
}: {
  current: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current}
          {max > 0 ? ` / ${max}` : ""}
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

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active": return "default" as const;
    case "trialing": return "secondary" as const;
    case "past_due": return "destructive" as const;
    default: return "outline" as const;
  }
};

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/tenants/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load tenant");
        }
        return r.json();
      })
      .then(setTenant)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-4">
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ?? "Tenant not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
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
            variant={tenant.status === "active" ? "default" : "destructive"}
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
        <Button
          variant="outline"
          className="gap-2 text-orange-600 hover:text-orange-700"
        >
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
                <div className="mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {tenant.plan}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <Badge variant={statusBadgeVariant(tenant.subscriptionStatus)}>
                    {tenant.subscriptionStatus.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {tenant.subscriptionStatus === "trialing"
                    ? "Trial Ends"
                    : "Renewal Date"}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {tenant.subscriptionStatus === "trialing"
                    ? tenant.trialEnd ?? "—"
                    : tenant.renewalDate ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  {tenant.mrr > 0 ? `$${tenant.mrr}/mo` : "Free"}
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
              current={tenant.usage.teams}
              max={tenant.usage.maxTeams}
              label="Teams"
            />
            {tenant.limits && (
              <UsageBar
                current={0}
                max={tenant.limits.players}
                label="Players (limit)"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Staff Members", value: tenant.usage.users, icon: Users },
          { label: "Teams", value: tenant.usage.teams, icon: Trophy },
          {
            label: "Player Limit",
            value: tenant.limits?.players ?? "—",
            icon: Calendar,
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

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            {tenant.members.length} user
            {tenant.members.length !== 1 ? "s" : ""} associated with this
            tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenant.members.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No team members found
            </p>
          ) : (
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
                  {tenant.members.map((member, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {member.email}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            member.role === "owner"
                              ? "default"
                              : member.role === "admin"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {member.lastActive}
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
