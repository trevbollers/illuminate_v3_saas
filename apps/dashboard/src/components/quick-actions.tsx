"use client";

import Link from "next/link";
import { Package, ShoppingCart, Warehouse, ChefHat, Factory, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@illuminate/ui";

const actions = [
  {
    title: "New Product",
    description: "Add a new product to your catalog",
    href: "/products/new",
    icon: Package,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "New Order",
    description: "Create a sales order or quote",
    href: "/sales/new",
    icon: ShoppingCart,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Check Inventory",
    description: "View and adjust stock levels",
    href: "/inventory",
    icon: Warehouse,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "New Recipe",
    description: "Create a processing recipe",
    href: "/recipes/new",
    icon: ChefHat,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "New Batch",
    description: "Start a production batch",
    href: "/production",
    icon: Factory,
    color: "bg-pink-100 text-pink-600",
  },
  {
    title: "Purchase Order",
    description: "Create a new purchase order",
    href: "/purchasing",
    icon: FileText,
    color: "bg-indigo-100 text-indigo-600",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-accent"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary">
                  {action.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
