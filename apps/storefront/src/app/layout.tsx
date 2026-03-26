import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Go Participate | Youth Sports Organization",
  description:
    "Join teams, pay dues, register for events, and order uniforms. Your youth sports organization — all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <StoreHeader />
            <main className="flex-1">{children}</main>
            <StoreFooter />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
