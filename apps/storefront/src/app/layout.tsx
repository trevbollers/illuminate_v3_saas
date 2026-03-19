import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-provider";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Premium Meats | Farm-Fresh Quality Delivered",
  description:
    "Locally sourced, expertly butchered premium meats. Shop our selection of beef, pork, poultry, and specialty cuts delivered fresh to your door.",
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
