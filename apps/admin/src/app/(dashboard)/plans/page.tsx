"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Check,
  Pencil,
  Loader2,
  Save,
  X,
  CreditCard,
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

interface Plan {
  _id: string;
  planId: string;
  name: string;
  description: string;
  features: string[];
  limits: {
    users: number;
    locations: number;
    products: number;
    ordersPerMonth: number;
    storageGb: number;
  };
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

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingStripe, setEditingStripe] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [priceEdit, setPriceEdit] = useState({
    monthly: 0,
    annual: 0,
  });
  const [stripeEdit, setStripeEdit] = useState({
    stripePriceIdMonthly: "",
    stripePriceIdAnnual: "",
    addOns: [] as { featureId: string; stripePriceId: string }[],
  });

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/plans");
    const data = await res.json();
    setPlans(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const startPriceEdit = (plan: Plan) => {
    setEditingPlan(plan.planId);
    setPriceEdit({
      monthly: plan.pricing.monthly,
      annual: plan.pricing.annual,
    });
  };

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

  const savePricing = async (plan: Plan) => {
    setSaving(true);
    await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.planId,
        pricing: { ...plan.pricing, ...priceEdit },
      }),
    });
    setEditingPlan(null);
    setSaving(false);
    fetchPlans();
  };

  const saveStripeIds = async (plan: Plan) => {
    setSaving(true);

    const updatedAddOns = plan.addOns.map((addon) => {
      const edit = stripeEdit.addOns.find(
        (a) => a.featureId === addon.featureId
      );
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage subscription plans, pricing, and Stripe price IDs
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.planId}
            className={cn(!plan.isActive && "opacity-60")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {plan.description}
                  </CardDescription>
                </div>
                {!plan.isActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing Section */}
              {editingPlan === plan.planId ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Price (cents)</Label>
                    <Input
                      type="number"
                      value={priceEdit.monthly}
                      onChange={(e) =>
                        setPriceEdit((p) => ({
                          ...p,
                          monthly: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Annual Price (cents)</Label>
                    <Input
                      type="number"
                      value={priceEdit.annual}
                      onChange={(e) =>
                        setPriceEdit((p) => ({
                          ...p,
                          annual: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => savePricing(plan)}
                      disabled={saving}
                    >
                      <Save className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPlan(null)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${(plan.pricing.monthly / 100).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ${(plan.pricing.annual / 100).toFixed(0)}/yr (save{" "}
                    {Math.round(
                      (1 - plan.pricing.annual / (plan.pricing.monthly * 12)) *
                        100
                    )}
                    %)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => startPriceEdit(plan)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit pricing
                  </Button>
                </div>
              )}

              <Separator />

              {/* Stripe Price IDs Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
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
                      <Pencil className="h-3 w-3" />
                      Edit
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
                          setStripeEdit((s) => ({
                            ...s,
                            stripePriceIdMonthly: e.target.value,
                          }))
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
                          setStripeEdit((s) => ({
                            ...s,
                            stripePriceIdAnnual: e.target.value,
                          }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>

                    {/* Add-on price IDs */}
                    {plan.addOns.length > 0 && (
                      <>
                        <Separator />
                        <p className="text-xs font-medium text-muted-foreground">
                          Add-on Price IDs
                        </p>
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
                                onChange={(e) => {
                                  setStripeEdit((s) => ({
                                    ...s,
                                    addOns: s.addOns.map((a) =>
                                      a.featureId === addon.featureId
                                        ? {
                                            ...a,
                                            stripePriceId: e.target.value,
                                          }
                                        : a
                                    ),
                                  }));
                                }}
                                className="font-mono text-xs"
                              />
                            </div>
                          );
                        })}
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveStripeIds(plan)}
                        disabled={saving}
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingStripe(null)}
                      >
                        <X className="mr-1 h-3 w-3" />
                        Cancel
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
                            : "text-destructive"
                        )}
                      >
                        {plan.pricing.stripePriceIdMonthly || "not set"}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual:</span>
                      <code
                        className={cn(
                          "font-mono",
                          plan.pricing.stripePriceIdAnnual
                            ? "text-foreground"
                            : "text-destructive"
                        )}
                      >
                        {plan.pricing.stripePriceIdAnnual || "not set"}
                      </code>
                    </div>
                    {plan.addOns.map((addon) => (
                      <div key={addon.featureId} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {addon.name}:
                        </span>
                        <code
                          className={cn(
                            "font-mono",
                            addon.pricing.stripePriceId
                              ? "text-foreground"
                              : "text-destructive"
                          )}
                        >
                          {addon.pricing.stripePriceId || "not set"}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Limits */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Limits</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Users:</span>{" "}
                    <span className="font-medium">
                      {plan.limits.users >= 999
                        ? "Unlimited"
                        : plan.limits.users}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Locations:</span>{" "}
                    <span className="font-medium">
                      {plan.limits.locations >= 999
                        ? "Unlimited"
                        : plan.limits.locations}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Products:</span>{" "}
                    <span className="font-medium">
                      {plan.limits.products >= 9999
                        ? "Unlimited"
                        : plan.limits.products}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Orders/mo:</span>{" "}
                    <span className="font-medium">
                      {plan.limits.ordersPerMonth >= 99999
                        ? "Unlimited"
                        : plan.limits.ordersPerMonth.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Features */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Features</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
