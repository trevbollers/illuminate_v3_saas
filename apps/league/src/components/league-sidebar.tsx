"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Layers,
  ClipboardList,
  ShieldCheck,
  GitBranch,
  Trophy,
  LogOut,
  Menu,
  X,
  CreditCard,
  Settings,
  Megaphone,
  FileText,
  BarChart3,
} from "lucide-react";
import { cn } from "@goparticipate/ui/src/lib/utils";
import { Button } from "@goparticipate/ui/src/components/button";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Divisions", href: "/divisions", icon: Layers },
  { label: "Registrations", href: "/registrations", icon: ClipboardList },
  { label: "Brackets", href: "/brackets", icon: GitBranch },
  { label: "Standings", href: "/standings", icon: BarChart3 },
  { label: "Verification", href: "/verification", icon: ShieldCheck },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Payments", href: "/settings/payments", icon: CreditCard },
];

export function LeagueSidebar({ leagueName }: { leagueName: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "LA";

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            {leagueName}
          </h1>
          <p className="text-xs text-muted-foreground">League Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-blue-600")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <span className="text-sm font-semibold">{initials}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">
              {session?.user?.name ?? "League Admin"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session?.user?.email ?? ""}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
            <Trophy className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">{leagueName}</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        {navContent}
      </aside>
    </>
  );
}
