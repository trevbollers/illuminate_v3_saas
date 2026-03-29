"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { ProductConfigurator } from "@/components/product-configurator";

const CATEGORY_LABELS: Record<string, string> = {
  fan_gear: "Fan Gear",
  uniforms: "Uniforms",
  season_dues: "Season Dues",
  monthly_dues: "Monthly Dues",
  training: "Training Sessions",
  donations: "Donations",
  other: "Other",
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
    allowPartialPayment?: boolean;
    installmentCount?: number;
  };
  options: {
    label: string;
    values: string[];
    priceAdjustments?: { value: string; amount: number }[];
  }[];
}

function categoryEmoji(category: string): string {
  switch (category) {
    case "fan_gear":
      return "\u{1F3C6}";
    case "uniforms":
      return "\u{1F455}";
    case "season_dues":
    case "monthly_dues":
      return "\u{1F4B0}";
    case "training":
      return "\u{1F3C8}";
    case "donations":
      return "\u{2764}\u{FE0F}";
    default:
      return "\u{1F3C6}";
  }
}

function mapOptions(
  options: ApiProduct["options"]
): { name: string; values: string[]; priceAdjustments?: Record<string, number> }[] {
  return options.map((opt) => {
    const adj: Record<string, number> | undefined = opt.priceAdjustments?.length
      ? Object.fromEntries(opt.priceAdjustments.map((a) => [a.value, a.amount / 100]))
      : undefined;
    return { name: opt.label, values: opt.values, priceAdjustments: adj };
  });
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Product not found");
        return r.json();
      })
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Product Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          This product may no longer be available.
        </p>
        <Link href="/products" className="mt-4 inline-block">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[product.category] || product.category;
  const priceInDollars = product.pricing.amount / 100;
  const unit =
    product.pricing.type === "recurring" && product.pricing.interval
      ? product.pricing.interval
      : "each";
  const configOptions = mapOptions(product.options);

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
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Product Image */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-100">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-[120px]">{categoryEmoji(product.category)}</span>
              </div>
            )}
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
              {categoryLabel}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {product.name}
            </h1>
            <p className="mt-2 text-2xl font-bold text-primary">
              ${priceInDollars.toFixed(2)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}/ {unit}
              </span>
            </p>
          </div>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}

          {product.pricing.allowPartialPayment && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">
                Installment payments available
                {product.pricing.installmentCount
                  ? ` — pay in ${product.pricing.installmentCount} installments`
                  : ""}
              </p>
            </div>
          )}

          <Separator />

          <ProductConfigurator
            productId={product._id}
            productName={product.name}
            productSlug={product.slug}
            basePrice={priceInDollars}
            imageUrl={product.imageUrl}
            configOptions={configOptions}
          />
        </div>
      </div>
    </div>
  );
}
