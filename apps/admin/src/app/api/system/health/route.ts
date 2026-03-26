export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB, SystemConfig } from "@goparticipate/db";
import { stripe } from "@goparticipate/billing";
import { Resend } from "resend";

export const runtime = "nodejs";

type ServiceName = "stripe" | "email" | "sms" | "ai" | "storage";

interface HealthResult {
  service: ServiceName;
  status: "ok" | "error";
  message: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Individual service checkers
// ---------------------------------------------------------------------------

async function checkStripe(): Promise<HealthResult> {
  try {
    const balance = await stripe.balance.retrieve();

    let accountId: string | undefined;
    let accountName: string | undefined;
    try {
      const account = await stripe.accounts.retrieve();
      accountId = account.id;
      accountName = account.settings?.dashboard?.display_name ?? account.id;
    } catch {
      // accounts.retrieve() fails on restricted keys — non-fatal.
    }

    return {
      service: "stripe",
      status: "ok",
      message: "Stripe connection verified",
      details: {
        available: balance.available,
        accountId: accountId ?? null,
        accountName: accountName ?? null,
      },
    };
  } catch (error) {
    return {
      service: "stripe",
      status: "error",
      message: error instanceof Error ? error.message : "Stripe check failed",
    };
  }
}

async function checkEmail(): Promise<HealthResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      service: "email",
      status: "error",
      message: "RESEND_API_KEY is not configured",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.domains.list();

    if (error) {
      return {
        service: "email",
        status: "error",
        message: error.message,
      };
    }

    return {
      service: "email",
      status: "ok",
      message: "Resend connection verified",
      details: {
        domainCount: data?.data?.length ?? 0,
      },
    };
  } catch (error) {
    return {
      service: "email",
      status: "error",
      message: error instanceof Error ? error.message : "Email check failed",
    };
  }
}

async function checkAI(): Promise<HealthResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      service: "ai",
      status: "error",
      message: "ANTHROPIC_API_KEY is not configured",
    };
  }

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: "ping" }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        service: "ai",
        status: "error",
        message: `Anthropic API returned ${res.status}: ${body}`,
      };
    }

    const data = await res.json();
    return {
      service: "ai",
      status: "ok",
      message: "Anthropic API connection verified",
      details: {
        model,
        responseId: data.id ?? null,
      },
    };
  } catch (error) {
    return {
      service: "ai",
      status: "error",
      message: error instanceof Error ? error.message : "AI check failed",
    };
  }
}

async function checkSMS(): Promise<HealthResult> {
  const hasTwilio =
    !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  const hasAWSSNS =
    !!(process.env.AWS_SMS_REGION && (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ROLE_ARN));

  if (!hasTwilio && !hasAWSSNS) {
    return {
      service: "sms",
      status: "error",
      message: "No SMS provider configured. Set TWILIO_* or AWS_SMS_* environment variables.",
    };
  }

  if (hasTwilio) {
    try {
      const twilio = await import("twilio");
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!,
      );
      // Verify credentials by fetching account info
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      return {
        service: "sms",
        status: "ok",
        message: "Twilio connection verified",
        details: {
          provider: "twilio",
          accountName: account.friendlyName,
          fromNumber: process.env.TWILIO_FROM_NUMBER,
        },
      };
    } catch (err: any) {
      return {
        service: "sms",
        status: "error",
        message: `Twilio check failed: ${err.message}`,
      };
    }
  }

  // AWS SNS — just verify the region is valid and credentials exist
  return {
    service: "sms",
    status: "ok",
    message: "AWS SNS env vars are present",
    details: {
      provider: "aws_sns",
      region: process.env.AWS_SMS_REGION,
      senderId: process.env.AWS_SNS_SENDER_ID ?? null,
    },
  };
}

async function checkStorage(): Promise<HealthResult> {
  const hasAccessKey = Boolean(process.env.AWS_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(process.env.AWS_SECRET_ACCESS_KEY);
  const hasBucket = Boolean(process.env.AWS_S3_BUCKET);
  const configured = hasAccessKey && hasSecretKey && hasBucket;

  if (!configured) {
    const missing: string[] = [];
    if (!hasAccessKey) missing.push("AWS_ACCESS_KEY_ID");
    if (!hasSecretKey) missing.push("AWS_SECRET_ACCESS_KEY");
    if (!hasBucket) missing.push("AWS_S3_BUCKET");

    return {
      service: "storage",
      status: "error",
      message: `Storage not configured. Missing: ${missing.join(", ")}`,
      details: { configured: false, missing },
    };
  }

  return {
    service: "storage",
    status: "ok",
    message: "Storage env vars are present (S3 connectivity not yet tested)",
    details: {
      configured: true,
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// POST /api/system/health
// Body: { service: "stripe" | "email" | "ai" | "storage" }
// Runs a lightweight connectivity check and persists the result to SystemConfig.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = body?.service as ServiceName | undefined;

    const validServices: ServiceName[] = ["stripe", "email", "sms", "ai", "storage"];
    if (!service || !validServices.includes(service)) {
      return NextResponse.json(
        {
          error: `Invalid service. Must be one of: ${validServices.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Run the appropriate check.
    let result: HealthResult;
    switch (service) {
      case "stripe":
        result = await checkStripe();
        break;
      case "email":
        result = await checkEmail();
        break;
      case "sms":
        result = await checkSMS();
        break;
      case "ai":
        result = await checkAI();
        break;
      case "storage":
        result = await checkStorage();
        break;
    }

    // Persist the check result back to SystemConfig so the dashboard can
    // surface last-checked timestamps and last errors without re-pinging.
    try {
      await connectPlatformDB();

      const statusUpdate: Record<string, unknown> = {
        [`${service}.status.lastCheckedAt`]: new Date(),
        [`${service}.status.configured`]: result.status === "ok",
        [`${service}.status.lastError`]:
          result.status === "error" ? result.message : null,
      };

      // For Stripe, also persist accountId / accountName if we got them.
      if (service === "stripe" && result.status === "ok" && result.details) {
        if (result.details.accountId) {
          statusUpdate["stripe.accountId"] = result.details.accountId;
        }
        if (result.details.accountName) {
          statusUpdate["stripe.accountName"] = result.details.accountName;
        }
        // Detect mode from the key prefix and persist.
        const key = process.env.STRIPE_SECRET_KEY ?? "";
        statusUpdate["stripe.mode"] = key.startsWith("sk_live_")
          ? "live"
          : key.startsWith("sk_test_")
            ? "test"
            : "unknown";
      }

      await SystemConfig.findOneAndUpdate(
        { configId: "platform" },
        { $set: statusUpdate },
        { upsert: true }
      );
    } catch (dbError) {
      // DB persistence is best-effort — don't fail the health check response.
      console.error("[POST /api/system/health] DB persist error:", dbError);
    }

    return NextResponse.json(result, {
      status: result.status === "ok" ? 200 : 502,
    });
  } catch (error) {
    console.error("[POST /api/system/health]", error);
    return NextResponse.json(
      { error: "Health check failed" },
      { status: 500 }
    );
  }
}
