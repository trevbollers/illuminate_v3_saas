"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Trash2,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Badge } from "@goparticipate/ui/src/components/badge";

interface CartItem {
  _id: string;
  leagueSlug: string;
  leagueName: string;
  eventId: string;
  eventName: string;
  divisionId: string;
  divisionLabel: string;
  teamId: string;
  teamName: string;
  sport: string;
  unitPriceCents: number;
  finalPriceCents: number;
  discountLabel?: string;
  isStale: boolean;
  capacityWarning: boolean;
  addedAt: string;
}

interface CartData {
  cart: {
    _id: string;
    status: string;
    items: CartItem[];
    checkouts: Array<{
      leagueSlug: string;
      status: string;
      amountCents: number;
    }>;
  } | null;
  subtotalByLeague: Record<string, { leagueName: string; amount: number }>;
  totalCents: number;
  itemCount: number;
}

interface CheckoutResult {
  checkouts: Array<{
    leagueSlug: string;
    leagueName: string;
    checkoutUrl: string | null;
    amountCents: number;
    free: boolean;
    manual: boolean;
  }>;
  errors: string[];
  cartStatus: string;
}

export default function RegistrationCartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/registration-cart");
      const data = await res.json();
      setCartData(data);
    } catch {
      setMessage({ type: "error", text: "Failed to load cart" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Handle Stripe redirect
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      setMessage({ type: "success", text: "Payment successful! Your registrations have been confirmed." });
    } else if (checkout === "canceled") {
      setMessage({ type: "error", text: "Checkout was canceled. Your items are still in the cart." });
    }
  }, [searchParams]);

  async function handleRemoveItem(itemId: string) {
    setRemoving(itemId);
    try {
      const res = await fetch(`/api/registration-cart/items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchCart();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to remove item" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to remove item" });
    } finally {
      setRemoving(null);
    }
  }

  async function handleCheckout() {
    setCheckingOut(true);
    setMessage(null);
    try {
      const res = await fetch("/api/registration-cart/checkout", { method: "POST" });
      const data: CheckoutResult = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: (data as any).error || "Checkout failed" });
        return;
      }

      if (data.errors.length > 0) {
        setMessage({ type: "error", text: data.errors.join(". ") });
      }

      // Find the first checkout that needs a Stripe redirect
      const stripeCheckout = data.checkouts.find((c) => c.checkoutUrl);
      if (stripeCheckout?.checkoutUrl) {
        window.location.href = stripeCheckout.checkoutUrl;
        return;
      }

      // All free or manual — refresh cart
      const allFree = data.checkouts.every((c) => c.free);
      if (allFree) {
        setMessage({ type: "success", text: "All registrations confirmed — no payment required!" });
      } else {
        setMessage({
          type: "success",
          text: "Registrations submitted. Contact the league for payment instructions.",
        });
      }
      await fetchCart();
    } catch {
      setMessage({ type: "error", text: "Checkout failed. Please try again." });
    } finally {
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cart = cartData?.cart;
  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  // Group items by league, then by event
  const grouped = new Map<string, Map<string, CartItem[]>>();
  for (const item of items) {
    if (!grouped.has(item.leagueSlug)) grouped.set(item.leagueSlug, new Map());
    const events = grouped.get(item.leagueSlug)!;
    if (!events.has(item.eventId)) events.set(item.eventId, []);
    events.get(item.eventId)!.push(item);
  }

  const hasWarnings = items.some((i) => i.isStale || i.capacityWarning);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registration Cart</h1>
          <p className="text-sm text-muted-foreground">
            {isEmpty
              ? "Your cart is empty"
              : `${items.length} registration${items.length === 1 ? "" : "s"} in cart`}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/events">
            <ArrowLeft className="mr-1 h-4 w-4" /> Browse Events
          </Link>
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-4">No registrations in your cart</p>
            <Button asChild>
              <Link href="/events">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {Array.from(grouped.entries()).map(([leagueSlug, events]) => (
              <Card key={leagueSlug}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-blue-600" />
                    {items.find((i) => i.leagueSlug === leagueSlug)?.leagueName || leagueSlug}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from(events.entries()).map(([eventId, eventItems]) => (
                    <div key={eventId}>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                        {eventItems[0].eventName}
                      </h4>
                      <div className="space-y-2">
                        {eventItems.map((item) => (
                          <div
                            key={item._id}
                            className={`flex items-center justify-between rounded-lg border p-3 ${
                              item.isStale || item.capacityWarning
                                ? "border-yellow-300 bg-yellow-50"
                                : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.teamName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.divisionLabel}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {item.discountLabel && (
                                  <span className="text-xs text-green-600">
                                    {item.discountLabel}
                                  </span>
                                )}
                                {item.isStale && (
                                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                                    <Clock className="h-3 w-3" /> Stale — re-validate
                                  </span>
                                )}
                                {item.capacityWarning && (
                                  <span className="flex items-center gap-1 text-xs text-yellow-600">
                                    <AlertTriangle className="h-3 w-3" /> Division may be full
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-sm">
                                {item.finalPriceCents === 0
                                  ? "Free"
                                  : `$${(item.finalPriceCents / 100).toFixed(2)}`}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(item._id)}
                                disabled={removing === item._id}
                              >
                                {removing === item._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* League subtotal */}
                  {cartData?.subtotalByLeague[leagueSlug] && (
                    <div className="flex justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">League Subtotal</span>
                      <span className="font-semibold">
                        ${(cartData.subtotalByLeague[leagueSlug].amount / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Checkout Summary */}
          <div>
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {Object.entries(cartData?.subtotalByLeague || {}).map(([slug, data]) => (
                    <div key={slug} className="flex justify-between">
                      <span className="text-muted-foreground">{data.leagueName}</span>
                      <span>${(data.amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t pt-3 text-base font-bold">
                  <span>Total</span>
                  <span>${((cartData?.totalCents || 0) / 100).toFixed(2)}</span>
                </div>

                {hasWarnings && (
                  <p className="text-xs text-yellow-600">
                    Some items have warnings. Prices will be re-validated at checkout.
                  </p>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={checkingOut || isEmpty}
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : cartData?.totalCents === 0 ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Registrations
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Checkout — ${((cartData?.totalCents || 0) / 100).toFixed(2)}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Payment is processed securely via Stripe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
