"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Loader2,
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
import { StatCard } from "@/components/stat-card";

interface BillingData {
  mrr: number;
  arr: number;
  avgRevenuePerTenant: number;
  failedPaymentCount: number;
  failedPayments: {
    tenant: string;
    email: string;
    amount: string;
    failedAt: string;
    reason: string;
    retries: number;
  }[];
  upcomingRenewals: {
    tenant: string;
    plan: string;
    amount: string;
    renewsAt: string;
  }[];
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mrr = data?.mrr ?? 0;
  const arr = data?.arr ?? 0;
  const avg = data?.avgRevenuePerTenant ?? 0;

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
        <Button variant="outline" className="gap-2" asChild>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Open Stripe Dashboard
          </a>
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`$${mrr.toLocaleString()}`}
          icon={DollarSign}
          description="active subscriptions"
        />
        <StatCard
          title="Annual Run Rate"
          value={`$${arr.toLocaleString()}`}
          icon={TrendingUp}
          description="projected"
        />
        <StatCard
          title="Avg Revenue / Tenant"
          value={`$${avg.toFixed(2)}`}
          icon={DollarSign}
          description="active tenants"
        />
        <StatCard
          title="Failed Payments"
          value={String(data?.failedPaymentCount ?? 0)}
          changeType={
            (data?.failedPaymentCount ?? 0) > 0 ? "negative" : "neutral"
          }
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
                  Tenants with past-due subscriptions
                </CardDescription>
              </div>
              {(data?.failedPaymentCount ?? 0) > 0 && (
                <Badge variant="destructive">
                  {data!.failedPaymentCount}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(data?.failedPayments?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No failed payments
              </p>
            ) : (
              <div className="space-y-4">
                {data!.failedPayments.map((payment, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{payment.tenant}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.email}
                      </p>
                      <Badge variant="destructive" className="text-[10px]">
                        {payment.reason}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{payment.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.failedAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {(data?.upcomingRenewals?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No renewals in the next 14 days
              </p>
            ) : (
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
                    {data!.upcomingRenewals.map((renewal, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-3 font-medium">{renewal.tenant}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="capitalize">
                            {renewal.plan}
                          </Badge>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
