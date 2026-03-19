export type BillingInterval = "monthly" | "yearly";

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  monthlyPriceId: string;
  yearlyPriceId: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    seats: number;
    storage: number; // in GB
    apiCalls: number; // per month
  };
}

export interface AddonConfig {
  id: string;
  name: string;
  description: string;
  priceId: string;
  unitPrice: number;
  unit: string;
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small teams getting started",
    monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    yearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
    monthlyPrice: 4900, // $49.00 in cents
    yearlyPrice: 47000, // $470.00 in cents (~2 months free)
    features: [
      "Up to 5 team members",
      "10 GB storage",
      "10,000 API calls/month",
      "Email support",
      "Basic analytics",
    ],
    limits: {
      seats: 5,
      storage: 10,
      apiCalls: 10_000,
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "For growing teams that need more power",
    monthlyPriceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID ?? "",
    yearlyPriceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID ?? "",
    monthlyPrice: 14900, // $149.00 in cents
    yearlyPrice: 142800, // $1,428.00 in cents (~2 months free)
    features: [
      "Up to 20 team members",
      "100 GB storage",
      "100,000 API calls/month",
      "Priority support",
      "Advanced analytics",
      "Custom integrations",
    ],
    limits: {
      seats: 20,
      storage: 100,
      apiCalls: 100_000,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    monthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? "",
    yearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID ?? "",
    monthlyPrice: 39900, // $399.00 in cents
    yearlyPrice: 382800, // $3,828.00 in cents (~2 months free)
    features: [
      "Unlimited team members",
      "1 TB storage",
      "Unlimited API calls",
      "Dedicated support",
      "Advanced analytics",
      "Custom integrations",
      "SSO / SAML",
      "Audit logs",
      "SLA guarantee",
    ],
    limits: {
      seats: -1, // unlimited
      storage: 1000,
      apiCalls: -1, // unlimited
    },
  },
} as const;

export const ADDONS: Record<string, AddonConfig> = {
  extra_seats: {
    id: "extra_seats",
    name: "Extra Seats",
    description: "Add additional team members beyond your plan limit",
    priceId: process.env.STRIPE_ADDON_EXTRA_SEATS_PRICE_ID ?? "",
    unitPrice: 1200, // $12.00 per seat/month in cents
    unit: "seat",
  },
  extra_storage: {
    id: "extra_storage",
    name: "Extra Storage",
    description: "Add additional storage capacity",
    priceId: process.env.STRIPE_ADDON_EXTRA_STORAGE_PRICE_ID ?? "",
    unitPrice: 500, // $5.00 per 10 GB/month in cents
    unit: "10 GB",
  },
} as const;

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return Object.values(PLANS).find(
    (plan) =>
      plan.monthlyPriceId === priceId || plan.yearlyPriceId === priceId
  );
}

export function getAddonByPriceId(priceId: string): AddonConfig | undefined {
  return Object.values(ADDONS).find((addon) => addon.priceId === priceId);
}

export function getPriceId(
  planId: string,
  interval: BillingInterval
): string | undefined {
  const plan = PLANS[planId];
  if (!plan) return undefined;
  return interval === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId;
}
