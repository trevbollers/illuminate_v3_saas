export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";
import crypto from "crypto";

/**
 * GET /api/family/verification — list all verification records for all players
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ records: [], grants: [] });

  const conn = await connectFamilyDB(familyId);
  const models = getFamilyModels(conn);

  const [records, grants, players] = await Promise.all([
    models.VerificationRecord.find().sort({ verifiedAt: -1 }).lean(),
    models.DocumentGrant.find({ status: { $in: ["active", "used"] } }).sort({ grantedAt: -1 }).lean(),
    models.FamilyPlayer.find({ isActive: true }).select("_id firstName lastName").lean(),
  ]);

  // Build player name map
  const playerMap = new Map((players as any[]).map((p) => [p._id.toString(), `${p.firstName} ${p.lastName}`]));

  const enrichedRecords = (records as any[]).map((r) => ({
    ...r,
    _id: r._id.toString(),
    playerName: playerMap.get(r.playerId.toString()) || r.playerName,
  }));

  return NextResponse.json({ records: enrichedRecords, grants });
}

/**
 * POST /api/family/verification — create a verification record (after document review)
 *
 * This is called by the platform when a league/org verifies a document.
 * Can also be used for self-declaration.
 *
 * Body: {
 *   playerId, documentType, documentIdentifier?,
 *   verifiedBy (tenantSlug), verificationMethod
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const body = await req.json();
  const { playerId, documentType, documentIdentifier, verifiedBy, verificationMethod } = body;

  if (!playerId || !documentType || !verifiedBy) {
    return NextResponse.json({ error: "playerId, documentType, and verifiedBy required" }, { status: 400 });
  }

  const conn = await connectFamilyDB(familyId);
  const models = getFamilyModels(conn);

  const player = await models.FamilyPlayer.findById(playerId).lean();
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const p = player as any;
  const playerName = `${p.firstName} ${p.lastName}`;

  // Create verification hash: SHA-256(name + DOB + docId)
  const hashInput = `${playerName}|${p.dateOfBirth.toISOString()}|${documentIdentifier || "none"}`;
  const verificationHash = crypto.createHash("sha256").update(hashInput).digest("hex");

  // Check if this exact verification already exists
  const existing = await models.VerificationRecord.findOne({ verificationHash }).lean();
  if (existing) {
    return NextResponse.json({ error: "Verification already exists", record: existing }, { status: 409 });
  }

  const docIdHash = documentIdentifier
    ? crypto.createHash("sha256").update(documentIdentifier).digest("hex")
    : crypto.createHash("sha256").update(`${playerName}|${p.dateOfBirth.toISOString()}`).digest("hex");

  const record = await models.VerificationRecord.create({
    playerId: new Types.ObjectId(playerId),
    playerName,
    dateOfBirth: p.dateOfBirth,
    documentType,
    documentIdentifier: documentIdentifier || undefined,
    documentIdentifierHash: docIdHash,
    verifiedAt: new Date(),
    verifiedBy,
    verifiedByUserId: new Types.ObjectId(session.user.id),
    verificationMethod: verificationMethod || "self_declared",
    verificationHash,
    status: "verified",
    usedBy: [{
      tenantSlug: verifiedBy,
      usedAt: new Date(),
      purpose: "age_verification",
    }],
  });

  // Update player verification status
  await models.FamilyPlayer.findByIdAndUpdate(playerId, {
    $set: { verificationStatus: "verified" },
  });

  return NextResponse.json(record, { status: 201 });
}
