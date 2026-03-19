import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@illuminate/ui/src/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Illuminate | Modern Meat Business Management",
  description:
    "The all-in-one platform to manage your meat business end to end. Inventory, recipes, orders, analytics, and more.",
  keywords: [
    "meat business",
    "meat locker",
    "inventory management",
    "butcher shop",
    "meat processing",
    "SaaS",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
