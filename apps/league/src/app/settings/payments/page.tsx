"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  DollarSign,
  Building2,
  Banknote,
  Star,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@goparticipate/ui/src/components/card";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@goparticipate/ui/src/components/tabs";
import { Textarea } from "@goparticipate/ui/src/components/textarea";

interface ProviderConfig {
  provider: string;
  enabled: boolean;
  mode: string;
  // Stripe
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
  // PayPal
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalMode?: string;
  // Square
  squareAccessToken?: string;
  squareLocationId?: string;
  squareEnvironment?: string;
  // Zelle
  zelleEmail?: string;
  zellePhone?: string;
  zelleDisplayName?: string;
  // Cash/Check
  cashCheckInstructions?: string;
  // Meta
  connectedAt?: string;
  lastTestedAt?: string;
  testStatus?: string;
}

interface PaymentSettings {
  defaultProvider: string;
  providers: ProviderConfig[];
  platformFeePercent?: number;
}

const PROVIDER_INFO: Record<string, { label: string; description: string; icon: any; color: string }> = {
  stripe: {
    label: "Stripe",
    description: "Accept credit/debit cards, ACH bank transfers",
    icon: CreditCard,
    color: "bg-purple-100 text-purple-700",
  },
  paypal: {
    label: "PayPal",
    description: "Accept PayPal and Venmo payments",
    icon: DollarSign,
    color: "bg-blue-100 text-blue-700",
  },
  square: {
    label: "Square",
    description: "Accept cards online and in-person at events",
    icon: Building2,
    color: "bg-green-100 text-green-700",
  },
  zelle: {
    label: "Zelle",
    description: "Bank-to-bank transfers — no processing fees",
    icon: Zap,
    color: "bg-indigo-100 text-indigo-700",
  },
  cash_check: {
    label: "Cash / Check",
    description: "Manual payment tracking — mark as paid when received",
    icon: Banknote,
    color: "bg-amber-100 text-amber-700",
  },
};

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Form state per provider
  const [forms, setForms] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings/payments");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        // Initialize forms from existing config
        const formData: Record<string, any> = {};
        for (const p of data.providers || []) {
          formData[p.provider] = { ...p };
        }
        setForms(formData);
      }
    } catch (err) {
      console.error("Failed to load payment settings:", err);
    } finally {
      setLoading(false);
    }
  }

  function getForm(provider: string): any {
    return forms[provider] || { provider, enabled: false, mode: "own_keys" };
  }

  function updateForm(provider: string, field: string, value: any) {
    setForms((prev) => ({
      ...prev,
      [provider]: { ...getForm(provider), [field]: value },
    }));
  }

  async function saveProvider(provider: string) {
    setSaving(provider);
    try {
      const config = getForm(provider);
      const res = await fetch("/api/settings/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config }),
      });
      if (res.ok) {
        await fetchSettings();
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(null);
    }
  }

  async function testConnection(provider: string) {
    setTesting(provider);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/payments/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResult({
        provider,
        success: data.success,
        message: data.message || data.error || "Unknown result",
      });
      if (data.success) {
        await fetchSettings();
      }
    } catch (err) {
      setTestResult({ provider, success: false, message: "Connection test failed" });
    } finally {
      setTesting(null);
    }
  }

  async function setDefault(provider: string) {
    try {
      await fetch("/api/settings/payments/default", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await fetchSettings();
    } catch (err) {
      console.error("Failed to set default:", err);
    }
  }

  async function removeProvider(provider: string) {
    try {
      await fetch(`/api/settings/payments?provider=${provider}`, { method: "DELETE" });
      setForms((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      await fetchSettings();
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  }

  function isConfigured(provider: string): boolean {
    return (settings?.providers || []).some((p) => p.provider === provider && p.enabled);
  }

  function getTestStatus(provider: string): string | undefined {
    return (settings?.providers || []).find((p) => p.provider === provider)?.testStatus;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground">
          Configure how your league collects payments for event registrations, dues, and fees.
        </p>
      </div>

      {/* Active providers summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Payment Methods</CardTitle>
          <CardDescription>
            Teams will see these options when registering for your events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(settings?.providers || []).filter((p) => p.enabled).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payment methods configured yet. Set up at least one provider below.
              </p>
            ) : (
              (settings?.providers || [])
                .filter((p) => p.enabled)
                .map((p) => {
                  const info = PROVIDER_INFO[p.provider];
                  if (!info) return null;
                  const isDefault = settings?.defaultProvider === p.provider;
                  return (
                    <div
                      key={p.provider}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${info.color}`}>
                        <info.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{info.label}</span>
                      {isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="mr-1 h-3 w-3" /> Default
                        </Badge>
                      )}
                      {p.testStatus === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {p.testStatus === "failed" && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Provider tabs */}
      <Tabs defaultValue="stripe">
        <TabsList className="w-full justify-start">
          {Object.entries(PROVIDER_INFO).map(([key, info]) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              <info.icon className="h-4 w-4" />
              {info.label}
              {isConfigured(key) && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Stripe */}
        <TabsContent value="stripe" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Stripe</CardTitle>
                  <CardDescription>
                    Accept credit cards, debit cards, and ACH bank transfers. Enter your own Stripe API keys.
                  </CardDescription>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${PROVIDER_INFO.stripe!.color}`}>
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label>Publishable Key</Label>
                  <Input
                    placeholder="pk_test_..."
                    value={getForm("stripe").stripePublishableKey || ""}
                    onChange={(e) => updateForm("stripe", "stripePublishableKey", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Found in your Stripe Dashboard under Developers &gt; API keys
                  </p>
                </div>
                <div>
                  <Label>Secret Key</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.stripe ? "text" : "password"}
                      placeholder="sk_test_..."
                      value={getForm("stripe").stripeSecretKey || ""}
                      onChange={(e) => updateForm("stripe", "stripeSecretKey", e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSecrets((s) => ({ ...s, stripe: !s.stripe }))}
                    >
                      {showSecrets.stripe ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Webhook Secret (optional)</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.stripeWebhook ? "text" : "password"}
                      placeholder="whsec_..."
                      value={getForm("stripe").stripeWebhookSecret || ""}
                      onChange={(e) => updateForm("stripe", "stripeWebhookSecret", e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSecrets((s) => ({ ...s, stripeWebhook: !s.stripeWebhook }))}
                    >
                      {showSecrets.stripeWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Required for automatic payment confirmation. Set up a webhook endpoint pointing to your league URL.
                  </p>
                </div>
              </div>

              {testResult?.provider === "stripe" && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    testResult.success
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="mb-1 inline h-4 w-4" />
                  ) : (
                    <XCircle className="mb-1 inline h-4 w-4" />
                  )}{" "}
                  {testResult.message}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      updateForm("stripe", "enabled", true);
                      saveProvider("stripe");
                    }}
                    disabled={saving === "stripe"}
                  >
                    {saving === "stripe" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Stripe Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testConnection("stripe")}
                    disabled={testing === "stripe"}
                  >
                    {testing === "stripe" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                </div>
                <div className="flex gap-2">
                  {isConfigured("stripe") && settings?.defaultProvider !== "stripe" && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault("stripe")}>
                      Set as Default
                    </Button>
                  )}
                  {isConfigured("stripe") && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeProvider("stripe")}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PayPal */}
        <TabsContent value="paypal" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>PayPal</CardTitle>
                  <CardDescription>
                    Accept PayPal and Venmo payments. Parents love this option.
                  </CardDescription>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${PROVIDER_INFO.paypal!.color}`}>
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label>Client ID</Label>
                  <Input
                    placeholder="AaBb..."
                    value={getForm("paypal").paypalClientId || ""}
                    onChange={(e) => updateForm("paypal", "paypalClientId", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.paypal ? "text" : "password"}
                      placeholder="EeF..."
                      value={getForm("paypal").paypalClientSecret || ""}
                      onChange={(e) => updateForm("paypal", "paypalClientSecret", e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSecrets((s) => ({ ...s, paypal: !s.paypal }))}
                    >
                      {showSecrets.paypal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Mode</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={getForm("paypal").paypalMode || "sandbox"}
                    onChange={(e) => updateForm("paypal", "paypalMode", e.target.value)}
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </select>
                </div>
              </div>

              {testResult?.provider === "paypal" && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    testResult.success
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="mb-1 inline h-4 w-4" /> : <XCircle className="mb-1 inline h-4 w-4" />}{" "}
                  {testResult.message}
                </div>
              )}

              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      updateForm("paypal", "enabled", true);
                      saveProvider("paypal");
                    }}
                    disabled={saving === "paypal"}
                  >
                    {saving === "paypal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save PayPal Settings
                  </Button>
                  <Button variant="outline" onClick={() => testConnection("paypal")} disabled={testing === "paypal"}>
                    {testing === "paypal" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                </div>
                <div className="flex gap-2">
                  {isConfigured("paypal") && settings?.defaultProvider !== "paypal" && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault("paypal")}>Set as Default</Button>
                  )}
                  {isConfigured("paypal") && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeProvider("paypal")}>Remove</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Square */}
        <TabsContent value="square" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Square</CardTitle>
                  <CardDescription>
                    Accept payments online and in-person at events with Square terminals.
                  </CardDescription>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${PROVIDER_INFO.square!.color}`}>
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label>Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.square ? "text" : "password"}
                      placeholder="EAAAEd..."
                      value={getForm("square").squareAccessToken || ""}
                      onChange={(e) => updateForm("square", "squareAccessToken", e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowSecrets((s) => ({ ...s, square: !s.square }))}
                    >
                      {showSecrets.square ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Location ID</Label>
                  <Input
                    placeholder="L..."
                    value={getForm("square").squareLocationId || ""}
                    onChange={(e) => updateForm("square", "squareLocationId", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Environment</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={getForm("square").squareEnvironment || "sandbox"}
                    onChange={(e) => updateForm("square", "squareEnvironment", e.target.value)}
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      updateForm("square", "enabled", true);
                      saveProvider("square");
                    }}
                    disabled={saving === "square"}
                  >
                    {saving === "square" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Square Settings
                  </Button>
                </div>
                <div className="flex gap-2">
                  {isConfigured("square") && settings?.defaultProvider !== "square" && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault("square")}>Set as Default</Button>
                  )}
                  {isConfigured("square") && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeProvider("square")}>Remove</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zelle */}
        <TabsContent value="zelle" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Zelle</CardTitle>
                  <CardDescription>
                    Bank-to-bank transfers with no processing fees. Payments are confirmed manually.
                  </CardDescription>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${PROVIDER_INFO.zelle!.color}`}>
                  <Zap className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    placeholder="MidAmerica 7v7"
                    value={getForm("zelle").zelleDisplayName || ""}
                    onChange={(e) => updateForm("zelle", "zelleDisplayName", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Zelle Email</Label>
                  <Input
                    type="email"
                    placeholder="payments@yourleague.com"
                    value={getForm("zelle").zelleEmail || ""}
                    onChange={(e) => updateForm("zelle", "zelleEmail", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Zelle Phone (optional)</Label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={getForm("zelle").zellePhone || ""}
                    onChange={(e) => updateForm("zelle", "zellePhone", e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Zelle payments must be confirmed manually. When a team pays via Zelle, you will need to mark the registration as paid.
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => {
                    updateForm("zelle", "enabled", true);
                    saveProvider("zelle");
                  }}
                  disabled={saving === "zelle"}
                >
                  {saving === "zelle" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Zelle Settings
                </Button>
                <div className="flex gap-2">
                  {isConfigured("zelle") && settings?.defaultProvider !== "zelle" && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault("zelle")}>Set as Default</Button>
                  )}
                  {isConfigured("zelle") && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeProvider("zelle")}>Remove</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash / Check */}
        <TabsContent value="cash_check" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cash / Check</CardTitle>
                  <CardDescription>
                    Accept cash or check payments at events or by mail. All tracking is manual.
                  </CardDescription>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${PROVIDER_INFO.cash_check!.color}`}>
                  <Banknote className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Instructions</Label>
                <Textarea
                  placeholder="Make checks payable to MidAmerica 7v7 Football. Mail to: 123 Main St, Kansas City, MO 64111. Cash accepted at check-in on event day."
                  rows={4}
                  value={getForm("cash_check").cashCheckInstructions || ""}
                  onChange={(e) => updateForm("cash_check", "cashCheckInstructions", e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  These instructions will be shown to teams who choose to pay by cash or check.
                </p>
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => {
                    updateForm("cash_check", "enabled", true);
                    saveProvider("cash_check");
                  }}
                  disabled={saving === "cash_check"}
                >
                  {saving === "cash_check" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Cash/Check Settings
                </Button>
                <div className="flex gap-2">
                  {isConfigured("cash_check") && settings?.defaultProvider !== "cash_check" && (
                    <Button variant="ghost" size="sm" onClick={() => setDefault("cash_check")}>Set as Default</Button>
                  )}
                  {isConfigured("cash_check") && (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeProvider("cash_check")}>Remove</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
