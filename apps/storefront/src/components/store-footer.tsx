import React from "react";
import Link from "next/link";
import { Trophy, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@goparticipate/ui/src/components/separator";

export function StoreFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Go Participate
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Youth sports management made simple. Register athletes, pay dues,
              and order team gear — all in one place.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">
              Programs
            </h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/products"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                All Programs
              </Link>
              <Link
                href="/programs?category=flag-football"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Flag Football
              </Link>
              <Link
                href="/programs?category=basketball"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Basketball
              </Link>
              <Link
                href="/programs?category=camps"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Camps &amp; Clinics
              </Link>
              <Link
                href="/programs?category=uniforms"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Uniforms &amp; Gear
              </Link>
            </nav>
          </div>

          {/* Organization */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider">
              Organization
            </h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/#about"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                About Us
              </Link>
              <Link
                href="/#upcoming-events"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Upcoming Events
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
                <span>info@goparticipate.com</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Kansas City, MO</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Go Participate. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-foreground">Go Participate</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
