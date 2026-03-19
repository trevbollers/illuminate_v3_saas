"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@illuminate/ui/src/components/button";
import { Badge } from "@illuminate/ui/src/components/badge";
import { Separator } from "@illuminate/ui/src/components/separator";
import { ProductConfigurator } from "@/components/product-configurator";

// Mock product database — in production, fetched from the API
const productData: Record<
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
  "ribeye-steak": {
    id: "prod_ribeye",
    name: "Ribeye Steak",
    slug: "ribeye-steak",
    category: "Beef",
    price: 32.99,
    unit: "lb",
    description:
      "Our hand-cut ribeye steaks are sourced from USDA Choice and Prime grade cattle, known for their exceptional marbling, tenderness, and rich beefy flavor. Perfect for grilling, pan-searing, or broiling. Each steak is individually trimmed by our master butchers for consistent quality.",
    details: [
      "USDA Choice or Prime grade",
      "Dry-aged 21 days for enhanced flavor",
      "Hand-trimmed by master butchers",
      "Individually vacuum-sealed",
      "Flash-frozen for peak freshness",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Grade",
        values: ["Choice", "Prime"],
        priceAdjustments: { Choice: 0, Prime: 8.0 },
      },
      {
        name: "Thickness",
        values: ['1"', '1.5"', '2" (Tomahawk)'],
        priceAdjustments: { '1"': 0, '1.5"': 3.0, '2" (Tomahawk)': 10.0 },
      },
      {
        name: "Aging",
        values: ["Wet-Aged", "Dry-Aged 21 Days", "Dry-Aged 45 Days"],
        priceAdjustments: {
          "Wet-Aged": 0,
          "Dry-Aged 21 Days": 5.0,
          "Dry-Aged 45 Days": 12.0,
        },
      },
    ],
    hasAiAddon: true,
  },
  "filet-mignon": {
    id: "prod_filet",
    name: "Filet Mignon",
    slug: "filet-mignon",
    category: "Beef",
    price: 45.99,
    unit: "lb",
    description:
      "The most tender steak available, our filet mignon is cut from the center of the tenderloin. Lean yet incredibly buttery, this is the ultimate choice for special occasions. Each filet is hand-trimmed and portion-cut for consistent cooking results.",
    details: [
      "Center-cut tenderloin",
      "USDA Prime grade",
      "Hand-trimmed to perfection",
      "6-8 oz portions available",
      "Best served medium-rare",
    ],
    isConfigurable: false,
    configOptions: [],
    hasAiAddon: false,
  },
  "baby-back-ribs": {
    id: "prod_ribs",
    name: "Baby Back Ribs",
    slug: "baby-back-ribs",
    category: "Pork",
    price: 18.99,
    unit: "lb",
    description:
      "Our premium baby back ribs come from heritage breed pigs, offering superior flavor and tenderness. These ribs are meaty, well-marbled, and perfect for slow cooking, smoking, or grilling. Available as full racks or half racks.",
    details: [
      "Heritage breed pork",
      "Membrane removed for easy cooking",
      "Full rack: 12-14 ribs",
      "Antibiotic and hormone free",
      "Perfect for BBQ and smoking",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Size",
        values: ["Half Rack", "Full Rack"],
        priceAdjustments: { "Half Rack": 0, "Full Rack": 6.0 },
      },
      {
        name: "Preparation",
        values: ["Plain", "Dry Rubbed", "Marinated"],
        priceAdjustments: { Plain: 0, "Dry Rubbed": 2.0, Marinated: 3.0 },
      },
    ],
    hasAiAddon: false,
  },
  "wagyu-burger-patties": {
    id: "prod_wagyu",
    name: "Wagyu Burger Patties",
    slug: "wagyu-burger-patties",
    category: "Specialty",
    price: 24.99,
    unit: "pack",
    description:
      "Elevate your burger game with our American Wagyu beef patties. Made from premium Wagyu ground beef, these patties feature incredible marbling that creates the juiciest, most flavorful burgers you have ever tasted. Each pack contains 4 hand-formed patties.",
    details: [
      "American Wagyu beef blend",
      "80/20 lean-to-fat ratio",
      "4 patties per pack (6 oz each)",
      "Hand-formed, never compressed",
      "Flash-frozen for freshness",
    ],
    isConfigurable: true,
    configOptions: [
      {
        name: "Pack Size",
        values: ["4-Pack", "8-Pack", "12-Pack (Party)"],
        priceAdjustments: {
          "4-Pack": 0,
          "8-Pack": 22.0,
          "12-Pack (Party)": 42.0,
        },
      },
      {
        name: "Patty Size",
        values: ["6 oz", "8 oz"],
        priceAdjustments: { "6 oz": 0, "8 oz": 4.0 },
      },
    ],
    hasAiAddon: true,
  },
};

// Fallback product for unknown slugs
function getProduct(slug: string) {
  if (productData[slug]) return productData[slug];
  return {
    id: `prod_${slug}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    slug,
    category: "Beef",
    price: 19.99,
    unit: "lb",
    description:
      "A premium quality product sourced from local farms. Hand-selected by our master butchers for exceptional flavor and tenderness.",
    details: [
      "Locally sourced",
      "Hand-trimmed",
      "Vacuum-sealed for freshness",
      "Antibiotic and hormone free",
    ],
    isConfigurable: false,
    configOptions: [],
    hasAiAddon: false,
  };
}

export default function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = getProduct(params.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/products?category=${product.category.toLowerCase()}`}
          className="hover:text-foreground"
        >
          {product.category}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Product Image */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border bg-gradient-to-br from-amber-50 to-orange-100">
            <div className="flex h-full items-center justify-center">
              <span className="text-[120px]">
                {product.category === "Beef"
                  ? "\u{1F969}"
                  : product.category === "Pork"
                    ? "\u{1F356}"
                    : product.category === "Poultry"
                      ? "\u{1F357}"
                      : "\u{1F32D}"}
              </span>
            </div>
          </div>

          <Link href="/products" className="mt-4 inline-block">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>

        {/* Product Info & Configurator */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-3">
              {product.category}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {product.name}
            </h1>
            <p className="mt-2 text-2xl font-bold text-primary">
              ${product.price.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {product.unit}
              </span>
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          <Separator />

          {/* Configurator */}
          <ProductConfigurator
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            basePrice={product.price}
            configOptions={product.configOptions}
            hasAiAddon={product.hasAiAddon}
          />

          <Separator />

          {/* Product Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Product Details
            </h3>
            <ul className="mt-3 space-y-2">
              {product.details.map((detail, i) => (
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
