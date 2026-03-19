"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
} from "@illuminate/ui/src/components/card";
import { Button } from "@illuminate/ui/src/components/button";
import { Badge } from "@illuminate/ui/src/components/badge";

export interface ProductCardProps {
  name: string;
  slug: string;
  price: number;
  unit: string;
  category: string;
  imageUrl?: string;
  isConfigurable?: boolean;
  inStock?: boolean;
}

export function ProductCard({
  name,
  slug,
  price,
  unit,
  category,
  imageUrl,
  isConfigurable,
  inStock = true,
}: ProductCardProps) {
  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {/* Product Image Placeholder */}
      <Link href={`/products/${slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
              <span className="text-4xl">
                {category === "Beef"
                  ? "\u{1F969}"
                  : category === "Pork"
                    ? "\u{1F356}"
                    : category === "Poultry"
                      ? "\u{1F357}"
                      : "\u{1F32D}"}
              </span>
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
          {isConfigurable && inStock && (
            <Badge className="absolute left-3 top-3" variant="secondary">
              Configurable
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
            <ShoppingCart className="h-4 w-4" />
            {isConfigurable ? "View Details" : "View Details"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
