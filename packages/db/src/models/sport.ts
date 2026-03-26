import mongoose, { Document, Schema } from "mongoose";

// --- Sub-interfaces ---

export interface IPosition {
  key: string;
  label: string;
  abbreviation: string;
}

export interface IDivisionTemplate {
  key: string;
  label: string;
  minAge: number;
  maxAge: number;
}

export interface IStatCategory {
  key: string;
  label: string;
  stats: { key: string; label: string; type: "integer" | "decimal" }[];
}

// --- Main interface ---

export interface ISport extends Document {
  sportId: string;
  name: string;
  playersOnField: number;
  typicalRosterSize: { min: number; max: number };
  positions: IPosition[];
  divisionTemplates: IDivisionTemplate[];
  statCategories: IStatCategory[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Schema ---

const SportSchema = new Schema<ISport>(
  {
    sportId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    playersOnField: { type: Number, required: true },
    typicalRosterSize: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    positions: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        abbreviation: { type: String, required: true },
      },
    ],
    divisionTemplates: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        minAge: { type: Number, required: true },
        maxAge: { type: Number, required: true },
      },
    ],
    statCategories: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        stats: [
          {
            key: { type: String, required: true },
            label: { type: String, required: true },
            type: { type: String, enum: ["integer", "decimal"], default: "integer" },
          },
        ],
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Sport =
  (mongoose.models.Sport as mongoose.Model<ISport>) ||
  mongoose.model<ISport>("Sport", SportSchema);
