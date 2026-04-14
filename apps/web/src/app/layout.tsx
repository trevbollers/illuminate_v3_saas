import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@goparticipate/ui/src/globals.css";
import { Providers } from "../components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Go Participate | Youth Sports Team Management Platform",
  description:
    "The all-in-one platform for youth sports team management. Rosters, scheduling, payments, communication, live scoring, and AI coaching tools — built for 7v7 football, basketball, and beyond.",
  keywords: [
    "youth sports",
    "team management",
    "7v7 football",
    "basketball",
    "sports platform",
    "roster management",
    "league management",
    "Go Participate",
    "sports SaaS",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
