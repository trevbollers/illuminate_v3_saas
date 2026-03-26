"use client";

import React, { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { ProgramCard } from "@/components/product-card";

const allPrograms = [
  { name: "7v7 Flag Football — Ages 8-10", slug: "7v7-flag-8-10", price: 149, unit: "season", category: "Flag Football", isConfigurable: true },
  { name: "7v7 Flag Football — Ages 11-13", slug: "7v7-flag-11-13", price: 149, unit: "season", category: "Flag Football" },
  { name: "Elite 7v7 — Ages 14-17", slug: "elite-7v7-14-17", price: 179, unit: "season", category: "Flag Football", isConfigurable: true },
  { name: "7v7 Combine Prep", slug: "7v7-combine-prep", price: 99, unit: "program", category: "Flag Football" },
  { name: "Flag Football — Ages 6-7 (Intro)", slug: "flag-football-intro-6-7", price: 79, unit: "season", category: "Flag Football" },
  { name: "7v7 Spring Tournament Team", slug: "7v7-spring-tournament", price: 199, unit: "season", category: "Flag Football", isConfigurable: true },
  { name: "Rec Basketball — Ages 6-8", slug: "rec-basketball-6-8", price: 89, unit: "season", category: "Basketball" },
  { name: "Rec Basketball — Ages 9-11", slug: "rec-basketball-9-11", price: 99, unit: "season", category: "Basketball" },
  { name: "Travel Basketball — U12", slug: "travel-basketball-u12", price: 199, unit: "season", category: "Basketball", isConfigurable: true },
  { name: "Travel Basketball — U14", slug: "travel-basketball-u14", price: 199, unit: "season", category: "Basketball", isConfigurable: true },
  { name: "Basketball Skills Academy", slug: "basketball-skills-academy", price: 129, unit: "program", category: "Basketball" },
  { name: "Summer Skills Camp — Football", slug: "summer-skills-camp-football", price: 75, unit: "camp", category: "Camps", isConfigurable: true },
  { name: "Summer Skills Camp — Basketball", slug: "summer-skills-camp-basketball", price: 75, unit: "camp", category: "Camps" },
  { name: "Holiday Basketball Clinic", slug: "holiday-basketball-clinic", price: 45, unit: "clinic", category: "Camps" },
  { name: "Spring Football Combine", slug: "spring-football-combine", price: 55, unit: "event", category: "Camps" },
  { name: "Custom Team Jersey", slug: "custom-team-jersey", price: 38, unit: "each", category: "Uniforms", isConfigurable: true },
  { name: "Practice Shorts", slug: "practice-shorts", price: 22, unit: "each", category: "Uniforms", isConfigurable: true },
  { name: "Team Hoodie", slug: "team-hoodie", price: 45, unit: "each", category: "Uniforms", isConfigurable: true },
  { name: "Athletic Socks (3-Pack)", slug: "athletic-socks-3pack", price: 14, unit: "pack", category: "Uniforms" },
  { name: "Team Bag", slug: "team-bag", price: 35, unit: "each", category: "Uniforms" },
];

const categories = ["All", "Flag Football", "Basketball", "Camps", "Uniforms"];

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "newest";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "price-asc", label: "Price (Low to High)" },
  { value: "price-desc", label: "Price (High to Low)" },
  { value: "newest", label: "Newest First" },
];

export default function ProgramCatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredPrograms = useMemo(() => {
    let programs = [...allPrograms];

    // Filter by category
    if (selectedCategory !== "All") {
      programs = programs.filter((p) => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      programs = programs.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name-asc":
        programs.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        programs.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        programs.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        programs.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        programs.reverse();
        break;
    }

    return programs;
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
                ? allPrograms.length
                : allPrograms.filter((p) => p.category === category).length;
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
          Programs &amp; Teams
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse open registrations, camps, and uniform orders
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search programs..."
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

        {/* Program Grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredPrograms.length} program
              {filteredPrograms.length !== 1 ? "s" : ""}
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

          {filteredPrograms.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPrograms.map((program) => (
                <ProgramCard key={program.slug} {...program} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
              <p className="text-lg font-medium text-muted-foreground">
                No programs found
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
