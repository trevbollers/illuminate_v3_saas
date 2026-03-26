"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { ProductConfigurator } from "@/components/product-configurator";

// Mock program database — in production, fetched from the org's tenant DB
const programData: Record<
  string,
  {
    id: string;
    name: string;
    slug: string;
    category: string;
    price: number;
    unit: string;
    description: string;
    details: string[];
    isConfigurable: boolean;
    configOptions: {
      name: string;
      values: string[];
      priceAdjustments?: Record<string, number>;
    }[];
    hasAiAddon: boolean;
  }
> = {
  "7v7-flag-8-10": {
    id: "prog_7v7_8_10",
    name: "7v7 Flag Football — Ages 8-10",
    slug: "7v7-flag-8-10",
    category: "Flag Football",
    price: 149,
    unit: "season",
    description:
      "Our foundational flag football program for athletes ages 8-10. Players develop core skills — routes, handoffs, flag pulling, and sportsmanship — in a fun, structured league setting. Games are played on weekends with practices scheduled twice per week.",
    details: [
      "Ages 8-10 (birth year verified at registration)",
      "10-game regular season + playoffs",
      "Twice-weekly practices",
      "Jersey included with registration",
      "Background-checked, certified coaches",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Jersey Size",
        values: ["YS", "YM", "YL", "YXL"],
        priceAdjustments: { YS: 0, YM: 0, YL: 0, YXL: 0 },
      },
      {
        name: "Division",
        values: ["Recreational", "Competitive"],
        priceAdjustments: { Recreational: 0, Competitive: 30 },
      },
    ],
    hasAiAddon: false,
  },
  "travel-basketball-u12": {
    id: "prog_travel_bball_u12",
    name: "Travel Basketball — U12",
    slug: "travel-basketball-u12",
    category: "Basketball",
    price: 199,
    unit: "season",
    description:
      "Competitive travel basketball for players 12 and under. This program features structured tryouts, 3-4 tournament weekends, and a rigorous practice schedule designed to develop athleticism, basketball IQ, and team chemistry. Players compete against regional clubs.",
    details: [
      "Open to athletes 12U (school grade eligible)",
      "Tryouts required — dates posted in dashboard",
      "3-4 weekend tournaments included",
      "Two practices per week",
      "Travel expenses billed separately per event",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Jersey Size",
        values: ["YS", "YM", "YL", "YXL", "AS"],
        priceAdjustments: { YS: 0, YM: 0, YL: 0, YXL: 0, AS: 0 },
      },
      {
        name: "Shorts Size",
        values: ["YS", "YM", "YL", "YXL", "AS"],
        priceAdjustments: { YS: 0, YM: 0, YL: 0, YXL: 0, AS: 0 },
      },
    ],
    hasAiAddon: true,
  },
  "summer-skills-camp-football": {
    id: "prog_summer_football_camp",
    name: "Summer Skills Camp — Football",
    slug: "summer-skills-camp-football",
    category: "Camps",
    price: 75,
    unit: "camp",
    description:
      "A week-long summer football skills camp focused on position-specific development. Athletes rotate through drills for routes, coverage, rushing, and flag pulling. Taught by our head coaches and assistant staff. Limited spots available.",
    details: [
      "Open to all skill levels ages 7-15",
      "Mon-Fri, 9am-12pm (half day)",
      "Position-specific skill stations",
      "Scrimmage on final day",
      "Camp T-shirt included",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Week",
        values: ["June Week 1", "June Week 2", "July Week 1"],
        priceAdjustments: { "June Week 1": 0, "June Week 2": 0, "July Week 1": 0 },
      },
      {
        name: "T-Shirt Size",
        values: ["YS", "YM", "YL", "YXL", "AS", "AM"],
        priceAdjustments: { YS: 0, YM: 0, YL: 0, YXL: 0, AS: 0, AM: 0 },
      },
    ],
    hasAiAddon: false,
  },
  "custom-team-jersey": {
    id: "prod_custom_jersey",
    name: "Custom Team Jersey",
    slug: "custom-team-jersey",
    category: "Uniforms",
    price: 38,
    unit: "each",
    description:
      "Officially branded team jerseys with your player name and number. Moisture-wicking performance fabric built for game day. Jerseys are custom-printed and typically ship within 10-14 business days. Order early to ensure delivery before your first game.",
    details: [
      "Moisture-wicking performance polyester",
      "Custom player name and number",
      "Official team colors and logo",
      "10-14 business day turnaround",
      "Unisex sizing — see size chart",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Size",
        values: ["YS", "YM", "YL", "YXL", "AS", "AM", "AL", "AXL"],
        priceAdjustments: { YS: 0, YM: 0, YL: 0, YXL: 0, AS: 0, AM: 0, AL: 0, AXL: 0 },
      },
      {
        name: "Player Number",
        values: ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99"],
        priceAdjustments: {},
      },
    ],
    hasAiAddon: false,
  },
};

// Fallback for unknown slugs
function getProgram(slug: string) {
  if (programData[slug]) return programData[slug];
  return {
    id: `prog_${slug}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    slug,
    category: "Flag Football",
    price: 149,
    unit: "season",
    description:
      "Registration for this program or team. Complete your registration below and a coach will be in touch with practice details and schedule information.",
    details: [
      "Registration confirmation sent by email",
      "Coach contact provided after registration",
      "Refund policy: full refund within 7 days",
      "Waiver required at first practice",
    ],
    isConfigurable: false,
    configOptions: [],
    hasAiAddon: false,
  };
}

export default function ProgramDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const program = getProgram(params.slug);

  const categoryEmoji =
    program.category === "Flag Football"
      ? "\u{1F3C8}"
      : program.category === "Basketball"
        ? "\u{1F3C0}"
        : program.category === "Camps"
          ? "\u26BD"
          : "\u{1F455}";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/products" className="hover:text-foreground">
          Programs
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/products?category=${program.category.toLowerCase().replace(/ /g, "-")}`}
          className="hover:text-foreground"
        >
          {program.category}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{program.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Program Image / Icon */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="flex h-full items-center justify-center">
              <span className="text-[120px]">{categoryEmoji}</span>
            </div>
          </div>

          <Link href="/products" className="mt-4 inline-block">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Programs
            </Button>
          </Link>
        </div>

        {/* Program Info & Registration Configurator */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-3">
              {program.category}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {program.name}
            </h1>
            <p className="mt-2 text-2xl font-bold text-primary">
              ${program.price.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {program.unit}
              </span>
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {program.description}
          </p>

          <Separator />

          {/* Registration Configurator */}
          <ProductConfigurator
            productId={program.id}
            productName={program.name}
            productSlug={program.slug}
            basePrice={program.price}
            configOptions={program.configOptions}
            hasAiAddon={program.hasAiAddon}
          />

          <Separator />

          {/* Program Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Program Details
            </h3>
            <ul className="mt-3 space-y-2">
              {program.details.map((detail, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
