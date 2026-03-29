"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Users, Calendar, ShieldCheck, Trophy, Loader2 } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { ProgramCard } from "@/components/product-card";
import { CategoryCard } from "@/components/category-card";

const CATEGORY_LABELS: Record<string, string> = {
  fan_gear: "Fan Gear",
  uniforms: "Uniforms",
  season_dues: "Season Dues",
  monthly_dues: "Monthly Dues",
  training: "Training Sessions",
  donations: "Donations",
  other: "Other",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  fan_gear: "\u{1F3C6}",
  uniforms: "\u{1F455}",
  season_dues: "\u{1F4B0}",
  monthly_dues: "\u{1F4B3}",
  training: "\u{1F3C8}",
  donations: "\u{2764}\u{FE0F}",
  other: "\u{1F3C0}",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  fan_gear: "Team merchandise and fan apparel",
  uniforms: "Custom jerseys, shorts, and team gear",
  season_dues: "Seasonal registration and dues",
  monthly_dues: "Recurring monthly team dues",
  training: "Skill development sessions and clinics",
  donations: "Support the team with contributions",
  other: "Additional products and services",
};

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  imageUrl?: string;
  pricing: {
    amount: number;
    type: "one_time" | "recurring";
    interval?: string;
  };
  options: { label: string; values: string[] }[];
}

function pricingUnit(product: ApiProduct): string {
  if (product.pricing.type === "recurring" && product.pricing.interval) {
    return product.pricing.interval;
  }
  return "each";
}

export default function StorefrontHomePage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const featured = products.slice(0, 6);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([cat, count]) => ({
      name: CATEGORY_LABELS[cat] || cat,
      slug: cat,
      description: CATEGORY_DESCRIPTIONS[cat] || "",
      emoji: CATEGORY_EMOJIS[cat] || "\u{1F3C6}",
      productCount: count,
    }));
  }, [products]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
              Youth Sports — Powered by Go Participate
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Register Your Athlete.{" "}
              <span className="text-blue-300">Play This Season.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-blue-100/80">
              Browse open teams and programs, pay dues online, and order team
              uniforms — all from one place. Sign up today and get your athlete
              on the field.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-blue-900 hover:bg-blue-50"
                >
                  Browse Products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Users, title: "Join a Team", desc: "Open rosters for all skill levels" },
            { icon: Calendar, title: "Pay Online", desc: "Dues, gear, and registrations" },
            { icon: ShieldCheck, title: "Safe & Verified", desc: "Background-checked coaches" },
            { icon: Trophy, title: "Compete & Grow", desc: "Development-first programs" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 text-center sm:text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Available Now
            </h2>
            <p className="mt-2 text-muted-foreground">
              Products and programs currently available
            </p>
          </div>
          <Link href="/products" className="hidden sm:block">
            <Button variant="ghost" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : featured.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProgramCard
                  key={product._id}
                  name={product.name}
                  slug={product.slug}
                  price={product.pricing.amount / 100}
                  unit={pricingUnit(product)}
                  category={CATEGORY_LABELS[product.category] || product.category}
                  imageUrl={product.imageUrl}
                  isConfigurable={product.options.length > 0}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No products available yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check back soon for new products and programs
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/products">
            <Button variant="outline" className="gap-2">
              View All Products <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <>
          <Separator className="mx-auto max-w-7xl" />

          {/* Categories */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Browse by Category
              </h2>
              <p className="mt-2 text-muted-foreground">
                Find what you need
              </p>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.slug} {...category} />
              ))}
            </div>
          </section>
        </>
      )}

      {/* About Section */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Built for Families,{" "}
                <span className="text-primary">By Coaches</span>
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>
                  Go Participate brings your sports organization online so
                  families can register athletes, pay dues, track schedules, and
                  order team gear — all without paper forms or group chats.
                </p>
                <p>
                  Coaches and org admins manage rosters, communicate with
                  families, collect payments, and run events from a single
                  dashboard. Everything a youth sports org needs, in one place.
                </p>
              </div>
              <div className="mt-8">
                <Link href="/products">
                  <Button size="lg" className="gap-2">
                    Browse All Products
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">{products.length}</p>
                  <p className="mt-1 text-sm text-blue-700">Products Available</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">{categories.length}</p>
                  <p className="mt-1 text-sm text-blue-700">Categories</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">100%</p>
                  <p className="mt-1 text-sm text-blue-700">Online Payments</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">Stripe</p>
                  <p className="mt-1 text-sm text-blue-700">Secure Checkout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Browse products, pay dues online, and order gear in minutes.
          </p>
          <div className="mt-6">
            <Link href="/products">
              <Button
                size="lg"
                className="gap-2 bg-white text-primary hover:bg-white/90"
              >
                Browse All Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
