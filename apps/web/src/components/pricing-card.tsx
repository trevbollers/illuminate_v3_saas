"use client";

import Link from "next/link";
import { Button } from "@goparticipate/ui/src/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@goparticipate/ui/src/components/card";
import { Check } from "lucide-react";

interface PricingCardProps {
  planId: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isAnnual: boolean;
  isPopular?: boolean;
}

export function PricingCard({
  planId,
  name,
  description,
  monthlyPrice,
  yearlyPrice,
  features,
  isAnnual,
  isPopular = false,
}: PricingCardProps) {
  const price = isAnnual ? yearlyPrice / 12 : monthlyPrice;
  const displayPrice = (price / 100).toFixed(0);

  return (
    <Card
      className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
        isPopular
          ? "border-primary shadow-lg scale-105 z-10"
          : "border-border hover:border-primary/30"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
            Most Popular
          </span>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6">
          {monthlyPrice === 0 ? (
            <>
              <span className="text-4xl font-bold text-foreground">Free</span>
              <p className="mt-1 text-xs text-muted-foreground">
                No credit card required
              </p>
            </>
          ) : (
            <>
              <span className="text-4xl font-bold text-foreground">${displayPrice}</span>
              <span className="text-muted-foreground">/mo</span>
              {isAnnual && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Billed annually at ${(yearlyPrice / 100).toFixed(0)}/year
                </p>
              )}
            </>
          )}
        </div>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? "default" : "outline"}
          asChild
        >
          <Link href={`/register?plan=${planId}`}>
            {monthlyPrice === 0 ? "Start Free" : "Get Started"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
