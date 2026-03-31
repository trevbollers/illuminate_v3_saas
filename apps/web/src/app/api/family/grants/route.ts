export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";

/**
 * GET /api/family/grants — list all active/recent grants
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ grants: [] });

  const conn = await connectFamilyDB(familyId);
  const { DocumentGrant, FamilyPlayer } = getFamilyModels(conn);

  const [grants, players] = await Promise.all([
    DocumentGrant.find().sort({ grantedAt: -1 }).lean(),
    FamilyPlayer.find({ isActive: true }).select("_id firstName lastName").lean(),
  ]);

  const playerMap = new Map((players as any[]).map((p) => [p._id.toString(), `${p.firstName} ${p.lastName}`]));

  const enriched = (grants as any[]).map((g) => ({
    ...g,
    _id: g._id.toString(),
    playerName: playerMap.get(g.playerId.toString()) || "Unknown",
  }));

  return NextResponse.json({ grants: enriched });
}

/**
 * POST /api/family/grants — approve or create a grant
 *
 * Body: {
 *   playerId: string,
 *   grantedTo: string (tenant slug),
 *   grantedToName: string,
 *   purpose: string,
 *   accessType: "view_verified_info" | "view_document" | "download_document",
 *   documentId?: string,
 *   expiresInHours?: number (default 48)
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const body = await req.json();
  const { playerId, grantedTo, grantedToName, purpose, accessType, documentId, expiresInHours } = body;

  if (!playerId || !grantedTo || !purpose) {
    return NextResponse.json({ error: "playerId, grantedTo, and purpose required" }, { status: 400 });
  }

  const conn = await connectFamilyDB(familyId);
  const { DocumentGrant } = getFamilyModels(conn);

  const hours = expiresInHours || 48;
  const grant = await DocumentGrant.create({
    documentId: documentId ? new Types.ObjectId(documentId) : undefined,
    playerId: new Types.ObjectId(playerId),
    grantedTo,
    grantedToName: grantedToName || grantedTo,
    grantedBy: new Types.ObjectId(session.user.id),
    purpose,
    accessType: accessType || "view_verified_info",
    grantedAt: new Date(),
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    status: "active",
    accessLog: [],
  });

  return NextResponse.json(grant, { status: 201 });
}

/**
 * PATCH /api/family/grants — revoke a grant
 * Body: { grantId: string }
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const { grantId } = await req.json();
  if (!grantId) return NextResponse.json({ error: "grantId required" }, { status: 400 });

  const conn = await connectFamilyDB(familyId);
  const { DocumentGrant } = getFamilyModels(conn);

  const updated = await DocumentGrant.findByIdAndUpdate(
    grantId,
    { $set: { status: "revoked", revokedAt: new Date(), revokedBy: new Types.ObjectId(session.user.id) } },
    { new: true },
  ).lean();

  if (!updated) return NextResponse.json({ error: "Grant not found" }, { status: 404 });
  return NextResponse.json(updated);
}
