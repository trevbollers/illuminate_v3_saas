import { AdminSidebar } from "@/components/admin-sidebar";
import { SessionProvider } from "@/components/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
