import Stripe from "stripe";

const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

// ---------------------------------------------------------------------------
// PLATFORM Stripe — Go Participate's own Stripe account for SaaS subscriptions.
//
// DO NOT use these for tenant payment operations (event registration fees,
// dues collection, etc.). Tenant payments MUST use getTenantStripe() which
// creates a fresh instance from the tenant's own stored keys.
//
// If you need tenant Stripe in apps/league or apps/dashboard, use:
//   import { getTenantStripe } from "@goparticipate/billing";
// ---------------------------------------------------------------------------

let _platformStripe: Stripe | null = null;

/**
 * Returns the PLATFORM Stripe instance (Go Participate's own account).
 * Used ONLY for SaaS subscription billing (plans, checkout, portal).
 * NEVER use this for tenant-level payments.
 */
export function getStripe(): Stripe {
  if (!_platformStripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return _platformStripe;
}

/** @deprecated Use getStripe() instead — kept for backward compat */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

// ---------------------------------------------------------------------------
// TENANT Stripe — per-tenant Stripe instances using the tenant's own keys.
//
// Each call creates a NEW Stripe instance from the provided secret key.
// No caching, no singletons — this prevents key leakage between tenants.
// ---------------------------------------------------------------------------

/**
 * Creates a Stripe instance using a TENANT's own secret key.
 * Every call returns a new instance — no shared state between tenants.
 *
 * @param secretKey - The tenant's Stripe secret key (sk_test_... or sk_live_...)
 * @param tenantSlug - For logging/debugging only — identifies which tenant this belongs to
 * @throws if secretKey is missing or looks like a platform key
 */
export function getTenantStripe(secretKey: string, tenantSlug?: string): Stripe {
  if (!secretKey) {
    throw new Error(
      `Stripe secret key is missing for tenant${tenantSlug ? ` "${tenantSlug}"` : ""}. ` +
      `Configure it in Payment Settings.`
    );
  }

  // Guard: prevent accidentally passing the platform key
  if (secretKey === process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      `CRITICAL: Attempted to use the PLATFORM Stripe key as a tenant key` +
      `${tenantSlug ? ` for tenant "${tenantSlug}"` : ""}. ` +
      `This is a cross-key contamination bug. Tenant payments must use the tenant's own keys.`
    );
  }

  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
}

/**
 * Extracts the Stripe config for a tenant from their settings.payments object.
 * Returns null if Stripe is not configured or not enabled.
 */
export function getTenantStripeConfig(tenantSettings: any): {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  mode: "own_keys" | "connect";
} | null {
  const payments = tenantSettings?.payments;
  if (!payments?.providers) return null;

  const stripeProvider = payments.providers.find(
    (p: any) => p.provider === "stripe" && p.enabled,
  );

  if (!stripeProvider?.stripeSecretKey) return null;

  return {
    secretKey: stripeProvider.stripeSecretKey,
    publishableKey: stripeProvider.stripePublishableKey || "",
    webhookSecret: stripeProvider.stripeWebhookSecret,
    mode: stripeProvider.mode || "own_keys",
  };
}
