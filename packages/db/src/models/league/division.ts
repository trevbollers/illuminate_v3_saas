import { Schema, Document, Types } from "mongoose";

// --- Sub-interfaces ---

export interface IPool {
  name: string; // e.g. "Pool A", "Pool B"
  teamIds: Types.ObjectId[];
}

export interface IBracketTier {
  name: string; // e.g. "Gold", "Silver", "Bronze"
  teamCount: number; // how many teams in this tier bracket
  bracketType: BracketType; // elimination format for this tier
}

// --- Main interface ---

export type EventFormat = "round_robin" | "pool_play_to_bracket" | "bracket_only";
export type BracketType = "single_elimination" | "double_elimination" | "consolation" | "round_robin" | "pool_play";

export interface IDivision extends Document {
  eventId?: Types.ObjectId; // if scoped to an event (null = league-wide template)
  key: string; // e.g. "10u_d1", "12u_d2"
  label: string; // e.g. "10U D1"
  sport: string;

  // Age eligibility
  minAge: number;
  maxAge: number;
  ageCutoffDate?: Date;

  // Grade-based alternative
  gradeBasedEligibility: boolean;
  minGrade?: number;
  maxGrade?: number;

  // Skill level (D1 = competitive, D2 = beginner, etc.)
  skillLevel?: "D1" | "D2" | "D3" | "open";
  skillLevelLabel?: string; // display label, e.g. "Competitive", "Recreational"

  // Event structure — defines how this division plays out
  eventFormat: EventFormat;
  // "round_robin"           — all pool play, standings determine winner
  // "pool_play_to_bracket"  — pool play first, top teams advance to bracket
  // "bracket_only"          — straight to elimination bracket

  // Pool play settings (applies when eventFormat includes pool play)
  minPoolGamesPerTeam: number; // minimum games each team must play in pool play (default 3)
  poolCount?: number; // number of pools (auto-calculated if not set)
  teamsAdvancingPerPool?: number; // how many teams per pool advance to bracket (default 2)

  // Pools within this division
  pools: IPool[];

  // Bracket tiers — admin-defined split of teams into bracket levels
  // e.g. 18U with 10 teams → Gold (6 teams), Silver (4 teams)
  bracketTiers: IBracketTier[];

  // Bracket config (applies when eventFormat includes bracket play)
  bracketType?: BracketType;
  maxTeams?: number;
  estimatedTeamCount?: number; // projected teams for AI scheduling

  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const PoolSchema = new Schema(
  {
    name: { type: String, required: true },
    teamIds: [{ type: Schema.Types.ObjectId }],
  },
  { _id: true },
);

export const DivisionSchema = new Schema<IDivision>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    key: { type: String, required: true },
    label: { type: String, required: true },
    sport: { type: String, required: true },

    minAge: { type: Number, required: true },
    maxAge: { type: Number, required: true },
    ageCutoffDate: { type: Date },

    gradeBasedEligibility: { type: Boolean, default: false },
    minGrade: { type: Number },
    maxGrade: { type: Number },

    skillLevel: {
      type: String,
      enum: ["D1", "D2", "D3", "open"],
    },
    skillLevelLabel: { type: String },

    eventFormat: {
      type: String,
      enum: ["round_robin", "pool_play_to_bracket", "bracket_only"],
      default: "round_robin",
    },

    minPoolGamesPerTeam: { type: Number, default: 3 },
    poolCount: { type: Number },
    teamsAdvancingPerPool: { type: Number, default: 2 },

    pools: [PoolSchema],

    bracketTiers: [
      {
        name: { type: String, required: true },
        teamCount: { type: Number, required: true },
        bracketType: {
          type: String,
          enum: ["single_elimination", "double_elimination", "consolation", "round_robin", "pool_play"],
          default: "single_elimination",
        },
        _id: false,
      },
    ],

    bracketType: {
      type: String,
      enum: ["single_elimination", "double_elimination", "consolation", "round_robin", "pool_play"],
    },
    maxTeams: { type: Number },
    estimatedTeamCount: { type: Number },

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

DivisionSchema.index({ sport: 1, isActive: 1 });
DivisionSchema.index({ eventId: 1 });
DivisionSchema.index({ key: 1, eventId: 1 });
