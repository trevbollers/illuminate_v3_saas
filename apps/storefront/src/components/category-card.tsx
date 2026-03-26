import React from "react";
import Link from "next/link";

export interface CategoryCardProps {
  name: string;
  slug: string;
  description: string;
  emoji: string;
  productCount?: number;
}

export function CategoryCard({
  name,
  slug,
  description,
  emoji,
  productCount,
}: CategoryCardProps) {
  return (
    <Link href={`/products?category=${slug}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex aspect-[3/2] items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <span className="text-7xl transition-transform duration-300 group-hover:scale-110">
            {emoji}
          </span>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {productCount !== undefined && (
            <p className="mt-2 text-xs font-medium text-primary">
              {productCount} programs
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
