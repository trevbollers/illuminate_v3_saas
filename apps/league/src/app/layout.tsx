import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import { LeagueSidebar } from "@/components/league-sidebar";
import { AuthSessionProvider } from "@/components/session-provider";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "League Management — Go Participate",
  description: "Manage your league events, divisions, and registrations",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let leagueName = "Your League";

  if (session?.user?.tenantSlug) {
    try {
      await connectPlatformDB();
      const tenant = await Tenant.findOne({ slug: session.user.tenantSlug })
        .select("name")
        .lean();
      if (tenant) {
        leagueName = tenant.name;
      }
    } catch (err) {
      console.error("[league:layout] Failed to fetch tenant:", err);
    }
  }

  // Login page gets no sidebar
  const isLoginPage = !session?.user;

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthSessionProvider>
          {isLoginPage ? (
            children
          ) : (
            <div className="flex min-h-screen">
              <LeagueSidebar leagueName={leagueName} />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>
            </div>
          )}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
