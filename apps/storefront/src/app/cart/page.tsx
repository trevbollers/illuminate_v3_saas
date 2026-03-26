"use client";

import React from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { useCart } from "@/components/cart-provider";

export default function CartPage() {
  const { items, itemCount, subtotal, removeItem, updateQuantity, clearCart } =
    useCart();

  const estimatedTax = subtotal * 0.0825;
  const total = subtotal + estimatedTax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Your cart is empty
          </h1>
          <p className="mt-2 text-muted-foreground">
            You haven&apos;t added any programs or items yet.
          </p>
          <Link href="/products" className="mt-6">
            <Button className="gap-2">
              Browse Programs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Registration Cart
          </h1>
          <p className="mt-1 text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart} className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Clear Cart
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="divide-y p-0">
              {/* Table Header - Desktop */}
              <div className="hidden grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                <div className="col-span-5">Program / Item</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1" />
              </div>

              {items.map((item) => (
                <div key={item.id} className="px-6 py-4">
                  <div className="grid items-center gap-4 sm:grid-cols-12">
                    {/* Item Info */}
                    <div className="flex items-center gap-4 sm:col-span-5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100">
                        <span className="text-2xl">{"\u{1F3C6}"}</span>
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/programs/${item.slug}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        {item.configOptions.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.configOptions.map((opt) => (
                              <Badge
                                key={opt.name}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {opt.name}: {opt.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-center gap-2 sm:col-span-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Unit Price */}
                    <div className="text-right text-sm text-muted-foreground sm:col-span-2">
                      <span className="sm:hidden">Unit: </span>$
                      {item.price.toFixed(2)}
                    </div>

                    {/* Total */}
                    <div className="text-right text-sm font-semibold text-foreground sm:col-span-2">
                      <span className="sm:hidden">Total: </span>$
                      {(item.price * item.quantity).toFixed(2)}
                    </div>

                    {/* Remove */}
                    <div className="flex justify-end sm:col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-4">
            <Link href="/products">
              <Button variant="ghost" className="gap-2">
                <ArrowRight className="h-4 w-4 rotate-180" />
                Continue Browsing
              </Button>
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Tax</span>
                <span className="font-medium">${estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="font-medium text-primary">
                  Calculated at checkout
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-base font-semibold">Estimated Total</span>
                <span className="text-lg font-bold">${total.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-3">
              <Link href="/checkout" className="w-full">
                <Button size="lg" className="w-full gap-2">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-center text-xs text-muted-foreground">
                Secure checkout powered by Stripe
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
