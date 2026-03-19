"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Truck, Store, Lock } from "lucide-react";
import { Button } from "@illuminate/ui/src/components/button";
import { Input } from "@illuminate/ui/src/components/input";
import { Label } from "@illuminate/ui/src/components/label";
import { Separator } from "@illuminate/ui/src/components/separator";
import { Badge } from "@illuminate/ui/src/components/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@illuminate/ui/src/components/card";
import { useCart } from "@/components/cart-provider";

type FulfillmentMethod = "delivery" | "pickup";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("delivery");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [contactInfo, setContactInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const shippingCost = fulfillment === "delivery" ? 9.99 : 0;
  const estimatedTax = subtotal * 0.0825;
  const total = subtotal + estimatedTax + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate order submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
    clearCart();
    router.push(`/orders/${orderId}`);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">
          No items to checkout
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your cart is empty. Add some products first.
        </p>
        <Link href="/products" className="mt-4 inline-block">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/cart">
        <Button variant="ghost" size="sm" className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Cart
        </Button>
      </Link>

      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
        Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="space-y-8 lg:col-span-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      required
                      value={contactInfo.firstName}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, firstName: e.target.value })
                      }
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      required
                      value={contactInfo.lastName}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, lastName: e.target.value })
                      }
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={contactInfo.email}
                    onChange={(e) =>
                      setContactInfo({ ...contactInfo, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    value={contactInfo.phone}
                    onChange={(e) =>
                      setContactInfo({ ...contactInfo, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fulfillment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fulfillment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setFulfillment("delivery")}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                      fulfillment === "delivery"
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        fulfillment === "delivery"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Delivery</p>
                      <p className="text-sm text-muted-foreground">
                        Delivered to your door ($9.99)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillment("pickup")}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                      fulfillment === "pickup"
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        fulfillment === "pickup"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Pickup</p>
                      <p className="text-sm text-muted-foreground">
                        Pick up in store (Free)
                      </p>
                    </div>
                  </button>
                </div>

                {/* Delivery Address */}
                {fulfillment === "delivery" && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Delivery Address
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        required={fulfillment === "delivery"}
                        value={deliveryAddress.street}
                        onChange={(e) =>
                          setDeliveryAddress({
                            ...deliveryAddress,
                            street: e.target.value,
                          })
                        }
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apartment">
                        Apartment / Suite (optional)
                      </Label>
                      <Input
                        id="apartment"
                        value={deliveryAddress.apartment}
                        onChange={(e) =>
                          setDeliveryAddress({
                            ...deliveryAddress,
                            apartment: e.target.value,
                          })
                        }
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          required={fulfillment === "delivery"}
                          value={deliveryAddress.city}
                          onChange={(e) =>
                            setDeliveryAddress({
                              ...deliveryAddress,
                              city: e.target.value,
                            })
                          }
                          placeholder="Meatville"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          required={fulfillment === "delivery"}
                          value={deliveryAddress.state}
                          onChange={(e) =>
                            setDeliveryAddress({
                              ...deliveryAddress,
                              state: e.target.value,
                            })
                          }
                          placeholder="TX"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          required={fulfillment === "delivery"}
                          value={deliveryAddress.zipCode}
                          onChange={(e) =>
                            setDeliveryAddress({
                              ...deliveryAddress,
                              zipCode: e.target.value,
                            })
                          }
                          placeholder="75001"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {fulfillment === "pickup" && (
                  <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                    <p className="font-semibold text-foreground">
                      Pickup Location
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Premium Meats
                      <br />
                      123 Butcher Lane, Meatville, TX 75001
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Hours: Mon-Sat 8am - 6pm, Sun 10am - 4pm
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-center">
                  <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 font-semibold text-foreground">
                    Stripe Payment Integration
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Secure payment processing will be integrated here. Supports
                    credit cards, Apple Pay, and Google Pay.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                        {item.configOptions.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {item.configOptions.map((opt) => (
                              <Badge
                                key={opt.name}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {opt.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">
                      {shippingCost === 0
                        ? "Free"
                        : `$${shippingCost.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Tax</span>
                    <span className="font-medium">
                      ${estimatedTax.toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-lg font-bold">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Place Order
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  By placing your order, you agree to our terms and conditions.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
