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
}

export function DashboardShell({
  children,
  businessName,
  planName,
  locations,
  user,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardSidebar
        businessName={businessName}
        planName={planName}
        locations={locations}
        user={user}
      />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
