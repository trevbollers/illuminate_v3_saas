"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Package, ArrowRight } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";

interface OrderItem {
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  configOptions?: { label: string; value: string }[];
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: "pending" | "paid" | "failed";
  fulfillment: {
    method: string;
    status: string;
  };
  createdAt: string;
}

const PAYMENT_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paid", variant: "default" },
  pending: { label: "Payment Pending", variant: "secondary" },
  failed: { label: "Payment Failed", variant: "destructive" },
};

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Order not found");
        return r.json();
      })
      .then((data) => setOrder(data.order))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-foreground">Order Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t find this order. Please check your email for confirmation.
        </p>
        <Link href="/products" className="mt-4 inline-block">
          <Button>Browse Products</Button>
        </Link>
      </div>
    );
  }

  const badge = PAYMENT_BADGES[order.paymentStatus] || PAYMENT_BADGES.pending;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Success Header */}
      {isSuccess && (
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground">
            Order Confirmed!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Thank you for your order. A confirmation email has been sent to{" "}
            <span className="font-medium text-foreground">{order.customer.email}</span>.
          </p>
        </div>
      )}

      {!isSuccess && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Order Details</h1>
        </div>
      )}

      {/* Order Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Order {order.orderNumber}
            </CardTitle>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Items */}
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity} x ${(item.unitPrice / 100).toFixed(2)}
                  </p>
                  {item.configOptions && item.configOptions.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {item.configOptions.map((opt) => (
                        <Badge key={opt.label} variant="secondary" className="text-[10px]">
                          {opt.label}: {opt.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-sm font-medium">
                  ${(item.lineTotal / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${(order.subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>${(order.tax / 100).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">${(order.total / 100).toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Customer & Fulfillment */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Customer</h3>
              <p className="mt-1 text-sm">
                {order.customer.firstName} {order.customer.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{order.customer.email}</p>
              {order.customer.phone && (
                <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Fulfillment</h3>
              <div className="mt-1 flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{order.fulfillment.method}</span>
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                Status: {order.fulfillment.status}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <Link href="/products">
          <Button variant="outline" className="gap-2">
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
