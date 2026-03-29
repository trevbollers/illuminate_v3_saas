"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { ProgramCard } from "@/components/product-card";

const CATEGORY_LABELS: Record<string, string> = {
  fan_gear: "Fan Gear",
  uniforms: "Uniforms",
  season_dues: "Season Dues",
  monthly_dues: "Monthly Dues",
  training: "Training Sessions",
  donations: "Donations",
  other: "Other",
};

function pricingUnit(product: ApiProduct): string {
  if (product.pricing.type === "recurring" && product.pricing.interval) {
    return product.pricing.interval;
  }
  return "each";
}

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
  options: { label: string; values: string[]; priceAdjustments?: { value: string; amount: number }[] }[];
  isActive: boolean;
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
];

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== "All") {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          (CATEGORY_LABELS[p.category] || p.category).toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        list.sort((a, b) => a.pricing.amount - b.pricing.amount);
        break;
      case "price-desc":
        list.sort((a, b) => b.pricing.amount - a.pricing.amount);
        break;
    }

    return list;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </h3>
        <div className="mt-3 flex flex-col gap-1">
          {categories.map((category) => {
            const count =
              category === "All"
                ? products.length
                : products.filter((p) => p.category === category).length;
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setShowMobileFilters(false);
                }}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span>{CATEGORY_LABELS[category] || category}</span>
                <span className="text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sort By
        </h3>
        <div className="mt-3 flex flex-col gap-1">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSortBy(option.value);
                setShowMobileFilters(false);
              }}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Products &amp; Programs
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse open registrations, gear, and dues
        </p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          className="gap-2 lg:hidden"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {(selectedCategory !== "All" || searchQuery) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedCategory !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {CATEGORY_LABELS[selectedCategory] || selectedCategory}
              <button onClick={() => setSelectedCategory("All")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={() => {
              setSelectedCategory("All");
              setSearchQuery("");
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <FilterSidebar />
        </aside>

        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileFilters(false)}
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-xl bg-background p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileFilters(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <FilterSidebar />
            </div>
          </div>
        )}

        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`}
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="hidden rounded-md border border-input bg-background px-3 py-1.5 text-sm lg:block"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
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
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <p className="text-lg font-medium text-muted-foreground">
                No products found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
