"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Menu, X, Trophy, Shield, Heart, Medal } from "lucide-react";
import { RoleSwitcher } from "./role-switcher";

// Marketing nav links — shown only to anonymous visitors.
const marketingLinks = [
  { href: "/programs", label: "Programs" },
  { href: "/#features", label: "Features" },
  { href: "/#roles", label: "Pricing" },
  { href: "/#about", label: "About" },
];

// Simple nav links for signed-in users — "My Family" as a home shortcut.
const signedInLinks = [
  { href: "/programs", label: "Programs" },
  { href: "/family", label: "My Family" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAuthed = status === "authenticated" && !!session?.user;
  const user = session?.user as any;
  const platformRole: string | undefined = user?.platformRole;
  const tenantType: string | undefined = user?.tenantType;
  const tenantSlug: string | undefined = user?.tenantSlug;
  const familyId: string | null | undefined = user?.familyId;

  // Figure out the "home" for this user — where their primary app lives.
  // Parents get /family on the marketing domain. Org/team owners and league
  // admins get their subdomain apps. Platform admins get the admin app.
  const homeLabel =
    platformRole === "gp_admin" || platformRole === "gp_support"
      ? "Admin"
      : tenantType === "league"
        ? "My League"
        : tenantType === "organization"
          ? "My Dashboard"
          : familyId
            ? "My Family"
            : "Home";

  const homeHref =
    platformRole === "gp_admin" || platformRole === "gp_support"
      ? process.env.NEXT_PUBLIC_ADMIN_URL || "/"
      : tenantType === "league"
        ? process.env.NEXT_PUBLIC_LEAGUE_URL || "/"
        : tenantType === "organization"
          ? process.env.NEXT_PUBLIC_DASHBOARD_URL || "/"
          : familyId
            ? "/family"
            : "/";

  const navLinks = isAuthed ? signedInLinks : marketingLinks;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-lg border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Medal className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Go Participate
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth area */}
          <div className="hidden md:flex md:items-center md:gap-3">
            {isAuthed ? (
              // Signed in — role switcher (hides itself if single-role) + home button
              <>
                <RoleSwitcher />
                <Button size="sm" asChild>
                  <Link href={homeHref}>{homeLabel}</Link>
                </Button>
              </>
            ) : (
              // Anonymous — Sign In dropdown + Get Started anchor scroll
              <>
                <div className="relative group">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    Sign In
                  </Button>
                  <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                    <div className="rounded-lg border bg-white shadow-lg p-2 min-w-[180px] space-y-1">
                      <a
                        href={process.env.NEXT_PUBLIC_LEAGUE_URL || "http://localhost:4002"}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Trophy className="h-4 w-4 text-blue-600" />
                        League Admin
                      </a>
                      <a
                        href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003"}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        <Shield className="h-4 w-4 text-emerald-600" />
                        Team / Org
                      </a>
                      <a
                        href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003"}/login`}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                      >
                        <Heart className="h-4 w-4 text-amber-600" />
                        Parent / Family
                      </a>
                    </div>
                  </div>
                </div>
                <Button size="sm" className="gap-1.5" asChild>
                  <Link href="/#roles">
                    Get Started
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-border bg-white/95 backdrop-blur-lg pb-4">
            <div className="flex flex-col gap-2 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted rounded-md"
                  onClick={() => setIsMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {isAuthed ? (
                <div className="mt-2 px-3 space-y-2">
                  <div className="flex justify-start">
                    <RoleSwitcher />
                  </div>
                  <Button size="sm" className="w-full" asChild>
                    <Link href={homeHref} onClick={() => setIsMobileOpen(false)}>
                      {homeLabel}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-2 space-y-1 px-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                    Sign In As
                  </p>
                  <a
                    href={process.env.NEXT_PUBLIC_LEAGUE_URL || "http://localhost:4002"}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-blue-50 text-gray-700"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Trophy className="h-4 w-4 text-blue-600" />
                    League Admin
                  </a>
                  <a
                    href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003"}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-emerald-50 text-gray-700"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Shield className="h-4 w-4 text-emerald-600" />
                    Team / Org
                  </a>
                  <a
                    href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003"}/login`}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-amber-50 text-gray-700"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Heart className="h-4 w-4 text-amber-600" />
                    Parent / Family
                  </a>
                  <div className="pt-2">
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/#roles" onClick={() => setIsMobileOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
