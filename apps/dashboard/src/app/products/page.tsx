"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
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
} from "@goparticipate/ui";

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  imageUrl?: string;
  pricing: {
    amount: number;
    type: "one_time" | "recurring";
    interval?: string;
    allowPartialPayment?: boolean;
    installmentCount?: number;
  };
  options: { label: string; values: string[]; priceAdjustments?: { value: string; amount: number }[] }[];
  isActive: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  fan_gear: "Fan Gear",
  uniforms: "Uniforms",
  season_dues: "Season Dues",
  monthly_dues: "Monthly Dues",
  training: "Training Sessions",
  donations: "Donations",
  other: "Other",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Form state
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("fan_gear");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formPriceAmount, setFormPriceAmount] = useState("");
  const [formPriceType, setFormPriceType] = useState<"one_time" | "recurring">("one_time");
  const [formInterval, setFormInterval] = useState("monthly");
  const [formAllowPartial, setFormAllowPartial] = useState(false);
  const [formInstallments, setFormInstallments] = useState("");

  const fetchProducts = useCallback(() => {
    fetch("/api/products?active=false")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormCategory("fan_gear");
    setFormImageUrl("");
    setFormPriceAmount("");
    setFormPriceType("one_time");
    setFormInterval("monthly");
    setFormAllowPartial(false);
    setFormInstallments("");
    setFormError("");
  }

  function startCreate() {
    resetForm();
    setEditing(null);
    setCreating(true);
  }

  function startEdit(p: Product) {
    setFormName(p.name);
    setFormDescription(p.description);
    setFormCategory(p.category);
    setFormImageUrl(p.imageUrl || "");
    setFormPriceAmount((p.pricing.amount / 100).toFixed(2));
    setFormPriceType(p.pricing.type);
    setFormInterval(p.pricing.interval || "monthly");
    setFormAllowPartial(p.pricing.allowPartialPayment || false);
    setFormInstallments(p.pricing.installmentCount?.toString() || "");
    setFormError("");
    setCreating(false);
    setEditing(p._id);
  }

  function cancelForm() {
    resetForm();
    setCreating(false);
    setEditing(null);
  }

  async function handleSave() {
    setFormError("");
    const priceNum = parseFloat(formPriceAmount);
    if (!formName.trim()) {
      setFormError("Name is required");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Valid price is required");
      return;
    }

    setSaving(true);
    const payload = {
      name: formName.trim(),
      description: formDescription.trim(),
      category: formCategory,
      imageUrl: formImageUrl.trim() || undefined,
      pricing: {
        amount: Math.round(priceNum * 100),
        type: formPriceType,
        interval: formPriceType === "recurring" ? formInterval : undefined,
        allowPartialPayment: formAllowPartial,
        installmentCount: formInstallments ? parseInt(formInstallments) : undefined,
      },
    };

    try {
      const url = editing ? `/api/products/${editing}` : "/api/products";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      fetchProducts();
      cancelForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p._id !== id));
    if (editing === id) cancelForm();
  }

  const filtered =
    filter === "all"
      ? products
      : filter === "active"
        ? products.filter((p) => p.isActive)
        : filter === "inactive"
          ? products.filter((p) => !p.isActive)
          : products.filter((p) => p.category === filter);

  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products & Dues</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active products in your storefront
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "inactive", label: "Inactive" },
          ...CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {(creating || editing) && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {creating ? "New Product" : "Edit Product"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={cancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Team Jersey, Season Dues"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Product description shown in storefront"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Price ($) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPriceAmount}
                  onChange={(e) => setFormPriceAmount(e.target.value)}
                  placeholder="29.99"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={formPriceType} onValueChange={(v) => setFormPriceType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formPriceType === "recurring" && (
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={formInterval} onValueChange={setFormInterval}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Partial payment */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formAllowPartial}
                onChange={(e) => setFormAllowPartial(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">Allow partial / installment payments</span>
                <p className="text-xs text-muted-foreground">
                  Customers can pay in multiple installments
                </p>
              </div>
            </label>

            {formAllowPartial && (
              <div className="space-y-2 pl-7">
                <Label>Number of installments</Label>
                <Input
                  type="number"
                  min="2"
                  value={formInstallments}
                  onChange={(e) => setFormInstallments(e.target.value)}
                  placeholder="e.g., 3"
                />
              </div>
            )}

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {creating ? "Create Product" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-3" />
            <p className="text-sm">No products yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={startCreate}>
              Add your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p._id}
              className={`transition-colors ${!p.isActive ? "opacity-60" : ""} ${
                editing === p._id ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      {!p.isActive && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] mb-2">
                      {CATEGORY_LABELS[p.category] || p.category}
                    </Badge>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {p.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {formatPrice(p.pricing.amount)}
                      </span>
                      {p.pricing.type === "recurring" && (
                        <span className="text-xs text-muted-foreground">
                          / {p.pricing.interval}
                        </span>
                      )}
                    </div>
                    {p.pricing.allowPartialPayment && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Partial payments accepted
                        {p.pricing.installmentCount
                          ? ` (${p.pricing.installmentCount} installments)`
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(p._id, p.isActive)}
                      title={p.isActive ? "Deactivate" : "Activate"}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {p.isActive ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(p)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
