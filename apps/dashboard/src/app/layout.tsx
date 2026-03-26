import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, Tenant } from "@goparticipate/db";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard - Go Participate",
  description: "Go Participate operations management dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let tenantName = "Your Business";
  let planName = "free";
  let locations: { id: string; name: string }[] = [];

  if (session?.user?.tenantSlug) {
    try {
      await connectPlatformDB();
      const tenant = await Tenant.findOne({ slug: session.user.tenantSlug })
        .select("name plan.planId")
        .lean();

      if (tenant) {
        tenantName = tenant.name;
        planName = tenant.plan.planId;
      }
    } catch (err) {
      console.error("[dashboard:layout] Failed to fetch tenant:", err);
    }
  }

  const sidebarUser = session?.user
    ? {
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        role: (session.user.role as string) ?? "staff",
        image: session.user.image ?? null,
      }
    : null;

  return (
    <html lang="en">
      <body className={inter.className}>
        <DashboardShell
          businessName={tenantName}
          planName={planName}
          locations={locations}
          user={sidebarUser}
        >
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}
