export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, SystemConfig } from "@goparticipate/db";
import { requireAdmin } from "@/lib/require-admin";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/system
// Returns the singleton SystemConfig, upserting a default if none exists.
// Merges in live env-var detection so the client always sees current state.
// ---------------------------------------------------------------------------
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await connectPlatformDB();

    // Upsert the singleton — creates with schema defaults on first run.
    let config = await SystemConfig.findOne({ configId: "platform" });
    if (!config) {
      config = await SystemConfig.create({ configId: "platform" });
    }

    // -------------------------------------------------------------------
    // Detect which services have keys present in the environment.
    // We never return secret key values — only derived metadata.
    // -------------------------------------------------------------------
    const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
    const stripeConfigured = stripeKey.length > 0;
    const stripeMode = stripeKey.startsWith("sk_live_")
      ? "live"
      : stripeKey.startsWith("sk_test_")
        ? "test"
        : "unknown";

    const resendKey = process.env.RESEND_API_KEY ?? "";
    const emailConfigured = resendKey.length > 0;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? config.email.fromEmail ?? undefined;
    const fromName =
      process.env.RESEND_FROM_NAME ?? config.email.fromName ?? undefined;

    const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
    const aiConfigured = anthropicKey.length > 0;
    const aiModel =
      process.env.ANTHROPIC_MODEL ?? config.ai.model ?? "claude-sonnet-4-6";

    const twilioConfigured =
      !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
    const awsSnsConfigured =
      !!(process.env.AWS_SMS_REGION && (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN));
    const smsProvider = twilioConfigured
      ? "twilio"
      : awsSnsConfigured
        ? "aws_sns"
        : "none";
    const smsConfigured = twilioConfigured || awsSnsConfigured;

    // Build response — plain object so we control exactly what's serialised.
    const response = {
      configId: config.configId,
      stripe: {
        status: {
          configured: stripeConfigured,
          lastCheckedAt: config.stripe.status.lastCheckedAt ?? null,
          lastError: config.stripe.status.lastError ?? null,
        },
        mode: stripeConfigured ? stripeMode : config.stripe.mode,
        accountId: config.stripe.accountId ?? null,
        accountName: config.stripe.accountName ?? null,
        webhookUrl: config.stripe.webhookUrl ?? null,
        leagueProductId: config.stripe.leagueProductId ?? null,
        orgProductId: config.stripe.orgProductId ?? null,
      },
      email: {
        status: {
          configured: emailConfigured,
          lastCheckedAt: config.email.status.lastCheckedAt ?? null,
          lastError: config.email.status.lastError ?? null,
        },
        provider: config.email.provider,
        fromEmail: fromEmail ?? null,
        fromName: fromName ?? null,
        domainVerified: config.email.domainVerified,
      },
      sms: {
        status: {
          configured: smsConfigured,
          lastCheckedAt: config.sms?.status?.lastCheckedAt ?? null,
          lastError: config.sms?.status?.lastError ?? null,
        },
        provider: smsProvider,
        enabled: config.sms?.enabled ?? false,
        twilio: {
          fromNumber: twilioConfigured
            ? process.env.TWILIO_FROM_NUMBER!.replace(/.(?=.{4})/g, "*")
            : null,
        },
        awsSns: {
          region: awsSnsConfigured ? (process.env.AWS_SMS_REGION ?? null) : null,
          senderId: process.env.AWS_SNS_SENDER_ID ?? null,
        },
      },
      ai: {
        status: {
          configured: aiConfigured,
          lastCheckedAt: config.ai.status.lastCheckedAt ?? null,
          lastError: config.ai.status.lastError ?? null,
        },
        provider: config.ai.provider,
        model: aiModel,
        aiCoachEnabled: config.ai.aiCoachEnabled,
        aiScoutEnabled: config.ai.aiScoutEnabled,
      },
      storage: {
        status: {
          configured: config.storage.status.configured,
          lastCheckedAt: config.storage.status.lastCheckedAt ?? null,
          lastError: config.storage.status.lastError ?? null,
        },
        provider: config.storage.provider,
        bucket: config.storage.bucket ?? null,
        region: config.storage.region ?? null,
        encryptionEnabled: config.storage.encryptionEnabled,
      },
      platform: {
        domain: config.platform.domain,
        reservedSubdomains: config.platform.reservedSubdomains,
        maintenanceMode: config.platform.maintenanceMode,
        registrationOpen: config.platform.registrationOpen,
      },
      updatedAt: config.updatedAt,
      createdAt: config.createdAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/system]", error);
    return NextResponse.json(
      { error: "Failed to load system config" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/system
// Updates non-secret platform settings. Only the fields provided are written.
// Accepted top-level keys: platform, ai (model + feature toggles).
// ---------------------------------------------------------------------------

interface SystemPutBody {
  platform?: {
    maintenanceMode?: boolean;
    registrationOpen?: boolean;
    reservedSubdomains?: string[];
  };
  sms?: {
    enabled?: boolean;
  };
  ai?: {
    model?: string;
    aiCoachEnabled?: boolean;
    aiScoutEnabled?: boolean;
  };
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    await connectPlatformDB();

    const body: SystemPutBody = await req.json();

    // Build a flat $set update so we only touch provided fields.
    const updates: Record<string, unknown> = {};

    if (body.platform !== undefined) {
      if (body.platform.maintenanceMode !== undefined) {
        updates["platform.maintenanceMode"] = Boolean(
          body.platform.maintenanceMode
        );
      }
      if (body.platform.registrationOpen !== undefined) {
        updates["platform.registrationOpen"] = Boolean(
          body.platform.registrationOpen
        );
      }
      if (Array.isArray(body.platform.reservedSubdomains)) {
        updates["platform.reservedSubdomains"] =
          body.platform.reservedSubdomains.map(String);
      }
    }

    if (body.sms !== undefined) {
      if (body.sms.enabled !== undefined) {
        updates["sms.enabled"] = Boolean(body.sms.enabled);
      }
    }

    if (body.ai !== undefined) {
      if (typeof body.ai.model === "string" && body.ai.model.trim()) {
        updates["ai.model"] = body.ai.model.trim();
      }
      if (body.ai.aiCoachEnabled !== undefined) {
        updates["ai.aiCoachEnabled"] = Boolean(body.ai.aiCoachEnabled);
      }
      if (body.ai.aiScoutEnabled !== undefined) {
        updates["ai.aiScoutEnabled"] = Boolean(body.ai.aiScoutEnabled);
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 }
      );
    }

    const config = await SystemConfig.findOneAndUpdate(
      { configId: "platform" },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("[PUT /api/system]", error);
    return NextResponse.json(
      { error: "Failed to update system config" },
      { status: 500 }
    );
  }
}
