import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface ITenantPlanAddOn {
  featureId: string;
  stripeItemId?: string;
  status: string;
}

export interface ITenantPlan {
  planId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  lastPaymentAt?: Date;
  lastPaymentAmount?: number;
  lastPaymentStatus?: string;
  addOns: ITenantPlanAddOn[];
}

export interface IPaymentProviderConfig {
  provider: "stripe" | "paypal" | "square" | "zelle" | "cash_check";
  enabled: boolean;
  mode: "own_keys" | "connect"; // own_keys = BYO keys, connect = Go Participate Payments (premium)
  // Stripe — own keys
  stripePublishableKey?: string;
  stripeSecretKey?: string; // encrypted at rest
  stripeWebhookSecret?: string; // encrypted at rest
  // Stripe Connect (premium add-on)
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete?: boolean;
  // PayPal
  paypalClientId?: string;
  paypalClientSecret?: string; // encrypted at rest
  paypalMode?: "sandbox" | "live";
  // Square
  squareAccessToken?: string; // encrypted at rest
  squareLocationId?: string;
  squareEnvironment?: "sandbox" | "production";
  // Zelle — manual confirmation only
  zelleEmail?: string;
  zellePhone?: string;
  zelleDisplayName?: string;
  // Cash/Check — manual tracking
  cashCheckInstructions?: string;
  // Metadata
  connectedAt?: Date;
  lastTestedAt?: Date;
  testStatus?: "success" | "failed" | "untested";
}

export interface ITenantPaymentSettings {
  defaultProvider: "stripe" | "paypal" | "square" | "zelle" | "cash_check";
  providers: IPaymentProviderConfig[];
  platformFeePercent?: number; // only for Stripe Connect mode
}

export interface ITenantSettings {
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    displayName?: string;
  };
  features: {
    aiCoachAssistant: boolean;
    liveScoring: boolean;
    playerDevelopment: boolean;
    storefront: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    pushNotifications: boolean;
  };
  payments?: ITenantPaymentSettings;
  storefront?: {
    taxRate?: number; // percentage (e.g. 8.25 for 8.25%), 0 = no tax
    taxLabel?: string; // e.g. "Sales Tax", "GST"
  };
}

// --- Main interface ---

export interface ITenantSocials {
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  snapchat?: string;
  youtube?: string;
  facebook?: string;
  website?: string;
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  tenantType: "league" | "organization";
  customDomain?: string;
  owner: Types.ObjectId;
  plan: ITenantPlan;
  settings: ITenantSettings;
  socials: ITenantSocials;
  sport: string;           // Primary sport (legacy, kept for backwards compat)
  sports: string[];        // All sports this tenant participates in
  logoUrl?: string;
  bannerUrl?: string;
  status: "active" | "suspended" | "onboarding";
  onboardingStep: number;
  // League-specific
  leagueInfo?: {
    region?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  // Organization-specific
  orgInfo?: {
    leagueIds: Types.ObjectId[];
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    tenantType: {
      type: String,
      enum: ["league", "organization"],
      required: true,
    },
    customDomain: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      planId: { type: String, required: true },
      stripeCustomerId: { type: String },
      stripeSubscriptionId: { type: String },
      status: {
        type: String,
        enum: ["trialing", "active", "past_due", "canceled"],
        default: "trialing",
      },
      currentPeriodStart: { type: Date },
      currentPeriodEnd: { type: Date },
      trialEnd: { type: Date },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      canceledAt: { type: Date },
      lastPaymentAt: { type: Date },
      lastPaymentAmount: { type: Number },
      lastPaymentStatus: { type: String },
      addOns: [
        {
          featureId: { type: String, required: true },
          stripeItemId: { type: String },
          status: { type: String, default: "active" },
        },
      ],
    },
    settings: {
      branding: {
        logo: { type: String },
        primaryColor: { type: String, default: "#4F46E5" },
        secondaryColor: { type: String },
        displayName: { type: String },
      },
      features: {
        aiCoachAssistant: { type: Boolean, default: false },
        liveScoring: { type: Boolean, default: false },
        playerDevelopment: { type: Boolean, default: false },
        storefront: { type: Boolean, default: false },
      },
      notifications: {
        emailAlerts: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
      },
      payments: {
        defaultProvider: {
          type: String,
          enum: ["stripe", "paypal", "square", "zelle", "cash_check"],
          default: "stripe",
        },
        providers: [
          {
            provider: {
              type: String,
              enum: ["stripe", "paypal", "square", "zelle", "cash_check"],
              required: true,
            },
            enabled: { type: Boolean, default: false },
            mode: {
              type: String,
              enum: ["own_keys", "connect"],
              default: "own_keys",
            },
            // Stripe own keys
            stripePublishableKey: { type: String },
            stripeSecretKey: { type: String },
            stripeWebhookSecret: { type: String },
            // Stripe Connect
            stripeConnectAccountId: { type: String },
            stripeConnectOnboardingComplete: { type: Boolean },
            // PayPal
            paypalClientId: { type: String },
            paypalClientSecret: { type: String },
            paypalMode: { type: String, enum: ["sandbox", "live"] },
            // Square
            squareAccessToken: { type: String },
            squareLocationId: { type: String },
            squareEnvironment: { type: String, enum: ["sandbox", "production"] },
            // Zelle
            zelleEmail: { type: String },
            zellePhone: { type: String },
            zelleDisplayName: { type: String },
            // Cash/Check
            cashCheckInstructions: { type: String },
            // Meta
            connectedAt: { type: Date },
            lastTestedAt: { type: Date },
            testStatus: { type: String, enum: ["success", "failed", "untested"] },
            _id: false,
          },
        ],
        platformFeePercent: { type: Number },
      },
      storefront: {
        taxRate: { type: Number, default: 0 },
        taxLabel: { type: String, default: "Tax" },
      },
    },
    socials: {
      instagram: { type: String },
      tiktok: { type: String },
      twitter: { type: String },
      snapchat: { type: String },
      youtube: { type: String },
      facebook: { type: String },
      website: { type: String },
    },
    sport: { type: String, required: true, default: "7v7_football" },
    sports: [{ type: String }],
    logoUrl: { type: String },
    bannerUrl: { type: String },
    status: {
      type: String,
      enum: ["active", "suspended", "onboarding"],
      default: "onboarding",
    },
    onboardingStep: { type: Number, default: 0 },
    leagueInfo: {
      region: { type: String },
      website: { type: String },
      contactEmail: { type: String },
      contactPhone: { type: String },
    },
    orgInfo: {
      leagueIds: [{ type: Schema.Types.ObjectId, ref: "Tenant" }],
      city: { type: String },
      state: { type: String },
      contactEmail: { type: String },
      contactPhone: { type: String },
    },
  },
  { timestamps: true }
);

TenantSchema.index({ owner: 1 });
TenantSchema.index({ tenantType: 1 });
TenantSchema.index({ "plan.status": 1 });
TenantSchema.index({ sport: 1 });

export const Tenant =
  (mongoose.models.Tenant as mongoose.Model<ITenant>) ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
