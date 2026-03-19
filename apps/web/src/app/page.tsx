import Link from "next/link";
import { Button } from "@illuminate/ui/src/components/button";
import {
  Package,
  ChefHat,
  ShoppingCart,
  Sparkles,
  MapPin,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FeatureCard } from "@/components/feature-card";

const features = [
  {
    icon: Package,
    title: "Inventory Management",
    description:
      "Track every cut, primal, and product in real time. Automated stock alerts, lot tracking, and expiration management keep your inventory tight.",
  },
  {
    icon: ChefHat,
    title: "Recipe & Production",
    description:
      "Build recipes with precise yield calculations. Plan production runs, track ingredient usage, and maintain consistent quality across batches.",
  },
  {
    icon: ShoppingCart,
    title: "Order Management",
    description:
      "Manage wholesale and retail orders from a single dashboard. Route, schedule, and fulfill orders with integrated pick-and-pack workflows.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Configuration",
    description:
      "Let AI help you set up products, suggest pricing, and optimize your catalog. Smart recommendations based on industry best practices.",
  },
  {
    icon: MapPin,
    title: "Multi-Location Support",
    description:
      "Manage multiple processing facilities, retail counters, and storage locations. Transfer stock seamlessly and maintain visibility across sites.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Understand your business at a glance. Revenue, margins, waste metrics, and trend analysis help you make data-driven decisions every day.",
  },
];

const stats = [
  { value: "500+", label: "Meat Businesses" },
  { value: "2.4M", label: "Products Tracked" },
  { value: "99.9%", label: "Uptime" },
  { value: "$180M+", label: "Revenue Managed" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
          <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center py-24 text-center lg:py-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Now with AI-powered product configuration
            </div>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Manage Your Meat Business,{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                End to End
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              The modern platform for meat lockers, butcher shops, and processing
              facilities. From inventory to invoicing, Illuminate handles it all
              so you can focus on what you do best.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/25" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8" asChild>
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Trusted by 500+ meat businesses across North America
          </p>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to run your operation
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built tools for the meat industry, designed to streamline
              every part of your workflow.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* About / CTA Section */}
      <section id="about" className="relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-background" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to modernize your meat business?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join hundreds of meat businesses already using Illuminate to save
              time, reduce waste, and grow revenue. Start your free trial today
              and see the difference in your first week.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/25" asChild>
                <Link href="/register">
                  Start Your Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/pricing">Compare Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
