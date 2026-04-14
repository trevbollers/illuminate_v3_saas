import Link from "next/link";
import { Button } from "@goparticipate/ui/src/components/button";
import {
  Users,
  CalendarDays,
  CreditCard,
  MessageSquare,
  Activity,
  Sparkles,
  ArrowRight,
  Trophy,
  Shield,
  Heart,
  BarChart3,
  Check,
  Zap,
  Globe,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FeatureCard } from "@/components/feature-card";

// ── Role Color System ──────────────────────────────────────────────────────
// League  = Blue   (#2563EB / blue-600)   → Trophy icon
// Org     = Green  (#059669 / emerald-600) → Shield icon
// Family  = Amber  (#D97706 / amber-600)  → Heart icon

const features = [
  {
    icon: Users,
    title: "Roster Management",
    description:
      "Build and manage rosters with ease. Track player profiles, eligibility, age verification, waivers, and uniform sizing all in one place.",
  },
  {
    icon: CalendarDays,
    title: "Scheduling & Events",
    description:
      "Publish game schedules, manage practice calendars, and coordinate events. Players and families get instant notifications and calendar sync.",
  },
  {
    icon: CreditCard,
    title: "Payments & Dues",
    description:
      "Collect registration fees, team dues, and event entry payments online. Automated reminders, payment plans, and real-time financial reporting.",
  },
  {
    icon: MessageSquare,
    title: "Team Communication",
    description:
      "Keep everyone in the loop with built-in messaging, announcements, and RSVP tools. Reach players, parents, and staff in seconds.",
  },
  {
    icon: Activity,
    title: "Live Scoring & Stats",
    description:
      "Enter scores from the sideline, track standings in real time, and build a statistical history for every player across every season.",
  },
  {
    icon: Sparkles,
    title: "AI Coach Assistant",
    description:
      "Generate practice plans, lineup suggestions, and player development reports powered by Claude AI. Smart recommendations tailored to your sport and roster.",
  },
];

const stats = [
  { value: "7v7", label: "Football at Launch" },
  { value: "3+", label: "Access Layers" },
  { value: "99.9%", label: "Uptime" },
  { value: "Free", label: "To Get Started" },
];

const roles = [
  {
    key: "league",
    icon: Trophy,
    title: "Run a League",
    subtitle: "For commissioners & league directors",
    description:
      "Create events, manage divisions, run brackets, handle age verification and compliance — everything you need to operate a professional youth sports league.",
    color: "blue",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200 hover:border-blue-400",
    iconBgClass: "bg-blue-100",
    iconTextClass: "text-blue-600",
    badgeClass: "bg-blue-600",
    href: "#league-details",
    signupHref: "/signup?role=league",
  },
  {
    key: "org",
    icon: Shield,
    title: "Manage a Team or Org",
    subtitle: "For coaches, org admins & team managers",
    description:
      "Manage rosters, scheduling, payments, communication, and stats. Run a single team or a whole organization with multiple teams under one roof.",
    color: "emerald",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200 hover:border-emerald-400",
    iconBgClass: "bg-emerald-100",
    iconTextClass: "text-emerald-600",
    badgeClass: "bg-emerald-600",
    href: "#org-details",
    signupHref: "/signup?role=org",
  },
  {
    key: "family",
    icon: Heart,
    title: "Join as a Family",
    subtitle: "For parents & players",
    description:
      "One account for your whole family. View schedules, RSVP, pay dues, upload documents, and track your athlete's journey across every team and league.",
    color: "amber",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200 hover:border-amber-400",
    iconBgClass: "bg-amber-100",
    iconTextClass: "text-amber-600",
    badgeClass: "bg-amber-600",
    href: "#family-details",
    signupHref: "/signup?role=family",
  },
];

const leagueFeatures = [
  "Event creation & management",
  "Division & bracket generation",
  "Age verification & compliance",
  "Cross-org registration",
  "Live scoring & standings",
  "Registration fee collection",
  "Your Prep Sports media integration",
  "API access for custom integrations",
];

const orgPlans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "1 team, 15 players — basic scheduling, RSVP, chat.",
    features: ["1 team", "15 players", "Scheduling & RSVP", "Basic chat"],
    href: "/signup?role=org&plan=free",
    highlighted: false,
  },
  {
    name: "Team Pro",
    price: "$9.99",
    period: "/mo",
    description: "Full team management with stats and development tracking.",
    features: [
      "1 team, 25 players",
      "Full stat tracking",
      "Player development",
      "Calendar sync",
      "AI add-ons available",
    ],
    href: "/signup?role=org&plan=team_pro",
    highlighted: true,
  },
  {
    name: "Partner",
    price: "$4.99",
    period: "/mo",
    description: "Team Pro features — unlocked via uniform partner commitment.",
    features: [
      "Everything in Team Pro",
      "Partner gear catalog",
      "Priority sizing",
      "Partner badge",
    ],
    href: "/signup?role=org&plan=partner",
    highlighted: false,
  },
  {
    name: "Organization",
    price: "$29.99",
    period: "/mo",
    description: "Multi-team dashboard for clubs and organizations.",
    features: [
      "Up to 10 teams",
      "150 players",
      "Org-wide registration",
      "Financial rollup",
      "Staff management",
    ],
    href: "/signup?role=org&plan=organization",
    highlighted: false,
  },
];

