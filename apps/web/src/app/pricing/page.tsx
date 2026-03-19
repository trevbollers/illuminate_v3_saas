"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@illuminate/ui/src/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@illuminate/ui/src/components/card";
import { Check, Sparkles, Brain } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PricingCard } from "@/components/pricing-card";

const plans = [
  {
    planId: "starter",
    name: "Starter",
    description: "For small shops getting started",
    monthlyPrice: 4900,
    yearlyPrice: 47000,
    features: [
      "Up to 5 users",
      "1 location",
      "100 products",
      "Basic inventory tracking",
      "Order management",
      "Email support",
      "Basic analytics",
    ],
  },
  {
    planId: "professional",
    name: "Professional",
    description: "For growing businesses that need more",
    monthlyPrice: 14900,
    yearlyPrice: 142800,
    isPopular: true,
    features: [
      "Up to 25 users",
      "5 locations",
      "Unlimited products",
      "Advanced inventory & lot tracking",
      "Recipe & production management",
      "Order management with routing",
      "Priority support",
      "Advanced analytics & reports",
      "Custom integrations",
    ],
  },
  {
    planId: "enterprise",
    name: "Enterprise",
    description: "For large operations with advanced needs",
    monthlyPrice: 39900,
    yearlyPrice: 382800,
    features: [
      "Unlimited users",
      "Unlimited locations",
      "Unlimited products",
      "Full inventory & production suite",
      "Advanced order fulfillment",
      "Dedicated account manager",
      "SSO / SAML authentication",
      "Audit logs & compliance",
      "SLA guarantee",
      "Custom integrations & API",
    ],
  },
];

const addons = [
  {
    icon: Sparkles,
    name: "AI Product Configurator",
    description:
      "Let AI help you create and optimize your product catalog. Smart suggestions for cuts, pricing, and descriptions based on industry data.",
    price: "$29",
  },
  {
    icon: Brain,
    name: "AI Inventory & MRP",
    description:
      "AI-powered demand forecasting, automatic reorder points, and material requirements planning to minimize waste and stockouts.",
    price: "$49",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Header */}
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-background" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the plan that fits your business. Upgrade or downgrade
              anytime.
            </p>

            {/* Billing toggle */}
            <div className="mt-10 flex items-center justify-center gap-4">
              <span
                className={`text-sm font-medium ${
                  !isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Monthly
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isAnnual}
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isAnnual ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                    isAnnual ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Annual
              </span>
              {isAnnual && (
                <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                  Save 20%
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3 lg:gap-6 items-start">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.planId}
                  {...plan}
                  isAnnual={isAnnual}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Add-ons */}
        <section className="border-t border-border bg-muted/20 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Powerful AI Add-ons
              </h2>
              <p className="mt-3 text-muted-foreground">
                Supercharge your workflow with AI-powered tools. Available on any
                plan.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              {addons.map((addon) => (
                <Card
                  key={addon.name}
                  className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30"
                >
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-primary/5" />
                  <CardHeader>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <addon.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{addon.name}</CardTitle>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        +{addon.price}
                      </span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ-style CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Not sure which plan is right for you?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with a 14-day free trial on any plan. No credit card
              required. Our team is happy to help you find the right fit.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
