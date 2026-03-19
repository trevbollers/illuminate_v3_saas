"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, ChefHat } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@illuminate/ui";

const recipes = [
  {
    id: "r-1",
    name: "Smoked Brisket",
    category: "Smoking",
    ingredients: 8,
    yield: "12 lbs",
    costPerUnit: "$14.20/lb",
    status: "active" as const,
  },
  {
    id: "r-2",
    name: "Italian Sausage Mix",
    category: "Sausage",
    ingredients: 12,
    yield: "25 lbs",
    costPerUnit: "$6.80/lb",
    status: "active" as const,
  },
  {
    id: "r-3",
    name: "Original Beef Jerky",
    category: "Curing",
    ingredients: 9,
    yield: "5 lbs",
    costPerUnit: "$12.50/lb",
    status: "active" as const,
  },
  {
    id: "r-4",
    name: "Maple Bacon Cure",
    category: "Curing",
    ingredients: 6,
    yield: "20 lbs",
    costPerUnit: "$8.90/lb",
    status: "active" as const,
  },
  {
    id: "r-5",
    name: "Bratwurst Blend",
    category: "Sausage",
    ingredients: 10,
    yield: "30 lbs",
    costPerUnit: "$5.40/lb",
    status: "draft" as const,
  },
  {
    id: "r-6",
    name: "Herb-Crusted Prime Rib",
    category: "Roasting",
    ingredients: 7,
    yield: "8 lbs",
    costPerUnit: "$22.30/lb",
    status: "active" as const,
  },
];

const recipeCategories = [
  "All",
  "Smoking",
  "Sausage",
  "Curing",
  "Roasting",
  "Marinating",
];

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = recipes.filter((r) => {
    const matchesSearch = r.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory = category === "All" || r.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-muted-foreground">
            Manage your processing recipes and formulations.
          </p>
        </div>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Recipe
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {recipeCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipe Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Ingredients</TableHead>
              <TableHead>Yield</TableHead>
              <TableHead>Cost / Unit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((recipe) => (
              <TableRow key={recipe.id} className="cursor-pointer">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <ChefHat className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{recipe.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {recipe.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {recipe.ingredients}
                </TableCell>
                <TableCell>{recipe.yield}</TableCell>
                <TableCell className="font-medium">
                  {recipe.costPerUnit}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      recipe.status === "active" ? "default" : "secondary"
                    }
                    className="text-[10px] capitalize"
                  >
                    {recipe.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <ChefHat className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No recipes found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
