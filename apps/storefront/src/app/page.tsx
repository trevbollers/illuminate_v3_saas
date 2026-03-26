import React from "react";
import Link from "next/link";
import { ArrowRight, Users, Calendar, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { ProgramCard } from "@/components/product-card";
import { CategoryCard } from "@/components/category-card";

const featuredPrograms = [
  {
    name: "7v7 Flag Football — Ages 8-10",
    slug: "7v7-flag-8-10",
    price: 149,
    unit: "season",
    category: "Flag Football",
    isConfigurable: true,
  },
  {
    name: "7v7 Flag Football — Ages 11-13",
    slug: "7v7-flag-11-13",
    price: 149,
    unit: "season",
    category: "Flag Football",
  },
  {
    name: "Travel Basketball — U12",
    slug: "travel-basketball-u12",
    price: 199,
    unit: "season",
    category: "Basketball",
    isConfigurable: true,
  },
  {
    name: "Rec Basketball — Ages 6-8",
    slug: "rec-basketball-6-8",
    price: 89,
    unit: "season",
    category: "Basketball",
  },
  {
    name: "Summer Skills Camp — Football",
    slug: "summer-skills-camp-football",
    price: 75,
    unit: "camp",
    category: "Camps",
    isConfigurable: true,
  },
  {
    name: "Elite 7v7 — Ages 14-17",
    slug: "elite-7v7-14-17",
    price: 179,
    unit: "season",
    category: "Flag Football",
  },
];

const categories = [
  {
    name: "Flag Football",
    slug: "flag-football",
    description: "7v7 leagues and travel teams for all ages",
    emoji: "\u{1F3C8}",
    productCount: 6,
  },
  {
    name: "Basketball",
    slug: "basketball",
    description: "Rec leagues, travel teams, and skill sessions",
    emoji: "\u{1F3C0}",
    productCount: 5,
  },
  {
    name: "Camps",
    slug: "camps",
    description: "Summer and holiday skill development camps",
    emoji: "\u{26BD}",
    productCount: 4,
  },
  {
    name: "Uniforms",
    slug: "uniforms",
    description: "Custom jerseys, shorts, and team gear",
    emoji: "\u{1F455}",
    productCount: 8,
  },
];

export default function StorefrontHomePage() {
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
                  Browse Programs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#upcoming-events">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-blue-300/50 text-white hover:bg-blue-800/50"
                >
                  Upcoming Events
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
            {
              icon: Users,
              title: "Join a Team",
              desc: "Open rosters for all skill levels",
            },
            {
              icon: Calendar,
              title: "Upcoming Events",
              desc: "Leagues, tournaments & camps",
            },
            {
              icon: ShieldCheck,
              title: "Safe & Verified",
              desc: "Background-checked coaches",
            },
            {
              icon: Trophy,
              title: "Compete & Grow",
              desc: "Development-first programs",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 text-center sm:text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Programs */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Open Programs
            </h2>
            <p className="mt-2 text-muted-foreground">
              Teams and programs currently accepting registrations
            </p>
          </div>
          <Link href="/products" className="hidden sm:block">
            <Button variant="ghost" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredPrograms.map((program) => (
            <ProgramCard key={program.slug} {...program} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/products">
            <Button variant="outline" className="gap-2">
              View All Programs <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Separator className="mx-auto max-w-7xl" />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Browse by Sport
          </h2>
          <p className="mt-2 text-muted-foreground">
            Find the right program for your athlete
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.slug} {...category} />
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="upcoming-events" className="bg-muted/40">
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
                <p>
                  Whether you&apos;re signing up for your first recreational
                  season or joining a competitive travel program, we make the
                  process simple so you can focus on the game.
                </p>
              </div>
              <div className="mt-8">
                <Link href="/products">
                  <Button size="lg" className="gap-2">
                    Browse All Programs
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">200+</p>
                  <p className="mt-1 text-sm text-blue-700">Athletes Registered</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">15+</p>
                  <p className="mt-1 text-sm text-blue-700">Active Teams</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">2</p>
                  <p className="mt-1 text-sm text-blue-700">Sports Offered</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 p-8 text-center">
                  <p className="text-4xl font-bold text-blue-900">100%</p>
                  <p className="mt-1 text-sm text-blue-700">Online Registration</p>
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
            Ready to get your athlete on the field?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Registration is open now. Join a team, pay dues online, and order
            your uniforms in minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/products">
              <Button
                size="lg"
                className="gap-2 bg-white text-primary hover:bg-white/90"
              >
                Browse All Programs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/programs?category=uniforms">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Order Uniforms
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
