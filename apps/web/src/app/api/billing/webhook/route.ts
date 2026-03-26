import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@goparticipate/billing";
import { connectPlatformDB } from "@goparticipate/db";

// Must be Node.js runtime — Stripe needs raw body for signature verification
export const runtime = "nodejs";

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const reader = req.body?.getReader();
  if (!reader) throw new Error("No request body");

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error("[webhook] Failed to read request body:", err);
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }

  try {
    // Ensure platform DB is connected before webhook handler runs
    await connectPlatformDB();

    const result = await handleWebhookEvent(rawBody, signature, webhookSecret);

    console.log(`[webhook] ${result.event}: ${result.message}`);
    return NextResponse.json({ received: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook] Handler failed: ${message}`);

    // Return 400 for signature errors (Stripe will not retry), 500 for others
    const status = message.includes("signature") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
