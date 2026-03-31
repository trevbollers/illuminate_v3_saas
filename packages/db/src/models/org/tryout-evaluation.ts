import { Schema, Document, Types } from "mongoose";

export interface IEvalScore {
  category: string;
  score: number;
  aiSuggested?: number;
}

export interface ITryoutEvaluation extends Document {
  sessionId: Types.ObjectId;
  registrationId: Types.ObjectId;
  playerId: Types.ObjectId;
  tryoutNumber: number;
  evaluatorId: Types.ObjectId;
  evaluatorName: string;
  sessionDay: number;

  rawTranscript: string;
  positives: string[];
  negatives: string[];
  scores: IEvalScore[];
  overallSentiment: "positive" | "neutral" | "negative";
  notes?: string;

  aiModel?: string;
  aiProcessedAt?: Date;
  manuallyEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const TryoutEvaluationSchema = new Schema<ITryoutEvaluation>(
  {
    sessionId: { type: Schema.Types.ObjectId, required: true },
    registrationId: { type: Schema.Types.ObjectId, required: true },
    playerId: { type: Schema.Types.ObjectId, required: true },
    tryoutNumber: { type: Number, required: true },
    evaluatorId: { type: Schema.Types.ObjectId, required: true },
    evaluatorName: { type: String, required: true },
    sessionDay: { type: Number, default: 1 },

    rawTranscript: { type: String, default: "" },
    positives: [{ type: String }],
    negatives: [{ type: String }],
    scores: [{
      category: { type: String, required: true },
      score: { type: Number, required: true },
      aiSuggested: { type: Number },
    }],
    overallSentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
    notes: { type: String },

    aiModel: { type: String },
    aiProcessedAt: { type: Date },
    manuallyEdited: { type: Boolean, default: false },
  },
  { timestamps: true },
);

TryoutEvaluationSchema.index({ sessionId: 1, tryoutNumber: 1 });
TryoutEvaluationSchema.index({ sessionId: 1, evaluatorId: 1 });
TryoutEvaluationSchema.index({ registrationId: 1 });
