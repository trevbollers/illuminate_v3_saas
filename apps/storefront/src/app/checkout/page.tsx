"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Truck, Store } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { useCart } from "@/components/cart-provider";

type FulfillmentMethod = "ship" | "pickup";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("pickup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [taxLabel, setTaxLabel] = useState("Tax");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.taxRate != null) setTaxRate(data.taxRate);
        if (data.taxLabel) setTaxLabel(data.taxLabel);
      })
      .catch(() => {});
  }, []);

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

  const estimatedTax = taxRate > 0 ? subtotal * (taxRate / 100) : 0;
  const total = subtotal + estimatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          configOptions: item.configOptions.map((opt) => ({
            label: opt.name,
            value: opt.value,
          })),
        })),
        customer: {
          firstName: contactInfo.firstName.trim(),
          lastName: contactInfo.lastName.trim(),
          email: contactInfo.email.trim(),
          phone: contactInfo.phone.trim() || undefined,
        },
        fulfillment: {
          method: fulfillment,
          address:
            fulfillment === "ship"
              ? {
                  street: deliveryAddress.street.trim(),
                  apartment: deliveryAddress.apartment.trim() || undefined,
                  city: deliveryAddress.city.trim(),
                  state: deliveryAddress.state.trim(),
                  zipCode: deliveryAddress.zipCode.trim(),
                }
              : undefined,
        },
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      // Redirect to Stripe Checkout
      if (data.sessionUrl) {
        clearCart();
        window.location.href = data.sessionUrl;
      } else {
        throw new Error("No payment session URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setIsSubmitting(false);
    }
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
                    onClick={() => setFulfillment("ship")}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                      fulfillment === "ship"
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        fulfillment === "ship"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Ship to Me</p>
                      <p className="text-sm text-muted-foreground">
                        Gear shipped to your address
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
                      <p className="font-semibold">Pick Up at Practice</p>
                      <p className="text-sm text-muted-foreground">
                        Collect at your next practice
                      </p>
                    </div>
                  </button>
                </div>

                {fulfillment === "ship" && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Shipping Address
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        required={fulfillment === "ship"}
                        value={deliveryAddress.street}
                        onChange={(e) =>
                          setDeliveryAddress({ ...deliveryAddress, street: e.target.value })
                        }
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apartment">Apartment / Suite (optional)</Label>
                      <Input
                        id="apartment"
                        value={deliveryAddress.apartment}
                        onChange={(e) =>
                          setDeliveryAddress({ ...deliveryAddress, apartment: e.target.value })
                        }
                        placeholder="Apt 4B"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          required={fulfillment === "ship"}
                          value={deliveryAddress.city}
                          onChange={(e) =>
                            setDeliveryAddress({ ...deliveryAddress, city: e.target.value })
                          }
                          placeholder="Kansas City"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          required={fulfillment === "ship"}
                          value={deliveryAddress.state}
                          onChange={(e) =>
                            setDeliveryAddress({ ...deliveryAddress, state: e.target.value })
                          }
                          placeholder="MO"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          required={fulfillment === "ship"}
                          value={deliveryAddress.zipCode}
                          onChange={(e) =>
                            setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })
                          }
                          placeholder="64101"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {fulfillment === "pickup" && (
                  <div className="mt-6 rounded-lg border bg-muted/30 p-4">
                    <p className="font-semibold text-foreground">Practice Location</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your coach will provide the exact pickup location and time
                      after your order is confirmed.
                    </p>
                  </div>
                )}
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
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        {item.configOptions.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {item.configOptions.map((opt) => (
                              <Badge key={opt.name} variant="secondary" className="text-[10px]">
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
                  {estimatedTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated {taxLabel}</span>
                      <span className="font-medium">${estimatedTax.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-base font-semibold">Estimated Total</span>
                    <span className="text-lg font-bold">${total.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
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
                      Redirecting to Payment...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Continue to Payment
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Secure checkout powered by Stripe. You will be redirected to
                  complete payment.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
