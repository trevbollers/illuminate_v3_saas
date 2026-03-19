"use client";

import { useState } from "react";
import { Check, Pencil, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@illuminate/ui/src/components/card";
import { Badge } from "@illuminate/ui/src/components/badge";
import { Button } from "@illuminate/ui/src/components/button";
import { Input } from "@illuminate/ui/src/components/input";
import { Label } from "@illuminate/ui/src/components/label";
import { Separator } from "@illuminate/ui/src/components/separator";
import { cn } from "@illuminate/ui/src/lib/utils";

interface Plan {
  id: string;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  subscribers: number;
  mrr: number;
  features: string[];
  limits: Record<string, string>;
  highlighted?: boolean;
}

const initialPlans: Plan[] = [
  {
    id: "plan_starter",
    name: "Starter",
    slug: "starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    subscribers: 142,
    mrr: 4118,
    features: [
      "Online ordering",
      "Basic menu management",
      "Email support",
      "Basic analytics",
      "Single location",
    ],
    limits: {
      Users: "5",
      Locations: "1",
      Products: "100",
      "Orders/month": "500",
    },
  },
  {
    id: "plan_professional",
    name: "Professional",
    slug: "professional",
    monthlyPrice: 79,
    yearlyPrice: 790,
    subscribers: 98,
    mrr: 7742,
    highlighted: true,
    features: [
      "Everything in Starter",
      "Multi-location support",
      "AI menu descriptions",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
      "Inventory management",
    ],
    limits: {
      Users: "15",
      Locations: "5",
      Products: "500",
      "Orders/month": "2,500",
    },
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    slug: "enterprise",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    subscribers: 44,
    mrr: 8756,
    features: [
      "Everything in Professional",
      "Unlimited locations",
      "Custom domain",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "White-label options",
      "SLA guarantee",
    ],
    limits: {
      Users: "Unlimited",
      Locations: "Unlimited",
      Products: "Unlimited",
      "Orders/month": "Unlimited",
    },
  },
];

export default function PlansPage() {
  const [plans] = useState(initialPlans);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    monthlyPrice: 0,
    yearlyPrice: 0,
  });

  const totalMRR = plans.reduce((acc, p) => acc + p.mrr, 0);
  const totalSubscribers = plans.reduce((acc, p) => acc + p.subscribers, 0);

  const startEdit = (plan: Plan) => {
    setEditingPlan(plan.id);
    setEditValues({
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
        <p className="mt-1 text-muted-foreground">
          Manage subscription plans &middot; {totalSubscribers} total
          subscribers &middot; ${totalMRR.toLocaleString()} MRR
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              plan.highlighted && "border-primary shadow-md"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="mt-1">
                    /{plan.slug}
                  </CardDescription>
                </div>
                {plan.highlighted && (
                  <Badge variant="default">Popular</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pricing */}
              {editingPlan === plan.id ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Monthly Price</Label>
                    <Input
                      type="number"
                      value={editValues.monthlyPrice}
                      onChange={(e) =>
                        setEditValues((p) => ({
                          ...p,
                          monthlyPrice: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Yearly Price</Label>
                    <Input
                      type="number"
                      value={editValues.yearlyPrice}
                      onChange={(e) =>
                        setEditValues((p) => ({
                          ...p,
                          yearlyPrice: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditingPlan(null)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingPlan(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ${plan.yearlyPrice}/yr (save{" "}
                    {Math.round(
                      (1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100
                    )}
                    %)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => startEdit(plan)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit pricing
                  </Button>
                </div>
              )}

              {/* Subscriber count */}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {plan.subscribers} subscribers
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${plan.mrr.toLocaleString()} MRR
                  </p>
                </div>
              </div>

              <Separator />

              {/* Limits */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Limits</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
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
            <CardFooter>
              <Button variant="outline" className="w-full">
                Edit Plan Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
