import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@illuminate/ui/src/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Illuminate Admin",
  description: "SaaS admin portal for managing the Illuminate platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
