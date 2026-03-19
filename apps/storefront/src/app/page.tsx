import React from "react";
import Link from "next/link";
import { ArrowRight, Truck, Award, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@illuminate/ui/src/components/button";
import { Separator } from "@illuminate/ui/src/components/separator";
import { ProductCard } from "@/components/product-card";
import { CategoryCard } from "@/components/category-card";

const featuredProducts = [
  {
    name: "Ribeye Steak",
    slug: "ribeye-steak",
    price: 32.99,
    unit: "lb",
    category: "Beef",
    isConfigurable: true,
  },
  {
    name: "Filet Mignon",
    slug: "filet-mignon",
    price: 45.99,
    unit: "lb",
    category: "Beef",
  },
  {
    name: "Baby Back Ribs",
    slug: "baby-back-ribs",
    price: 18.99,
    unit: "lb",
    category: "Pork",
    isConfigurable: true,
  },
  {
    name: "Free-Range Whole Chicken",
    slug: "free-range-whole-chicken",
    price: 12.99,
    unit: "each",
    category: "Poultry",
  },
  {
    name: "Wagyu Burger Patties",
    slug: "wagyu-burger-patties",
    price: 24.99,
    unit: "pack",
    category: "Specialty",
    isConfigurable: true,
  },
  {
    name: "Smoked Brisket",
    slug: "smoked-brisket",
    price: 28.99,
    unit: "lb",
    category: "Beef",
  },
];

const categories = [
  {
    name: "Beef",
    slug: "beef",
    description: "Premium cuts from grass-fed cattle",
    emoji: "\u{1F969}",
    productCount: 24,
  },
  {
    name: "Pork",
    slug: "pork",
    description: "Heritage breed pork, farm-raised",
    emoji: "\u{1F356}",
    productCount: 18,
  },
  {
    name: "Poultry",
    slug: "poultry",
    description: "Free-range chicken, duck & turkey",
    emoji: "\u{1F357}",
    productCount: 15,
  },
  {
    name: "Specialty",
    slug: "specialty",
    description: "Sausages, jerky & artisan creations",
    emoji: "\u{1F32D}",
    productCount: 12,
  },
];

export default function StorefrontHomePage() {
  return (
    <div>
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-200">
              Farm to Table Excellence
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Premium Meats,{" "}
              <span className="text-amber-300">Delivered Fresh</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-amber-100/80">
              Locally sourced from trusted farms, expertly butchered by master
              craftsmen. Experience the difference that quality makes in every
              cut, every bite.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products">
                <Button
                  size="lg"
                  className="gap-2 bg-white text-amber-900 hover:bg-amber-50"
                >
                  Browse All Products
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/quote">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-amber-300/50 text-white hover:bg-amber-800/50"
                >
                  Request Bulk Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            {
              icon: Award,
              title: "Premium Quality",
              desc: "Hand-selected cuts",
            },
            {
              icon: Truck,
              title: "Fast Delivery",
              desc: "Fresh to your door",
            },
            {
              icon: ShieldCheck,
              title: "100% Satisfaction",
              desc: "Guaranteed freshness",
            },
            {
              icon: Clock,
              title: "Same-Day Orders",
              desc: "Order by 2pm",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 text-center sm:text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Featured Products
            </h2>
            <p className="mt-2 text-muted-foreground">
              Our most popular cuts, hand-picked for you
            </p>
          </div>
          <Link href="/products" className="hidden sm:block">
            <Button variant="ghost" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <ProductCard key={product.slug} {...product} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/products">
            <Button variant="outline" className="gap-2">
              View All Products <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <Separator className="mx-auto max-w-7xl" />

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Shop by Category
          </h2>
          <p className="mt-2 text-muted-foreground">
            Find exactly what you&apos;re looking for
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.slug} {...category} />
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Crafted with Care,{" "}
                <span className="text-primary">Since 2010</span>
              </h2>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>
                  At Premium Meats, we believe that great food starts with great
                  ingredients. Our family-owned butcher shop has been serving the
                  community for over a decade, building lasting relationships with
                  local farmers and ranchers who share our commitment to quality.
                </p>
                <p>
                  Every cut is hand-selected by our master butchers, ensuring that
                  only the finest meats make it to your table. We practice
                  sustainable sourcing, supporting humane farming practices and
                  responsible land stewardship.
                </p>
                <p>
                  Whether you&apos;re grilling for the family, hosting a dinner
                  party, or stocking up for the week, we&apos;re here to provide
                  the quality and service you deserve.
                </p>
              </div>
              <div className="mt-8">
                <Link href="/products">
                  <Button size="lg" className="gap-2">
                    Browse All Products
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-8 text-center">
                  <p className="text-4xl font-bold text-amber-900">15+</p>
                  <p className="mt-1 text-sm text-amber-700">Years of Experience</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-8 text-center">
                  <p className="text-4xl font-bold text-amber-900">50+</p>
                  <p className="mt-1 text-sm text-amber-700">Product Varieties</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-8 text-center">
                  <p className="text-4xl font-bold text-amber-900">10K+</p>
                  <p className="mt-1 text-sm text-amber-700">Happy Customers</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-8 text-center">
                  <p className="text-4xl font-bold text-amber-900">100%</p>
                  <p className="mt-1 text-sm text-amber-700">Locally Sourced</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl">
            Ready to taste the difference?
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Order today and experience premium quality meats delivered fresh to
            your door.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/products">
              <Button
                size="lg"
                className="gap-2 bg-white text-primary hover:bg-white/90"
              >
                Browse All Products
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/quote">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Request Bulk Quote
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
