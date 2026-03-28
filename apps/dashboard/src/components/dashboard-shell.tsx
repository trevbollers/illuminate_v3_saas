"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@goparticipate/ui";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  businessName: string;
  planName: string;
  locations: { id: string; name: string }[];
  user: {
    name: string;
    email: string;
    role: string;
    image: string | null;
  } | null;
  scopedRole?: string | null;
}

export function DashboardShell({
  children,
  businessName,
  planName,
  locations,
  user,
  scopedRole,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        businessName={businessName}
        planName={planName}
        locations={locations}
        user={user}
        scopedRole={scopedRole}
      />
      <SidebarInset>
        {scopedRole === "player_view" && (
          <div className="bg-blue-600 text-white text-center text-sm py-1.5 px-4">
            Player View — You're logged in with a player code. Some features are limited.
          </div>
        )}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
