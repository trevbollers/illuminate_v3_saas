"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  Store,
  Eye,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Textarea,
} from "@goparticipate/ui";

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: {
    productName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    configOptions: { label: string; value: string }[];
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  fulfillment: {
    method: "ship" | "pickup";
    status: string;
    trackingNumber?: string;
    address?: {
      street: string;
      apartment?: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  paymentStatus: string;
  notes?: string;
  createdAt: string;
}

const PAYMENT_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
  partial: "secondary",
};

const FULFILLMENT_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processing: "outline",
  shipped: "default",
  delivered: "default",
  picked_up: "default",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  picked_up: "Picked Up",
};

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (fulfillmentFilter !== "all") params.set("fulfillment", fulfillmentFilter);
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, fulfillmentFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrder = async (orderId: string, updates: Record<string, any>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? updated : o)),
        );
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(updated);
        }
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage storefront orders and fulfillment
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders, names, emails..."
            className="pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={fulfillmentFilter}
          onValueChange={(v) => {
            setFulfillmentFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fulfillment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fulfillment</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">
              Orders will appear here when customers place them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Fulfillment</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-medium">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {order.customer.firstName} {order.customer.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.customer.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatDollars(order.total)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={PAYMENT_BADGE[order.paymentStatus] || "secondary"}>
                            {order.paymentStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {order.fulfillment.method === "ship" ? (
                              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Store className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <Badge
                              variant={FULFILLMENT_BADGE[order.fulfillment.status] || "secondary"}
                            >
                              {FULFILLMENT_LABELS[order.fulfillment.status] ||
                                order.fulfillment.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Order Detail Panel */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={updateOrder}
          updating={updating}
        />
      )}
    </div>
  );
}

function OrderDetailPanel({
  order,
  onClose,
  onUpdate,
  updating,
}: {
  order: Order;
  onClose: () => void;
  onUpdate: (id: string, updates: Record<string, any>) => Promise<void>;
  updating: boolean;
}) {
  const [trackingNumber, setTrackingNumber] = useState(
    order.fulfillment.trackingNumber || "",
  );
  const [notes, setNotes] = useState(order.notes || "");

  const nextStatus: Record<string, string> = {
    pending: "processing",
    processing: order.fulfillment.method === "ship" ? "shipped" : "picked_up",
    shipped: "delivered",
  };

  const nextLabel: Record<string, string> = {
    pending: "Start Processing",
    processing: order.fulfillment.method === "ship" ? "Mark Shipped" : "Mark Picked Up",
    shipped: "Mark Delivered",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-background shadow-xl border-l">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{order.orderNumber}</h2>
            <p className="text-xs text-muted-foreground">
              {formatDate(order.createdAt)}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {order.customer.firstName} {order.customer.lastName}
              </p>
              <p className="text-muted-foreground">{order.customer.email}</p>
              {order.customer.phone && (
                <p className="text-muted-foreground">{order.customer.phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                      {item.configOptions.length > 0 &&
                        ` · ${item.configOptions.map((o) => `${o.label}: ${o.value}`).join(", ")}`}
                    </p>
                  </div>
                  <span className="font-medium">
                    {formatDollars(item.lineTotal)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatDollars(order.subtotal)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatDollars(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatDollars(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={PAYMENT_BADGE[order.paymentStatus] || "secondary"}>
                {order.paymentStatus}
              </Badge>
            </CardContent>
          </Card>

          {/* Fulfillment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Fulfillment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {order.fulfillment.method === "ship" ? (
                  <Truck className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Store className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm capitalize">{order.fulfillment.method}</span>
                <Badge
                  variant={FULFILLMENT_BADGE[order.fulfillment.status] || "secondary"}
                >
                  {FULFILLMENT_LABELS[order.fulfillment.status] || order.fulfillment.status}
                </Badge>
              </div>

              {order.fulfillment.method === "ship" && order.fulfillment.address && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <p>{order.fulfillment.address.street}</p>
                  {order.fulfillment.address.apartment && (
                    <p>{order.fulfillment.address.apartment}</p>
                  )}
                  <p>
                    {order.fulfillment.address.city},{" "}
                    {order.fulfillment.address.state}{" "}
                    {order.fulfillment.address.zip}
                  </p>
                </div>
              )}

              {order.fulfillment.method === "ship" &&
                order.paymentStatus === "paid" && (
                  <div className="space-y-2">
                    <Label htmlFor="tracking" className="text-xs">
                      Tracking Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="tracking"
                        placeholder="Enter tracking number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          updating ||
                          trackingNumber === (order.fulfillment.trackingNumber || "")
                        }
                        onClick={() =>
                          onUpdate(order._id, { trackingNumber })
                        }
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}

              {order.paymentStatus === "paid" &&
                nextStatus[order.fulfillment.status] && (
                  <Button
                    className="w-full"
                    disabled={updating}
                    onClick={() =>
                      onUpdate(order._id, {
                        fulfillmentStatus: nextStatus[order.fulfillment.status],
                      })
                    }
                  >
                    {updating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {nextLabel[order.fulfillment.status]}
                  </Button>
                )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Add internal notes about this order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={updating || notes === (order.notes || "")}
                onClick={() => onUpdate(order._id, { notes })}
              >
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
