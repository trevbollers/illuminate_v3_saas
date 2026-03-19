"use client";

import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@illuminate/ui/src/components/button";
import { Input } from "@illuminate/ui/src/components/input";
import { Badge } from "@illuminate/ui/src/components/badge";
import { Separator } from "@illuminate/ui/src/components/separator";
import { ProductCard } from "@/components/product-card";

const allProducts = [
  { name: "Ribeye Steak", slug: "ribeye-steak", price: 32.99, unit: "lb", category: "Beef", isConfigurable: true },
  { name: "Filet Mignon", slug: "filet-mignon", price: 45.99, unit: "lb", category: "Beef" },
  { name: "New York Strip", slug: "new-york-strip", price: 29.99, unit: "lb", category: "Beef", isConfigurable: true },
  { name: "T-Bone Steak", slug: "t-bone-steak", price: 27.99, unit: "lb", category: "Beef" },
  { name: "Ground Beef (80/20)", slug: "ground-beef-80-20", price: 9.99, unit: "lb", category: "Beef" },
  { name: "Smoked Brisket", slug: "smoked-brisket", price: 28.99, unit: "lb", category: "Beef" },
  { name: "Beef Short Ribs", slug: "beef-short-ribs", price: 19.99, unit: "lb", category: "Beef" },
  { name: "Baby Back Ribs", slug: "baby-back-ribs", price: 18.99, unit: "lb", category: "Pork", isConfigurable: true },
  { name: "Pork Chops", slug: "pork-chops", price: 14.99, unit: "lb", category: "Pork" },
  { name: "Pork Tenderloin", slug: "pork-tenderloin", price: 16.99, unit: "lb", category: "Pork" },
  { name: "Pulled Pork", slug: "pulled-pork", price: 15.99, unit: "lb", category: "Pork" },
  { name: "Bacon (Thick Cut)", slug: "thick-cut-bacon", price: 12.99, unit: "lb", category: "Pork" },
  { name: "Free-Range Whole Chicken", slug: "free-range-whole-chicken", price: 12.99, unit: "each", category: "Poultry" },
  { name: "Chicken Breast", slug: "chicken-breast", price: 10.99, unit: "lb", category: "Poultry" },
  { name: "Chicken Thighs", slug: "chicken-thighs", price: 8.99, unit: "lb", category: "Poultry" },
  { name: "Duck Breast", slug: "duck-breast", price: 22.99, unit: "lb", category: "Poultry" },
  { name: "Turkey Breast", slug: "turkey-breast", price: 14.99, unit: "lb", category: "Poultry" },
  { name: "Wagyu Burger Patties", slug: "wagyu-burger-patties", price: 24.99, unit: "pack", category: "Specialty", isConfigurable: true },
  { name: "Italian Sausage Links", slug: "italian-sausage-links", price: 11.99, unit: "lb", category: "Specialty" },
  { name: "Beef Jerky (Original)", slug: "beef-jerky-original", price: 18.99, unit: "bag", category: "Specialty" },
  { name: "Lamb Chops", slug: "lamb-chops", price: 34.99, unit: "lb", category: "Specialty" },
  { name: "Venison Steaks", slug: "venison-steaks", price: 38.99, unit: "lb", category: "Specialty" },
];

const categories = ["All", "Beef", "Pork", "Poultry", "Specialty"];

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
  { value: "newest", label: "Newest First" },
];

export default function ProductCatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let products = [...allProducts];

    // Filter by category
    if (selectedCategory !== "All") {
      products = products.filter((p) => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name-asc":
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        products.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        products.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        products.reverse();
        break;
    }

    return products;
  }, [searchQuery, selectedCategory, sortBy]);

  const Sidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Categories
        </h3>
        <div className="mt-3 flex flex-col gap-1">
          {categories.map((category) => {
            const count =
              category === "All"
                ? allProducts.length
                : allProducts.filter((p) => p.category === category).length;
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
                <span>{category}</span>
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
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Our Products
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse our full selection of premium meats
        </p>
      </div>

      {/* Search Bar */}
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

      {/* Active Filters */}
      {(selectedCategory !== "All" || searchQuery) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedCategory !== "All" && (
            <Badge variant="secondary" className="gap-1">
              {selectedCategory}
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
        {/* Desktop Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
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
              <Sidebar />
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} product
              {filteredProducts.length !== 1 ? "s" : ""}
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

          {filteredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.slug} {...product} />
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
