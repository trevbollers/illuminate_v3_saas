"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  Copy,
  ExternalLink,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Label } from "@goparticipate/ui/src/components/label";
import { Separator } from "@goparticipate/ui/src/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@goparticipate/ui/src/components/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StripeConfig {
  connected: boolean;
  connectionError: string | null;
  mode: "test" | "live" | "unknown";
  accountId: string | null;
  accountName: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  keys: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    secretKeyConfigured: boolean;
    publishableKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
  };
  webhook: {
    url: string;
    handledEvents: string[];
  };
  sync: {
    planCount: number;
    lastSyncAt: string | null;
  };
}

interface TestResult {
  status: "success" | "error";
  message: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({
  ok,
  trueLabel = "Yes",
  falseLabel = "No",
}: {
  ok: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return ok ? (
    <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
      <CheckCircle2 className="h-3 w-3" />
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      {falseLabel}
    </Badge>
  );
}

function ResultBanner({ result }: { result: TestResult }) {
  const isSuccess = result.status === "success";
  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div>
        <p className="font-medium">{result.message}</p>
        {result.detail && (
          <p className="mt-0.5 text-xs opacity-80">{result.detail}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StripePage() {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const checkoutSessionId = searchParams.get("session_id");

  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Product sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<TestResult | null>(null);
  const [syncDetails, setSyncDetails] = useState<
    { planId: string; name: string; status: string; details?: string }[]
  >([]);
  const [syncExpanded, setSyncExpanded] = useState(false);

  // Test checkout
  const [checkoutPlans, setCheckoutPlans] = useState<
    { planId: string; name: string }[]
  >([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<TestResult | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe-config");
      const data = await res.json();
      setConfig(data);
    } catch {
      // keep null
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/plans");
      const data = await res.json();
      const paid = data.filter(
        (p: any) => p.isActive && p.pricing?.monthly > 0
      );
      setCheckoutPlans(paid);
      if (paid.length > 0) setSelectedPlan(paid[0].planId);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadPlans();
  }, [loadConfig, loadPlans]);

  // Show result from checkout redirect
  useEffect(() => {
    if (checkoutStatus === "success") {
      setCheckoutResult({
        status: "success",
        message: "Test checkout completed successfully!",
        detail: checkoutSessionId
          ? `Session ID: ${checkoutSessionId}`
          : undefined,
      });
    } else if (checkoutStatus === "cancelled") {
      setCheckoutResult({
        status: "error",
        message: "Test checkout was cancelled.",
      });
    }
  }, [checkoutStatus, checkoutSessionId]);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/stripe-config/test-connection", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        const balanceStr = data.balance
          ?.map((b: any) => `${b.currency} ${b.amount}`)
          .join(", ");
        setTestResult({
          status: "success",
          message: data.message,
          detail: [
            data.accountName && `Account: ${data.accountName}`,
            balanceStr && `Balance: ${balanceStr}`,
          ]
            .filter(Boolean)
            .join(" · "),
        });
        // Refresh config to update connected status
        loadConfig();
      } else {
        setTestResult({ status: "error", message: data.error });
      }
    } catch {
      setTestResult({
        status: "error",
        message: "Request failed. Check that the web server is running.",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncDetails([]);
    try {
      const res = await fetch("/api/plans/stripe-sync", { method: "POST" });
      const data = await res.json();
      setSyncDetails(data.results ?? []);
      const errors = (data.results ?? []).filter(
        (r: any) => r.status === "error"
      );
      if (errors.length === 0) {
        setSyncResult({
          status: "success",
          message: `Synced ${data.results?.length ?? 0} plans from Stripe.`,
        });
      } else {
        setSyncResult({
          status: "error",
          message: `Sync completed with ${errors.length} error(s).`,
          detail: errors.map((e: any) => e.details ?? e.name).join(", "),
        });
      }
      setSyncExpanded(true);
      loadConfig();
      loadPlans();
    } catch {
      setSyncResult({
        status: "error",
        message: "Sync request failed.",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleTestCheckout() {
    if (!selectedPlan) return;
    setCheckoutLoading(true);
    setCheckoutResult(null);
    try {
      const res = await fetch("/api/stripe-config/test-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          billingInterval: selectedInterval,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        setCheckoutResult({
          status: "success",
          message: "Checkout session created. Opening in a new tab.",
          detail: `Session: ${data.sessionId}`,
        });
      } else {
        setCheckoutResult({
          status: "error",
          message: data.error ?? "Failed to create checkout session.",
        });
      }
    } catch {
      setCheckoutResult({
        status: "error",
        message: "Request failed.",
      });
    } finally {
      setCheckoutLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const modeColor =
    config?.mode === "live"
      ? "bg-emerald-100 text-emerald-800"
      : config?.mode === "test"
      ? "bg-amber-100 text-amber-800"
      : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Stripe Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your Stripe connection, sync products, and test the purchase
            flow.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadConfig} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Connection Status                                                */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Connection Status</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {config?.mode && config.mode !== "unknown" && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${modeColor}`}
                >
                  {config.mode === "live" ? "LIVE" : "TEST MODE"}
                </span>
              )}
              <StatusBadge
                ok={config?.connected ?? false}
                trueLabel="Connected"
                falseLabel="Not Connected"
              />
            </div>
          </div>
          <CardDescription>
            Live connection status with your Stripe account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config?.connectionError && (
            <ResultBanner
              result={{ status: "error", message: config.connectionError }}
            />
          )}

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Account</span>
              <span className="font-medium">
                {config?.accountName ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs">
                {config?.accountId ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Charges Enabled</span>
              <StatusBadge ok={config?.chargesEnabled ?? false} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Payouts Enabled</span>
              <StatusBadge ok={config?.payoutsEnabled ?? false} />
            </div>
          </div>

          <div className="pt-1">
            {testResult && <div className="mb-3"><ResultBanner result={testResult} /></div>}
            <Button
              onClick={handleTestConnection}
              disabled={testing}
              className="gap-2"
              size="sm"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {testing ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 2. API Keys                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">API Keys</CardTitle>
          <CardDescription>
            Keys are read from environment variables and cannot be edited here.
            Update <code className="text-xs bg-muted px-1 rounded">.env.local</code> to change them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                label: "Secret Key",
                value: config?.keys.secretKey,
                configured: config?.keys.secretKeyConfigured,
                envVar: "STRIPE_SECRET_KEY",
              },
              {
                label: "Publishable Key",
                value: config?.keys.publishableKey,
                configured: config?.keys.publishableKeyConfigured,
                envVar: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
              },
              {
                label: "Webhook Secret",
                value: config?.keys.webhookSecret,
                configured: config?.keys.webhookSecretConfigured,
                envVar: "STRIPE_WEBHOOK_SECRET",
              },
            ].map((key) => (
              <div
                key={key.envVar}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{key.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {key.value}
                  </p>
                </div>
                <StatusBadge
                  ok={key.configured ?? false}
                  trueLabel="Set"
                  falseLabel="Missing"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Webhook Configuration                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Webhook Configuration</CardTitle>
          <CardDescription>
            Add this endpoint URL in your{" "}
            <a
              href="https://dashboard.stripe.com/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              Stripe Dashboard
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Endpoint URL
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono">
                {config?.webhook.url}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() =>
                  config?.webhook.url && copyToClipboard(config.webhook.url)
                }
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Events */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Events to Subscribe
            </Label>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {config?.webhook.handledEvents.map((evt) => (
                <div
                  key={evt}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="font-mono">{evt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <strong>Local development:</strong> Use{" "}
            <code className="bg-amber-100 px-1 rounded">
              stripe listen --forward-to {config?.webhook.url}
            </code>{" "}
            to forward events to localhost. The CLI will print a webhook signing
            secret — set it as{" "}
            <code className="bg-amber-100 px-1 rounded">
              STRIPE_WEBHOOK_SECRET
            </code>
            .
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Product Sync                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Product Sync</CardTitle>
              <CardDescription className="mt-1">
                Import plan definitions from Stripe. Stripe is the source of
                truth for names, descriptions, and pricing.
              </CardDescription>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{config?.sync.planCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">plans synced</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Last sync</span>
            <span className="font-medium">
              {config?.sync.lastSyncAt
                ? new Date(config.sync.lastSyncAt).toLocaleString()
                : "Never"}
            </span>
          </div>

          {syncResult && <ResultBanner result={syncResult} />}

          {syncDetails.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSyncExpanded((v) => !v)}
              >
                {syncExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {syncExpanded ? "Hide" : "Show"} sync details
              </button>
              {syncExpanded && (
                <div className="mt-2 space-y-1">
                  {syncDetails.map((r) => (
                    <div
                      key={r.planId}
                      className="flex items-center justify-between rounded border px-3 py-1.5 text-xs"
                    >
                      <div>
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-2 font-mono text-muted-foreground">
                          {r.planId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.details && (
                          <span className="text-muted-foreground">
                            {r.details}
                          </span>
                        )}
                        {r.status === "ok" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSync}
            disabled={syncing || !config?.connected}
            className="gap-2"
            size="sm"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {syncing ? "Syncing..." : "Import from Stripe"}
          </Button>
          {!config?.connected && (
            <p className="text-xs text-muted-foreground">
              Stripe must be connected before syncing.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Test Purchase Flow                                               */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Test Purchase Flow
          </CardTitle>
          <CardDescription>
            Creates a real Stripe Checkout session in{" "}
            {config?.mode === "live" ? (
              <span className="font-semibold text-destructive">LIVE mode</span>
            ) : (
              <span className="font-semibold">test mode</span>
            )}
            . Opens in a new tab.{" "}
            {config?.mode !== "live" && (
              <>
                Use card <code className="bg-muted px-1 rounded text-xs">4242 4242 4242 4242</code> with
                any future expiry.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-select">Plan</Label>
              <Select
                value={selectedPlan}
                onValueChange={setSelectedPlan}
                disabled={checkoutPlans.length === 0}
              >
                <SelectTrigger id="plan-select">
                  <SelectValue
                    placeholder={
                      checkoutPlans.length === 0
                        ? "No paid plans — sync first"
                        : "Select a plan"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {checkoutPlans.map((p) => (
                    <SelectItem key={p.planId} value={p.planId}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interval-select">Billing Interval</Label>
              <Select
                value={selectedInterval}
                onValueChange={(v) =>
                  setSelectedInterval(v as "monthly" | "yearly")
                }
              >
                <SelectTrigger id="interval-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {checkoutResult && <ResultBanner result={checkoutResult} />}

          <Button
            onClick={handleTestCheckout}
            disabled={
              checkoutLoading ||
              !selectedPlan ||
              !config?.connected ||
              checkoutPlans.length === 0
            }
            className="gap-2"
            size="sm"
          >
            {checkoutLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            {checkoutLoading ? "Creating session..." : "Open Test Checkout"}
          </Button>

          {config?.mode === "live" && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <strong>Warning:</strong> You are in LIVE mode. This will create a
              real subscription. Only use test cards or cancel immediately.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
