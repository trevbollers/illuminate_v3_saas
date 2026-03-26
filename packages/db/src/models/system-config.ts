import mongoose, { Document, Schema } from "mongoose";

// ---------------------------------------------------------------------------
// Sub-interfaces
// ---------------------------------------------------------------------------

export interface IServiceStatus {
  configured: boolean;
  lastCheckedAt?: Date;
  lastError?: string;
}

export interface IStripeConfig {
  status: IServiceStatus;
  mode: "test" | "live" | "unknown";
  accountId?: string;
  accountName?: string;
  webhookUrl?: string;
  /** Stripe product IDs for the two product lines */
  leagueProductId?: string;
  orgProductId?: string;
}

export interface IEmailConfig {
  status: IServiceStatus;
  provider: "resend";
  fromEmail?: string;
  fromName?: string;
  domainVerified: boolean;
}

export interface IAIConfig {
  status: IServiceStatus;
  provider: "anthropic";
  model: string;
  /** Feature-level toggles */
  aiCoachEnabled: boolean;
  aiScoutEnabled: boolean;
}

export interface ISMSConfig {
  status: IServiceStatus;
  provider: "twilio" | "aws_sns" | "none";
  /** Twilio settings — read from env vars, never returned to client */
  twilio?: {
    fromNumber?: string;
  };
  /** AWS SNS settings */
  awsSns?: {
    region?: string;
    senderId?: string;
  };
  /** Platform-wide SMS toggle */
  enabled: boolean;
}

export interface IStorageConfig {
  status: IServiceStatus;
  provider: "s3" | "local";
  bucket?: string;
  region?: string;
  /** Whether document vault encryption is active */
  encryptionEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Main interface
// ---------------------------------------------------------------------------

export interface ISystemConfig extends Document {
  /** Singleton key — always "platform" */
  configId: "platform";
  stripe: IStripeConfig;
  email: IEmailConfig;
  sms: ISMSConfig;
  ai: IAIConfig;
  storage: IStorageConfig;
  /** Platform-wide settings */
  platform: {
    domain: string;
    reservedSubdomains: string[];
    maintenanceMode: boolean;
    registrationOpen: boolean;
  };
  updatedAt: Date;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ServiceStatusSchema = new Schema(
  {
    configured: { type: Boolean, default: false },
    lastCheckedAt: { type: Date },
    lastError: { type: String },
  },
  { _id: false }
);

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    configId: {
      type: String,
      required: true,
      unique: true,
      default: "platform",
      enum: ["platform"],
    },
    stripe: {
      status: { type: ServiceStatusSchema, default: () => ({}) },
      mode: {
        type: String,
        enum: ["test", "live", "unknown"],
        default: "unknown",
      },
      accountId: { type: String },
      accountName: { type: String },
      webhookUrl: { type: String },
      leagueProductId: { type: String },
      orgProductId: { type: String },
    },
    email: {
      status: { type: ServiceStatusSchema, default: () => ({}) },
      provider: { type: String, enum: ["resend"], default: "resend" },
      fromEmail: { type: String },
      fromName: { type: String },
      domainVerified: { type: Boolean, default: false },
    },
    sms: {
      status: { type: ServiceStatusSchema, default: () => ({}) },
      provider: { type: String, enum: ["twilio", "aws_sns", "none"], default: "none" },
      twilio: {
        fromNumber: { type: String },
      },
      awsSns: {
        region: { type: String },
        senderId: { type: String },
      },
      enabled: { type: Boolean, default: false },
    },
    ai: {
      status: { type: ServiceStatusSchema, default: () => ({}) },
      provider: { type: String, enum: ["anthropic"], default: "anthropic" },
      model: { type: String, default: "claude-sonnet-4-6" },
      aiCoachEnabled: { type: Boolean, default: false },
      aiScoutEnabled: { type: Boolean, default: false },
    },
    storage: {
      status: { type: ServiceStatusSchema, default: () => ({}) },
      provider: { type: String, enum: ["s3", "local"], default: "local" },
      bucket: { type: String },
      region: { type: String },
      encryptionEnabled: { type: Boolean, default: false },
    },
    platform: {
      domain: { type: String, default: "goparticipate.com" },
      reservedSubdomains: {
        type: [String],
        default: [
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
        ],
      },
      maintenanceMode: { type: Boolean, default: false },
      registrationOpen: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const SystemConfig =
  (mongoose.models.SystemConfig as mongoose.Model<ISystemConfig>) ||
  mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);
