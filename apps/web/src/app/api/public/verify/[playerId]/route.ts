export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectPlatformDB, User, Player, connectFamilyDB, getFamilyModels } from "@goparticipate/db";

/**
 * GET /api/public/verify/[playerId]?tenantSlug=xxx&purpose=age_verification
 *
 * Called by leagues/orgs to check a player's verification status.
 * Returns verification info WITHOUT documents — just the status and record.
 *
 * If verified: returns verification record details (verifiedAt, verifiedBy, DOB confirmed)
 * If not verified: returns { verified: false } so the org knows to request verification
 *
 * This does NOT require family auth — it's a platform-level check.
 * But it only returns non-PII data (verified yes/no, age eligibility).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { playerId: string } },
): Promise<NextResponse> {
  const { playerId } = params;
  if (!Types.ObjectId.isValid(playerId)) {
    return NextResponse.json({ error: "Invalid playerId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const tenantSlug = url.searchParams.get("tenantSlug");
  const purpose = url.searchParams.get("purpose") || "age_verification";
  const ageGroupMax = url.searchParams.get("maxAge") ? parseInt(url.searchParams.get("maxAge")!) : null;

  await connectPlatformDB();

  // Find the player to get their familyId (via guardians)
  const player = await Player.findById(playerId).select("guardianUserIds firstName lastName dateOfBirth").lean();
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const p = player as any;

  // Find a guardian with a familyId
  let familyId: string | null = null;
  if (p.guardianUserIds?.length > 0) {
    const guardian = await User.findOne({
      _id: { $in: p.guardianUserIds },
      familyId: { $exists: true },
    }).select("familyId").lean();
    familyId = (guardian as any)?.familyId?.toString() || null;
  }

  if (!familyId) {
    // No family DB — player is unverified
    return NextResponse.json({
      verified: false,
      playerName: `${p.firstName} ${p.lastName}`,
      reason: "No family profile — parent has not set up verification",
    });
  }

  // Check family DB for verification records
  const conn = await connectFamilyDB(familyId);
  const { VerificationRecord, DocumentGrant } = getFamilyModels(conn);

  const records = await VerificationRecord.find({
    playerId: new Types.ObjectId(playerId),
    status: "verified",
  }).sort({ verifiedAt: -1 }).lean();

  if (records.length === 0) {
    return NextResponse.json({
      verified: false,
      playerName: `${p.firstName} ${p.lastName}`,
      reason: "No verification records found",
    });
  }

  const record = records[0] as any;

  // Check age eligibility if maxAge provided
  let ageEligible: boolean | null = null;
  let playerAge: number | null = null;
  if (record.dateOfBirth) {
    playerAge = Math.floor((Date.now() - new Date(record.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (ageGroupMax) {
      ageEligible = playerAge <= ageGroupMax;
    }
  }

  // Log this usage if tenantSlug provided
  if (tenantSlug) {
    await VerificationRecord.findByIdAndUpdate(record._id, {
      $push: {
        usedBy: {
          tenantSlug,
          usedAt: new Date(),
          purpose,
        },
      },
    });
  }

  return NextResponse.json({
    verified: true,
    playerName: `${p.firstName} ${p.lastName}`,
    dateOfBirth: record.dateOfBirth,
    age: playerAge,
    ageEligible,
    documentType: record.documentType,
    verifiedAt: record.verifiedAt,
    verifiedBy: record.verifiedBy,
    verificationMethod: record.verificationMethod,
    // Do NOT return: documentIdentifier, documentIdentifierHash, raw docs
  });
}
