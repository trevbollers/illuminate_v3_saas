"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Mail,
  Brain,
  HardDrive,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Loader2,
  Copy,
  ExternalLink,
  Send,
  Zap,
  Settings2,
  Shield,
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
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Separator } from "@goparticipate/ui/src/components/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceStatus {
  configured: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
}

interface SystemConfig {
  stripe: {
    status: ServiceStatus;
    mode: "test" | "live" | "unknown";
    accountName: string | null;
    accountId: string | null;
    webhookUrl: string | null;
    leagueProductId: string | null;
    orgProductId: string | null;
  };
  email: {
    status: ServiceStatus;
    provider: string;
    fromEmail: string | null;
    fromName: string | null;
    domainVerified: boolean;
  };
  sms: {
    status: ServiceStatus;
    provider: "twilio" | "aws_sns" | "none";
    enabled: boolean;
    twilio: {
      fromNumber: string | null;
    };
    awsSns: {
      region: string | null;
      senderId: string | null;
    };
  };
  ai: {
    status: ServiceStatus;
    provider: string;
    model: string | null;
    aiCoachEnabled: boolean;
    aiScoutEnabled: boolean;
  };
  storage: {
    status: ServiceStatus;
    provider: string | null;
    bucket: string | null;
    region: string | null;
    encryptionEnabled: boolean;
  };
  platform: {
    domain: string;
    maintenanceMode: boolean;
    registrationOpen: boolean;
    reservedSubdomains: string[];
  };
}

interface TestResult {
  status: "success" | "error";
  message: string;
  detail?: string;
}

type ServiceKey = "stripe" | "email" | "sms" | "ai" | "storage";

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

