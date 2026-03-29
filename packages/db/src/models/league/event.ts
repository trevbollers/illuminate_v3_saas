import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IEventLocation {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  fields: string[]; // e.g. ["Field 1", "Field 2", "Court A"]
  notes?: string;
}

export interface IMultiTeamDiscount {
  minTeams: number; // e.g. 2
  discountPercent?: number; // e.g. 10 = 10% off
  discountAmountPerTeam?: number; // flat $ off per team, in cents
}

export interface IEventPricing {
  amount: number; // in cents
  earlyBirdAmount?: number;
  earlyBirdDeadline?: Date;
  lateFeeAmount?: number;
  lateFeeStartDate?: Date;
  stripePriceId?: string;
  refundPolicy?: string;
  multiTeamDiscounts?: IMultiTeamDiscount[];
}

export interface IEventDay {
  date: Date;
  startTime: string; // "08:00"
  endTime: string; // "18:00"
  label?: string; // "Day 1 — Pool Play", "Day 2 — Brackets"
}

export interface ITiebreakerRule {
  priority: number; // 1 = highest
  rule: string; // e.g. "Head-to-head record"
  description?: string;
}

export interface IEventSettings {
  gameDurationMinutes: number; // e.g. 40
  halfDurationMinutes?: number; // e.g. 20
  timeBetweenGamesMinutes: number; // e.g. 10
  clockType: "running" | "stop" | "mixed";
  overtimeRules?: string;
  maxRosterSize?: number;
  minRosterSize?: number;
  allowMultiTeamPlayers: boolean;
  requireAgeVerification: boolean;
  requireWaiver: boolean;
}

// --- Main interface ---

export interface IEvent extends Document {
  name: string;
  slug: string;
  type: "tournament" | "league_season" | "showcase" | "combine";
  sport: string;
  description?: string;
  posterUrl?: string;
  bannerUrl?: string;

  // Multi-location support
  locations: IEventLocation[];

  // Multi-day support
  days: IEventDay[];
  startDate: Date;
  endDate: Date;

  // Registration window
  registrationOpen: Date;
  registrationClose: Date;
  rosterLockDate?: Date;

  // Divisions & pools
  divisionIds: Types.ObjectId[];
  maxTeamsPerDivision?: number;
  estimatedTeamsPerDivision?: number; // projected team count for AI scheduling

  // Pricing
  pricing: IEventPricing;

  // Game & event settings
  settings: IEventSettings;

  // Tiebreaker rules (league admin can lock these)
  tiebreakerRules: ITiebreakerRule[];
  tiebreakerLocked: boolean; // if true, event admins cannot edit

  // Status
  status: "draft" | "published" | "registration_open" | "registration_closed" | "in_progress" | "completed" | "canceled";
  publishedAt?: Date;

  // Contact & comms
  contactEmail?: string;
  contactPhone?: string;
  rules?: string;
  announcementIds: Types.ObjectId[];

  // Metadata
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const EventLocationSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    fields: [{ type: String }],
    notes: { type: String },
  },
  { _id: false },
);

const EventDaySchema = new Schema(
  {
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    label: { type: String },
  },
  { _id: false },
);

const TiebreakerRuleSchema = new Schema(
  {
    priority: { type: Number, required: true },
    rule: { type: String, required: true },
    description: { type: String },
  },
  { _id: false },
);

export const EventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["tournament", "league_season", "showcase", "combine"],
      required: true,
    },
    sport: { type: String, required: true },
    description: { type: String },
    posterUrl: { type: String },
    bannerUrl: { type: String },

    locations: [EventLocationSchema],

    days: [EventDaySchema],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    registrationOpen: { type: Date, required: true },
    registrationClose: { type: Date, required: true },
    rosterLockDate: { type: Date },

    divisionIds: [{ type: Schema.Types.ObjectId, ref: "Division" }],
    maxTeamsPerDivision: { type: Number },
    estimatedTeamsPerDivision: { type: Number },

    pricing: {
      amount: { type: Number, required: true, default: 0 },
      earlyBirdAmount: { type: Number },
      earlyBirdDeadline: { type: Date },
      lateFeeAmount: { type: Number },
      lateFeeStartDate: { type: Date },
      stripePriceId: { type: String },
      refundPolicy: { type: String },
      multiTeamDiscounts: [{
        minTeams: { type: Number, required: true },
        discountPercent: { type: Number },
        discountAmountPerTeam: { type: Number },
        _id: false,
      }],
    },

    settings: {
      gameDurationMinutes: { type: Number, required: true, default: 40 },
      halfDurationMinutes: { type: Number },
      timeBetweenGamesMinutes: { type: Number, default: 10 },
      clockType: {
        type: String,
        enum: ["running", "stop", "mixed"],
        default: "running",
      },
      overtimeRules: { type: String },
      maxRosterSize: { type: Number },
      minRosterSize: { type: Number },
      allowMultiTeamPlayers: { type: Boolean, default: false },
      requireAgeVerification: { type: Boolean, default: true },
      requireWaiver: { type: Boolean, default: true },
    },

    tiebreakerRules: [TiebreakerRuleSchema],
    tiebreakerLocked: { type: Boolean, default: false },

    status: {
      type: String,
      enum: [
        "draft",
        "published",
        "registration_open",
        "registration_closed",
        "in_progress",
        "completed",
        "canceled",
      ],
      default: "draft",
    },
    publishedAt: { type: Date },

    contactEmail: { type: String },
    contactPhone: { type: String },
    rules: { type: String },
    announcementIds: [{ type: Schema.Types.ObjectId }],

    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

EventSchema.index({ status: 1, startDate: 1 });
EventSchema.index({ type: 1 });
