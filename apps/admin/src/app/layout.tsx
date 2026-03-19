import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@illuminate/ui/src/globals.css";
import { AdminSidebar } from "@/components/admin-sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Illuminate Admin",
  description: "Super admin portal for managing the Illuminate platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <div className="flex h-screen overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto bg-muted/30">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