export default function SystemPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-service test state
  const [serviceTestLoading, setServiceTestLoading] = useState<
    Record<ServiceKey, boolean>
  >({ stripe: false, email: false, sms: false, ai: false, storage: false });
  const [serviceTestResults, setServiceTestResults] = useState<
    Partial<Record<ServiceKey, TestResult>>
  >({});

  // Webhook copy state
  const [webhookCopied, setWebhookCopied] = useState(false);

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<TestResult | null>(
    null
  );

  // Test SMS state
  const [testSMSPhone, setTestSMSPhone] = useState("");
  const [smsTestLoading, setSMSTestLoading] = useState(false);
  const [smsTestResult, setSMSTestResult] = useState<TestResult | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system");
      const data = await res.json();
      setConfig(data);
    } catch {
      // keep null
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleServiceTest(service: ServiceKey) {
    setServiceTestLoading((prev) => ({ ...prev, [service]: true }));
    setServiceTestResults((prev) => {
      const next = { ...prev };
      delete next[service];
      return next;
    });
    try {
      const res = await fetch("/api/system/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      setServiceTestResults((prev) => ({
        ...prev,
        [service]: data.status === "ok"
          ? { status: "success", message: data.message }
          : { status: "error", message: data.message ?? data.error ?? "Test failed." },
      }));
    } catch {
      setServiceTestResults((prev) => ({
        ...prev,
        [service]: {
          status: "error",
          message: "Request failed. Check that the server is running.",
        },
      }));
    } finally {
      setServiceTestLoading((prev) => ({ ...prev, [service]: false }));
    }
  }

  async function handleSendTestEmail() {
    if (!testEmailAddress) return;
    setEmailTestLoading(true);
    setEmailTestResult(null);
    try {
      const res = await fetch("/api/system/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailAddress }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailTestResult({
          status: "success",
          message: data.message ?? "Test email sent successfully.",
          detail: data.detail,
        });
      } else {
        setEmailTestResult({
          status: "error",
          message: data.error ?? "Failed to send test email.",
        });
      }
    } catch {
      setEmailTestResult({
        status: "error",
        message: "Request failed.",
      });
    } finally {
      setEmailTestLoading(false);
    }
  }

  async function handleSendTestSMS() {
    if (!testSMSPhone) return;
    setSMSTestLoading(true);
    setSMSTestResult(null);
    try {
      const res = await fetch("/api/system/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testSMSPhone }),
      });
      const data = await res.json();
      setSMSTestResult({
        status: data.status === "success" ? "success" : "error",
        message: data.message,
        detail: data.detail,
      });
    } catch {
      setSMSTestResult({
        status: "error",
        message: "SMS test request failed. Check that the server is running.",
      });
    } finally {
      setSMSTestLoading(false);
    }
  }

  async function toggleSMSEnabled() {
    if (!config) return;
    const newVal = !config.sms.enabled;
    try {
      await fetch("/api/system", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms: { enabled: newVal } }),
      });
      loadConfig();
    } catch {
      // ignore
    }
  }

  function copyToClipboard(text: string, onCopied: () => void) {
    navigator.clipboard.writeText(text).then(() => {
      onCopied();
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stripeModeColor =
    config?.stripe.mode === "live"
      ? "bg-emerald-100 text-emerald-800"
      : config?.stripe.mode === "test"
      ? "bg-amber-100 text-amber-800"
      : "bg-muted text-muted-foreground";

  // Overview service definitions
  const overviewServices: {
    key: ServiceKey;
    label: string;
    Icon: React.ElementType;
    connected: boolean;
    subtitle: string | null;
  }[] = [
    {
      key: "stripe",
      label: "Stripe",
      Icon: CreditCard,
      connected: config?.stripe.status.configured ?? false,
      subtitle: config?.stripe.mode
        ? config.stripe.mode !== "unknown"
          ? config.stripe.mode === "live"
            ? "Live mode"
            : "Test mode"
          : null
        : null,
    },
    {
      key: "email",
      label: "Email (Resend)",
      Icon: Mail,
      connected: config?.email.status.configured ?? false,
      subtitle: config?.email.fromEmail ?? null,
    },
    {
      key: "sms",
      label: "SMS",
      Icon: MessageSquare,
      connected: config?.sms.status.configured ?? false,
      subtitle: config?.sms.provider !== "none"
        ? config?.sms.provider === "twilio" ? "Twilio" : "AWS SNS"
        : null,
    },
    {
      key: "ai",
      label: "AI (Anthropic)",
      Icon: Brain,
      connected: config?.ai.status.configured ?? false,
      subtitle: config?.ai.model ?? null,
    },
    {
      key: "storage",
      label: "Storage",
      Icon: HardDrive,
      connected: config?.storage.status.configured ?? false,
      subtitle: config?.storage.provider ?? null,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            System Configuration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Central hub for all external service integrations and platform
            settings.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadConfig}
          className="gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Services Overview                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewServices.map(({ key, label, Icon, connected, subtitle }) => (
          <Card key={key}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {label}
                    </p>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <StatusBadge
                  ok={connected}
                  trueLabel="Connected"
                  falseLabel="Not Connected"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  disabled={serviceTestLoading[key]}
                  onClick={() => handleServiceTest(key)}
                >
                  {serviceTestLoading[key] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  Test
                </Button>
              </div>

              {serviceTestResults[key] && (
                <div className="mt-2">
                  <ResultBanner result={serviceTestResults[key]!} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Stripe Configuration Card                                        */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Stripe Configuration</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {config?.stripe.mode && config.stripe.mode !== "unknown" && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stripeModeColor}`}
                >
                  {config.stripe.mode === "live" ? "LIVE" : "TEST MODE"}
                </span>
              )}
              <StatusBadge
                ok={config?.stripe.status.configured ?? false}
                trueLabel="Connected"
                falseLabel="Not Connected"
              />
            </div>
          </div>
          <CardDescription>
            Stripe payment processing connection and API key status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Account Name</span>
              <span className="font-medium">
                {config?.stripe.accountName ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs">
                {config?.stripe.accountId ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
              <span className="text-muted-foreground">API Keys</span>
              <StatusBadge
                ok={config?.stripe.status.configured ?? false}
                trueLabel="Configured"
                falseLabel="Not Configured"
              />
            </div>
          </div>

          <Separator />

          {/* Webhook URL */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Webhook Endpoint URL
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono truncate">
                {config?.stripe.webhookUrl ?? "—"}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  if (config?.stripe.webhookUrl) {
                    copyToClipboard(config.stripe.webhookUrl, () => {
                      setWebhookCopied(true);
                      setTimeout(() => setWebhookCopied(false), 2000);
                    });
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {webhookCopied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="/stripe">
                <ExternalLink className="h-3.5 w-3.5" />
                Go to full Stripe config
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Email Configuration Card                                         */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Email Configuration</CardTitle>
            </div>
            <StatusBadge
              ok={config?.email.status.configured ?? false}
              trueLabel="Configured"
              falseLabel="Not Configured"
            />
          </div>
          <CardDescription>
            Transactional email delivery via Resend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">
                {config?.email.provider ?? "Resend"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">API Key</span>
              <StatusBadge
                ok={config?.email.status.configured ?? false}
                trueLabel="Set"
                falseLabel="Missing"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">From Email</span>
              <span className="font-mono text-xs">
                {config?.email.fromEmail ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">From Name</span>
              <span className="font-medium">
                {config?.email.fromName ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
              <span className="text-muted-foreground">Domain Verified</span>
              <StatusBadge
                ok={config?.email.domainVerified ?? false}
                trueLabel="Verified"
                falseLabel="Not Verified"
              />
            </div>
          </div>

          <Separator />

          {/* Send Test Email */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Send Test Email
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                className="shrink-0 gap-2"
                disabled={emailTestLoading || !testEmailAddress}
                onClick={handleSendTestEmail}
              >
                {emailTestLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {emailTestLoading ? "Sending..." : "Send"}
              </Button>
            </div>
            {emailTestResult && (
              <div className="mt-3">
                <ResultBanner result={emailTestResult} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3b. SMS Configuration Card                                          */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">SMS Configuration</CardTitle>
          </div>
          <CardDescription>
            Platform-level SMS delivery for invites, reminders, and notifications.
            Configure Twilio or AWS SNS via environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">
                {config?.sms.provider === "twilio"
                  ? "Twilio"
                  : config?.sms.provider === "aws_sns"
                    ? "AWS SNS"
                    : "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">SMS Delivery</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={toggleSMSEnabled}
                disabled={!config?.sms.status.configured}
              >
                <StatusBadge
                  ok={config?.sms.enabled ?? false}
                  trueLabel="Enabled"
                  falseLabel="Disabled"
                />
              </Button>
            </div>
            {config?.sms.provider === "twilio" && config.sms.twilio.fromNumber && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
                <span className="text-muted-foreground">From Number</span>
                <span className="font-mono text-xs">{config.sms.twilio.fromNumber}</span>
              </div>
            )}
            {config?.sms.provider === "aws_sns" && (
              <>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-mono text-xs">{config.sms.awsSns.region ?? "—"}</span>
                </div>
                {config.sms.awsSns.senderId && (
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-muted-foreground">Sender ID</span>
                    <span className="font-mono text-xs">{config.sms.awsSns.senderId}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Env vars needed */}
          {!config?.sms.status.configured && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">Environment variables needed:</p>
              <div className="grid gap-1 sm:grid-cols-2 text-xs font-mono">
                <div>
                  <p className="font-semibold text-amber-900 mb-0.5">Twilio</p>
                  <p>TWILIO_ACCOUNT_SID</p>
                  <p>TWILIO_AUTH_TOKEN</p>
                  <p>TWILIO_FROM_NUMBER</p>
                </div>
                <div>
                  <p className="font-semibold text-amber-900 mb-0.5">AWS SNS</p>
                  <p>AWS_SMS_REGION</p>
                  <p>AWS_ACCESS_KEY_ID</p>
                  <p>AWS_SECRET_ACCESS_KEY</p>
                  <p>AWS_SNS_SENDER_ID (optional)</p>
                </div>
              </div>
            </div>
          )}

          {/* Send test SMS */}
          {config?.sms.status.configured && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground">Send Test SMS</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={testSMSPhone}
                    onChange={(e) => setTestSMSPhone(e.target.value)}
                    className="max-w-[240px]"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendTestSMS}
                    disabled={!testSMSPhone.trim() || smsTestLoading}
                    className="gap-1.5"
                  >
                    {smsTestLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send
                  </Button>
                </div>
                {smsTestResult && (
                  <div className="mt-2">
                    <ResultBanner result={smsTestResult} />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 4. AI Configuration Card                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Configuration</CardTitle>
            </div>
            <StatusBadge
              ok={config?.ai.status.configured ?? false}
              trueLabel="Configured"
              falseLabel="Not Configured"
            />
          </div>
          <CardDescription>
            Anthropic Claude AI integration for AI Coach and AI Scout features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">
                {config?.ai.provider ?? "Anthropic"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">API Key</span>
              <StatusBadge
                ok={config?.ai.status.configured ?? false}
                trueLabel="Set"
                falseLabel="Missing"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
              <span className="text-muted-foreground">Current Model</span>
              <span className="font-mono text-xs">
                {config?.ai.model ?? "—"}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              AI Feature Toggles
            </Label>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>AI Coach</span>
                </div>
                <StatusBadge
                  ok={config?.ai.aiCoachEnabled ?? false}
                  trueLabel="Enabled"
                  falseLabel="Disabled"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>AI Scout</span>
                </div>
                <StatusBadge
                  ok={config?.ai.aiScoutEnabled ?? false}
                  trueLabel="Enabled"
                  falseLabel="Disabled"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Platform Settings Card                                           */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Platform Settings</CardTitle>
          </div>
          <CardDescription>
            Core platform configuration and operational state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border px-3 py-2 sm:col-span-2">
              <span className="text-muted-foreground">Platform Domain</span>
              <span className="font-mono text-xs font-medium">
                {config?.platform.domain ?? "goparticipate.com"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Maintenance Mode</span>
              </div>
              <StatusBadge
                ok={config?.platform.maintenanceMode ?? false}
                trueLabel="On"
                falseLabel="Off"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-muted-foreground">Registration</span>
              <StatusBadge
                ok={config?.platform.registrationOpen ?? true}
                trueLabel="Open"
                falseLabel="Closed"
              />
            </div>
          </div>

          <Separator />

          {/* Reserved Subdomains */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Reserved Subdomains
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {(
                config?.platform.reservedSubdomains ?? [
                  "www",
                  "api",
                  "admin",
                  "app",
                  "auth",
                  "billing",
                  "docs",
                  "help",
                  "mail",
                  "status",
                  "support",
                ]
              ).map((sub) => (
                <Badge
                  key={sub}
                  variant="outline"
                  className="font-mono text-xs"
                >
                  {sub}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
