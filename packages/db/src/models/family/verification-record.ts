import { Schema, Document, Types } from "mongoose";

export interface IVerificationUsage {
  tenantSlug: string;
  usedAt: Date;
  purpose: "age_verification" | "eligibility" | "medical_clearance" | "identity";
}

export interface IVerificationRecord extends Document {
  playerId: Types.ObjectId;
  playerName: string;
  dateOfBirth: Date;

  // Document proof
  documentType: "birth_certificate" | "passport" | "school_id" | "state_id" | "medical_form" | "other";
  documentIdentifier?: string;         // Certificate #, passport # (encrypted)
  documentIdentifierHash: string;      // SHA-256 for matching without exposing

  // Verification
  verifiedAt: Date;
  verifiedBy: string;                  // Tenant slug of verifying entity
  verifiedByUserId?: Types.ObjectId;
  verificationMethod: "manual_review" | "ai_ocr" | "api_lookup" | "self_declared";
  verificationHash: string;            // SHA-256(name + DOB + docId) — immutable proof

  // Status
  status: "verified" | "expired" | "revoked" | "disputed";
  expiresAt?: Date;                    // null for birth certs, annual for medical
  revokedAt?: Date;
  revokedReason?: string;

  // Reuse tracking
  usedBy: IVerificationUsage[];

  createdAt: Date;
  updatedAt: Date;
}

export const VerificationRecordSchema = new Schema<IVerificationRecord>(
  {
    playerId: { type: Schema.Types.ObjectId, required: true },
    playerName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },

    documentType: {
      type: String,
      enum: ["birth_certificate", "passport", "school_id", "state_id", "medical_form", "other"],
      required: true,
    },
    documentIdentifier: { type: String },
    documentIdentifierHash: { type: String, required: true },

    verifiedAt: { type: Date, required: true },
    verifiedBy: { type: String, required: true },
    verifiedByUserId: { type: Schema.Types.ObjectId },
    verificationMethod: {
      type: String,
      enum: ["manual_review", "ai_ocr", "api_lookup", "self_declared"],
      default: "manual_review",
    },
    verificationHash: { type: String, required: true },

    status: {
      type: String,
      enum: ["verified", "expired", "revoked", "disputed"],
      default: "verified",
    },
    expiresAt: { type: Date },
    revokedAt: { type: Date },
    revokedReason: { type: String },

    usedBy: [{
      tenantSlug: { type: String, required: true },
      usedAt: { type: Date, default: Date.now },
      purpose: {
        type: String,
        enum: ["age_verification", "eligibility", "medical_clearance", "identity"],
      },
    }],
  },
  { timestamps: true },
);

VerificationRecordSchema.index({ playerId: 1 });
VerificationRecordSchema.index({ verificationHash: 1 }, { unique: true });
VerificationRecordSchema.index({ status: 1 });
