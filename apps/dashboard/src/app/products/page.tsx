"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Package,
  MoreVertical,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@illuminate/ui";

const products = [
  {
    id: "1",
    name: "Ribeye Steak (Prime)",
    sku: "BF-RIB-001",
    category: "Beef",
    price: "$32.99/lb",
    stock: 145,
    status: "active" as const,
  },
  {
    id: "2",
    name: "Ground Beef (80/20)",
    sku: "BF-GRD-001",
    category: "Beef",
    price: "$8.99/lb",
    stock: 320,
    status: "active" as const,
  },
  {
    id: "3",
    name: "Pork Chop (Bone-In)",
    sku: "PK-CHP-001",
    category: "Pork",
    price: "$12.49/lb",
    stock: 85,
    status: "active" as const,
  },
  {
    id: "4",
    name: "Smoked Brisket",
    sku: "BF-SMK-001",
    category: "Prepared",
    price: "$24.99/lb",
    stock: 42,
    status: "active" as const,
  },
  {
    id: "5",
    name: "Lamb Rack (Frenched)",
    sku: "LM-RCK-001",
    category: "Lamb",
    price: "$38.99/lb",
    stock: 18,
    status: "active" as const,
  },
  {
    id: "6",
    name: "Italian Sausage Links",
    sku: "PK-SAU-001",
    category: "Prepared",
    price: "$11.99/lb",
    stock: 0,
    status: "inactive" as const,
  },
  {
    id: "7",
    name: "Chicken Breast (Boneless)",
    sku: "CH-BRS-001",
    category: "Poultry",
    price: "$9.49/lb",
    stock: 210,
    status: "active" as const,
  },
  {
    id: "8",
    name: "Beef Jerky (Original)",
    sku: "BF-JRK-001",
    category: "Prepared",
    price: "$18.99/8oz",
    stock: 64,
    status: "active" as const,
  },
];

const categories = ["All", "Beef", "Pork", "Lamb", "Poultry", "Prepared"];

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and pricing.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
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
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {product.sku}
                    </p>
                  </div>
                  <Badge
                    variant={
                      product.status === "active" ? "default" : "secondary"
                    }
                    className="text-[10px] shrink-0"
                  >
                    {product.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold">{product.price}</span>
                  <span
                    className={`text-xs font-medium ${
                      product.stock === 0
                        ? "text-red-600"
                        : product.stock < 30
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {product.stock === 0
                      ? "Out of stock"
                      : `${product.stock} in stock`}
                  </span>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {product.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{product.price}</TableCell>
                  <TableCell>
                    <span
                      className={`text-sm font-medium ${
                        product.stock === 0
                          ? "text-red-600"
                          : product.stock < 30
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "active" ? "default" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No products found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
