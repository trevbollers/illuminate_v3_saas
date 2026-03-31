import { Schema, Document, Types } from "mongoose";

export interface IGrantAccessLog {
  accessedAt: Date;
  accessedBy: Types.ObjectId;
  action: "viewed" | "downloaded" | "verified";
}

export interface IDocumentGrant extends Document {
  documentId?: Types.ObjectId;        // Specific document (or null for verification-only)
  playerId: Types.ObjectId;
  grantedTo: string;                  // Tenant slug
  grantedToName: string;              // Tenant name (display)
  grantedBy: Types.ObjectId;          // Guardian who approved
  purpose: "age_verification" | "eligibility" | "medical_clearance" | "identity" | "photo_verification";
  accessType: "view_verified_info" | "view_document" | "download_document";

  // Time-limited
  grantedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;

  status: "active" | "expired" | "revoked" | "used";

  // Access log
  accessLog: IGrantAccessLog[];

  createdAt: Date;
  updatedAt: Date;
}

export const DocumentGrantSchema = new Schema<IDocumentGrant>(
  {
    documentId: { type: Schema.Types.ObjectId },
    playerId: { type: Schema.Types.ObjectId, required: true },
    grantedTo: { type: String, required: true },
    grantedToName: { type: String },
    grantedBy: { type: Schema.Types.ObjectId, required: true },
    purpose: {
      type: String,
      enum: ["age_verification", "eligibility", "medical_clearance", "identity", "photo_verification"],
      required: true,
    },
    accessType: {
      type: String,
      enum: ["view_verified_info", "view_document", "download_document"],
      default: "view_verified_info",
    },

    grantedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId },

    status: {
      type: String,
      enum: ["active", "expired", "revoked", "used"],
      default: "active",
    },

    accessLog: [{
      accessedAt: { type: Date, default: Date.now },
      accessedBy: { type: Schema.Types.ObjectId },
      action: { type: String, enum: ["viewed", "downloaded", "verified"] },
    }],
  },
  { timestamps: true },
);

DocumentGrantSchema.index({ playerId: 1 });
DocumentGrantSchema.index({ grantedTo: 1 });
DocumentGrantSchema.index({ status: 1, expiresAt: 1 });