const familyFeatures = [
  "Single family account for all your athletes",
  "View schedules & RSVP across all teams",
  "Pay dues and registration fees online",
  "Encrypted document vault for birth certs & medical forms",
  "Track stats and development over time",
  "Move between orgs and leagues freely",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* ── Hero Section ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center py-24 text-center lg:py-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Now with AI-powered coaching tools
            </div>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your team. Your way.{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Go Participate.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              The modern platform for youth sports teams, organizations, and
              leagues. Rosters, scheduling, payments, communication, and AI
              coaching tools — all in one place.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Free plan available. No credit card required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="gap-2 px-6" asChild>
                <Link href="#roles">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-6" asChild>
                <Link href="#features">See features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Role Cards — "I want to..." ─────────────────────────────── */}
      <section id="roles" className="relative -mt-8 pb-20 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              How will you use Go Participate?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pick your role to see features and pricing tailored to you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.key}
                className={`group relative flex flex-col rounded-2xl border-2 ${role.borderClass} ${role.bgClass} p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${role.iconBgClass}`}
                  >
                    <role.icon className={`h-6 w-6 ${role.iconTextClass}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {role.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {role.subtitle}
                    </p>
                  </div>
                </div>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {role.description}
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild size="sm" className={role.badgeClass}>
                    <Link href={role.signupHref}>
                      Get Started
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={role.href}>Learn more</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Built for teams, organizations, and leagues across North America
          </p>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to run your program
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built tools for youth sports — designed to streamline
              every part of your operation, from tryouts to championships.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ── League Details (Blue) ───────────────────────────────────── */}
      <section
        id="league-details"
        className="scroll-mt-20 border-t-4 border-blue-600 bg-blue-50/50 py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Trophy className="h-5 w-5 text-blue-600" />
            </div>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              For Leagues
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Run your league like a pro
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Full league operations — create events, build brackets, manage
            divisions, enforce age verification, and collect registration fees.
            All with real-time scoring and standings.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-600">
                What you get
              </h3>
              <ul className="space-y-3">
                {leagueFeatures.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-3 text-foreground"
                  >
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-blue-200 bg-white p-8">
              <Globe className="mb-4 h-10 w-10 text-blue-600" />
              <h3 className="text-2xl font-bold text-foreground">League Plan</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  $79.99
                </span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Unlimited teams. Unlimited events.
              </p>
              <Button className="mt-6 w-full bg-blue-600 hover:bg-blue-700" size="lg" asChild>
                <Link href="/signup?role=league">
                  Start Your League
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                AI Coach & AI Scout add-ons available at $4.99/mo each
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Org/Team Details (Green) ────────────────────────────────── */}
      <section
        id="org-details"
        className="scroll-mt-20 border-t-4 border-emerald-600 bg-emerald-50/50 py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Shield className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
              For Teams & Organizations
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Manage your team, your way
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Whether you run a single team or a multi-team organization, get
            rosters, scheduling, payments, communication, and stats in one
            dashboard. Start free and scale as you grow.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {orgPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border-2 bg-white p-6 transition-all duration-300 hover:shadow-lg ${
                  plan.highlighted
                    ? "border-emerald-500 shadow-lg"
                    : "border-emerald-200 hover:border-emerald-400"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                      <Zap className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {plan.description}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className={
                    plan.highlighted
                      ? "mt-6 w-full bg-emerald-600 hover:bg-emerald-700"
                      : "mt-6 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  }
                  asChild
                >
                  <Link href={plan.href}>
                    {plan.price === "$0" ? "Start Free" : "Get Started"}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Family Details (Amber) ──────────────────────────────────── */}
      <section
        id="family-details"
        className="scroll-mt-20 border-t-4 border-amber-500 bg-amber-50/50 py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Heart className="h-5 w-5 text-amber-600" />
            </div>
            <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white">
              For Families & Players
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One account. Every team. Every season.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Your family profile follows you wherever you play. View schedules,
            pay dues, upload verification documents — and take your athlete's
            history with you when you move to a new team or league.
          </p>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <ul className="space-y-4">
              {familyFeatures.map((f) => (
                <li key={f} className="flex items-start gap-3 text-foreground">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-white p-8">
              <Heart className="mb-4 h-10 w-10 text-amber-600" />
              <h3 className="text-2xl font-bold text-foreground">
                Always Free
              </h3>
              <p className="mt-2 text-center text-muted-foreground">
                Family accounts are free forever. You'll join teams and leagues
                via invite links or registration pages.
              </p>
              <Button
                className="mt-6 w-full bg-amber-600 hover:bg-amber-700"
                size="lg"
                asChild
              >
                <Link href="/signup?role=family">
                  Create Family Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Add-ons ──────────────────────────────────────────────── */}
      <section className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Powerful AI Add-ons
            </h2>
            <p className="mt-3 text-muted-foreground">
              Available on any paid plan — supercharge your coaching with AI.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-primary/5" />
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                AI Coach
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                AI-powered practice plans, lineup suggestions, and game recaps
                tailored to your roster and sport.
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  +$4.99
                </span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-primary/5" />
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                AI Scout
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Player evaluation reports, development tracking, and skill
                progression analysis powered by AI.
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  +$4.99
                </span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────────────── */}
      <section id="about" className="relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-background" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to level up your program?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join teams, organizations, and leagues already using Go
              Participate to save time, stay organized, and give athletes the
              experience they deserve.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="gap-2 bg-blue-600 px-6 hover:bg-blue-700"
                asChild
              >
                <Link href="/signup?role=league">
                  <Trophy className="h-4 w-4" />
                  Start a League
                </Link>
              </Button>
              <Button
                size="lg"
                className="gap-2 bg-emerald-600 px-6 hover:bg-emerald-700"
                asChild
              >
                <Link href="/signup?role=org">
                  <Shield className="h-4 w-4" />
                  Start a Team
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-amber-400 px-6 text-amber-700 hover:bg-amber-50"
                asChild
              >
                <Link href="/signup?role=family">
                  <Heart className="h-4 w-4" />
                  Join as Family
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
