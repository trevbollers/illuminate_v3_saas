"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Check,
  Pencil,
  Loader2,
  Save,
  X,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
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
import { Input } from "@illuminate/ui/src/components/input";
import { Label } from "@illuminate/ui/src/components/label";
import { Separator } from "@illuminate/ui/src/components/separator";
import { Textarea } from "@illuminate/ui/src/components/textarea";
import { cn } from "@illuminate/ui/src/lib/utils";

interface PlanAddOn {
  featureId: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    stripePriceId?: string;
  };
}

interface PlanLimits {
  users: number;
  locations: number;
  products: number;
  ordersPerMonth: number;
  storageGb: number;
}

interface Plan {
  _id: string;
  planId: string;
  name: string;
  description: string;
  features: string[];
  limits: PlanLimits;
  pricing: {
    monthly: number;
    annual: number;
    stripePriceIdMonthly?: string;
    stripePriceIdAnnual?: string;
  };
  addOns: PlanAddOn[];
  isActive: boolean;
  sortOrder: number;
}

const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  users: "Max Users",
  locations: "Max Locations",
  products: "Max Products",
  ordersPerMonth: "Orders / Month",
  storageGb: "Storage (GB)",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    status: "success" | "error" | "partial";
    message: string;
  } | null>(null);

  // Pricing edit
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [priceEdit, setPriceEdit] = useState({ monthly: 0, annual: 0 });

  // Stripe IDs edit
  const [editingStripe, setEditingStripe] = useState<string | null>(null);
  const [stripeEdit, setStripeEdit] = useState({
    stripePriceIdMonthly: "",
    stripePriceIdAnnual: "",
    addOns: [] as { featureId: string; stripePriceId: string }[],
  });

  // Limits edit
  const [editingLimits, setEditingLimits] = useState<string | null>(null);
  const [limitsEdit, setLimitsEdit] = useState<PlanLimits>({
    users: 0,
    locations: 0,
    products: 0,
    ordersPerMonth: 0,
    storageGb: 0,
  });

  // Features edit (one feature per line in textarea)
  const [editingFeatures, setEditingFeatures] = useState<string | null>(null);
  const [featuresEdit, setFeaturesEdit] = useState("");

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/plans");
    const data = await res.json();
    setPlans(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // --- Sync from Stripe ---
  const syncFromStripe = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/plans/stripe-sync", { method: "POST" });
      const data = await res.json();
      const errors = data.results.filter((r: any) => r.status === "error");
      const imported = data.results.filter((r: any) => r.status === "ok");
      if (errors.length === 0) {
        setSyncResult({
          status: "success",
          message: `Imported ${imported.length} plan(s) from Stripe: ${imported.map((r: any) => r.name).join(", ")}`,
        });
      } else if (errors.length < data.results.length) {
        setSyncResult({
          status: "partial",
          message: `${errors.length} plan(s) failed: ${errors.map((e: any) => e.planId).join(", ")}`,
        });
      } else {
        setSyncResult({ status: "error", message: errors[0].details });
      }
      fetchPlans();
    } catch {
      setSyncResult({
        status: "error",
        message: "Request failed. Check your STRIPE_SECRET_KEY.",
      });
    } finally {
      setSyncing(false);
    }
  };

  // --- Pricing ---
  const startPriceEdit = (plan: Plan) => {
    setEditingPlan(plan.planId);
    setPriceEdit({ monthly: plan.pricing.monthly, annual: plan.pricing.annual });
  };

  const savePricing = async (plan: Plan) => {
    setSaving(true);
    await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.planId, pricing: { ...plan.pricing, ...priceEdit } }),
    });
    setEditingPlan(null);
    setSaving(false);
    fetchPlans();
  };

  // --- Stripe IDs ---
  const startStripeEdit = (plan: Plan) => {
    setEditingStripe(plan.planId);
    setStripeEdit({
      stripePriceIdMonthly: plan.pricing.stripePriceIdMonthly || "",
      stripePriceIdAnnual: plan.pricing.stripePriceIdAnnual || "",
      addOns: plan.addOns.map((a) => ({
        featureId: a.featureId,
        stripePriceId: a.pricing.stripePriceId || "",
      })),
    });
  };

  const saveStripeIds = async (plan: Plan) => {
    setSaving(true);
    const updatedAddOns = plan.addOns.map((addon) => {
      const edit = stripeEdit.addOns.find((a) => a.featureId === addon.featureId);
      return {
        ...addon,
        pricing: {
          ...addon.pricing,
          stripePriceId: edit?.stripePriceId || addon.pricing.stripePriceId,
        },
      };
    });
    await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.planId,
        pricing: {
          ...plan.pricing,
          stripePriceIdMonthly: stripeEdit.stripePriceIdMonthly,
          stripePriceIdAnnual: stripeEdit.stripePriceIdAnnual,
        },
        addOns: updatedAddOns,
      }),
    });
    setEditingStripe(null);
    setSaving(false);
    fetchPlans();
  };

  // --- Limits ---
  const startLimitsEdit = (plan: Plan) => {
    setEditingLimits(plan.planId);
    setLimitsEdit({ ...plan.limits });
  };

  const saveLimits = async (plan: Plan) => {
    setSaving(true);
    await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.planId, limits: limitsEdit }),
    });
    setEditingLimits(null);
    setSaving(false);
    fetchPlans();
  };

  // --- Features ---
  const startFeaturesEdit = (plan: Plan) => {
    setEditingFeatures(plan.planId);
    setFeaturesEdit(plan.features.join("\n"));
  };

  const saveFeatures = async (plan: Plan) => {
    setSaving(true);
    const features = featuresEdit
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.planId, features }),
    });
    setEditingFeatures(null);
    setSaving(false);
    fetchPlans();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
          <p className="mt-1 text-muted-foreground">
            Stripe is the source of truth for names and pricing. Set features and limits here.
          </p>
        </div>
        <Button onClick={syncFromStripe} disabled={syncing} variant="outline">
          {syncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {syncing ? "Importing…" : "Import from Stripe"}
        </Button>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            syncResult.status === "success" &&
              "border-green-200 bg-green-50 text-green-800",
            syncResult.status === "partial" &&
              "border-yellow-200 bg-yellow-50 text-yellow-800",
            syncResult.status === "error" &&
              "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {syncResult.status === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {syncResult.message}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.planId} className={cn(!plan.isActive && "opacity-60")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="mt-1">{plan.description}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!plan.isActive && <Badge variant="secondary">Inactive</Badge>}
                  {plan.pricing.monthly === 0 && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      Free
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* ── Pricing ── */}
              {editingPlan === plan.planId ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Price (cents)</Label>
                    <Input
                      type="number"
                      value={priceEdit.monthly}
                      onChange={(e) =>
                        setPriceEdit((p) => ({ ...p, monthly: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Annual Price (cents)</Label>
                    <Input
                      type="number"
                      value={priceEdit.annual}
                      onChange={(e) =>
                        setPriceEdit((p) => ({ ...p, annual: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => savePricing(plan)} disabled={saving}>
                      <Save className="mr-1 h-3 w-3" />Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>
                      <X className="mr-1 h-3 w-3" />Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-1">
                    {plan.pricing.monthly === 0 ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          ${(plan.pricing.monthly / 100).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground">/mo</span>
                      </>
                    )}
                  </div>
                  {plan.pricing.annual > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      ${(plan.pricing.annual / 100).toFixed(0)}/yr
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 gap-1"
                    onClick={() => startPriceEdit(plan)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit pricing
                  </Button>
                </div>
              )}

              <Separator />

              {/* ── Stripe Price IDs ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-sm font-medium">
                    <CreditCard className="h-3.5 w-3.5" />
                    Stripe Price IDs
                  </h4>
                  {editingStripe !== plan.planId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => startStripeEdit(plan)}
                    >
                      <Pencil className="h-3 w-3" />Edit
                    </Button>
                  )}
                </div>

                {editingStripe === plan.planId ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Monthly Price ID</Label>
                      <Input
                        placeholder="price_..."
                        value={stripeEdit.stripePriceIdMonthly}
                        onChange={(e) =>
                          setStripeEdit((s) => ({ ...s, stripePriceIdMonthly: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Annual Price ID</Label>
                      <Input
                        placeholder="price_..."
                        value={stripeEdit.stripePriceIdAnnual}
                        onChange={(e) =>
                          setStripeEdit((s) => ({ ...s, stripePriceIdAnnual: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    {plan.addOns.length > 0 && (
                      <>
                        <Separator />
                        <p className="text-xs font-medium text-muted-foreground">Add-on Price IDs</p>
                        {plan.addOns.map((addon) => {
                          const editAddon = stripeEdit.addOns.find(
                            (a) => a.featureId === addon.featureId
                          );
                          return (
                            <div key={addon.featureId} className="space-y-1">
                              <Label className="text-xs">{addon.name}</Label>
                              <Input
                                placeholder="price_..."
                                value={editAddon?.stripePriceId || ""}
                                onChange={(e) =>
                                  setStripeEdit((s) => ({
                                    ...s,
                                    addOns: s.addOns.map((a) =>
                                      a.featureId === addon.featureId
                                        ? { ...a, stripePriceId: e.target.value }
                                        : a
                                    ),
                                  }))
                                }
                                className="font-mono text-xs"
                              />
                            </div>
                          );
                        })}
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveStripeIds(plan)} disabled={saving}>
                        <Save className="mr-1 h-3 w-3" />Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingStripe(null)}>
                        <X className="mr-1 h-3 w-3" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly:</span>
                      <code
                        className={cn(
                          "font-mono",
                          plan.pricing.stripePriceIdMonthly
                            ? "text-foreground"
                            : plan.pricing.monthly === 0
                            ? "text-muted-foreground"
                            : "text-destructive"
                        )}
                      >
                        {plan.pricing.stripePriceIdMonthly ||
                          (plan.pricing.monthly === 0 ? "n/a (free)" : "not set")}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual:</span>
                      <code
                        className={cn(
                          "font-mono",
                          plan.pricing.stripePriceIdAnnual
                            ? "text-foreground"
                            : plan.pricing.annual === 0
                            ? "text-muted-foreground"
                            : "text-destructive"
                        )}
                      >
                        {plan.pricing.stripePriceIdAnnual ||
                          (plan.pricing.annual === 0 ? "n/a (free)" : "not set")}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Limits ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Limits</h4>
                  {editingLimits !== plan.planId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => startLimitsEdit(plan)}
                    >
                      <Pencil className="h-3 w-3" />Edit
                    </Button>
                  )}
                </div>

                {editingLimits === plan.planId ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(LIMIT_LABELS) as (keyof PlanLimits)[]).map((key) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{LIMIT_LABELS[key]}</Label>
                          <Input
                            type="number"
                            value={limitsEdit[key]}
                            onChange={(e) =>
                              setLimitsEdit((l) => ({ ...l, [key]: Number(e.target.value) }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveLimits(plan)} disabled={saving}>
                        <Save className="mr-1 h-3 w-3" />Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingLimits(null)}>
                        <X className="mr-1 h-3 w-3" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(LIMIT_LABELS) as (keyof PlanLimits)[]).map((key) => (
                      <div key={key} className="text-sm">
                        <span className="text-muted-foreground">{LIMIT_LABELS[key]}:</span>{" "}
                        <span className="font-medium">
                          {plan.limits?.[key] >= 999 ? "∞" : plan.limits?.[key] ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Features ── */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">Features</h4>
                  {editingFeatures !== plan.planId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => startFeaturesEdit(plan)}
                    >
                      <Pencil className="h-3 w-3" />Edit
                    </Button>
                  )}
                </div>

                {editingFeatures === plan.planId ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">One feature per line</p>
                    <Textarea
                      value={featuresEdit}
                      onChange={(e) => setFeaturesEdit(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                      placeholder="Basic inventory tracking&#10;Up to 3 users&#10;Email support"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveFeatures(plan)} disabled={saving}>
                        <Save className="mr-1 h-3 w-3" />Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingFeatures(null)}
                      >
                        <X className="mr-1 h-3 w-3" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {plan.features.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No features set — click Edit to add
                      </p>
                    ) : (
                      plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
