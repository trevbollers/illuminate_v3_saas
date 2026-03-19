import React from "react";
import Link from "next/link";
import { Beef, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@illuminate/ui/src/components/separator";

export function StoreFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Beef className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Premium Meats
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Locally sourced, expertly butchered. Delivering the finest cuts
              straight to your door since 2010.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">
              Shop
            </h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/products"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                All Products
              </Link>
              <Link
                href="/products?category=beef"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Beef
              </Link>
              <Link
                href="/products?category=pork"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Pork
              </Link>
              <Link
                href="/products?category=poultry"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Poultry
              </Link>
              <Link
                href="/products?category=specialty"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Specialty
              </Link>
            </nav>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">
              Company
            </h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/#about"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                About Us
              </Link>
              <Link
                href="/quote"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Request a Quote
              </Link>
              <Link
                href="/#contact"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4" id="contact">
            <h4 className="text-sm font-semibold uppercase tracking-wider">
              Contact Us
            </h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>(555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>orders@premiummeats.com</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>123 Butcher Lane, Meatville, TX 75001</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Premium Meats. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-foreground">Illuminate</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
