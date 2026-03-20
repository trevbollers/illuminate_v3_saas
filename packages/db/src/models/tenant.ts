import mongoose, { Document, Schema, Types } from "mongoose";

// --- Sub-interfaces ---

export interface ILocation {
  _id: Types.ObjectId;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  type: "production" | "retail" | "warehouse";
  isActive: boolean;
}

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

export interface ITenantSettings {
  branding: {
    logo?: string;
    primaryColor?: string;
    businessName?: string;
  };
  features: {
    aiConfigurator: boolean;
    aiMrp: boolean;
    multiLocation: boolean;
    b2cStorefront: boolean;
  };
  notifications: {
    emailAlerts: boolean;
    lowStockThreshold: number;
  };
}

// --- Main interface ---

export interface ITenant extends Document {
  name: string;
  slug: string;
  customDomain?: string;
  owner: Types.ObjectId;
  plan: ITenantPlan;
  settings: ITenantSettings;
  locations: ILocation[];
  status: "active" | "suspended" | "onboarding";
  onboardingStep: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String, default: "US" },
    },
    type: {
      type: String,
      enum: ["production", "retail", "warehouse"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
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
        businessName: { type: String },
      },
      features: {
        aiConfigurator: { type: Boolean, default: false },
        aiMrp: { type: Boolean, default: false },
        multiLocation: { type: Boolean, default: false },
        b2cStorefront: { type: Boolean, default: false },
      },
      notifications: {
        emailAlerts: { type: Boolean, default: true },
        lowStockThreshold: { type: Number, default: 10 },
      },
    },
    locations: [LocationSchema],
    status: {
      type: String,
      enum: ["active", "suspended", "onboarding"],
      default: "onboarding",
    },
    onboardingStep: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes (slug unique index is defined on the field above)
TenantSchema.index({ owner: 1 });
TenantSchema.index({ "plan.status": 1 });

export const Tenant =
  (mongoose.models.Tenant as mongoose.Model<ITenant>) ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
