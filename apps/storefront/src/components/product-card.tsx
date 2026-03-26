"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
} from "@goparticipate/ui/src/components/card";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";

export interface ProgramCardProps {
  name: string;
  slug: string;
  price: number;
  unit: string;
  category: string;
  imageUrl?: string;
  isConfigurable?: boolean;
  inStock?: boolean;
}

function categoryEmoji(category: string): string {
  switch (category) {
    case "Flag Football":
      return "\u{1F3C8}";
    case "Basketball":
      return "\u{1F3C0}";
    case "Camps":
      return "\u26BD";
    case "Uniforms":
      return "\u{1F455}";
    default:
      return "\u{1F3C6}";
  }
}

export function ProgramCard({
  name,
  slug,
  price,
  unit,
  category,
  imageUrl,
  isConfigurable,
  inStock = true,
}: ProgramCardProps) {
  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {/* Program Image / Icon */}
      <Link href={`/products/${slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
              <span className="text-4xl">{categoryEmoji(category)}</span>
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Badge variant="secondary">Registration Closed</Badge>
            </div>
          )}
          {isConfigurable && inStock && (
            <Badge className="absolute left-3 top-3" variant="secondary">
              Options Available
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {category}
        </p>
        <Link href={`/products/${slug}`}>
          <h3 className="font-semibold leading-snug text-foreground transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>
        <p className="mt-auto pt-2 text-lg font-bold text-foreground">
          ${price.toFixed(2)}
          <span className="text-sm font-normal text-muted-foreground">
            {" "}
            / {unit}
          </span>
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Link href={`/products/${slug}`} className="w-full">
          <Button className="w-full gap-2" disabled={!inStock}>
            <ArrowRight className="h-4 w-4" />
            {inStock ? "Register Now" : "Registration Closed"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
