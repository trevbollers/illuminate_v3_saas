export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * GET /api/family/documents — list all documents in the family vault
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ documents: [] });

  const conn = await connectFamilyDB(familyId);
  const { FamilyDocument, FamilyPlayer } = getFamilyModels(conn);

  const [docs, players] = await Promise.all([
    FamilyDocument.find({ deletedAt: { $exists: false } }).sort({ uploadedAt: -1 }).lean(),
    FamilyPlayer.find({ isActive: true }).select("_id firstName lastName").lean(),
  ]);

  const playerMap = new Map((players as any[]).map((p) => [p._id.toString(), `${p.firstName} ${p.lastName}`]));

  const enriched = (docs as any[]).map((d) => ({
    ...d,
    _id: d._id.toString(),
    playerName: playerMap.get(d.playerId.toString()) || "Unknown",
  }));

  return NextResponse.json({ documents: enriched });
}

/**
 * POST /api/family/documents — upload a document to the family vault
 *
 * FormData: file, playerId, documentType, description?
 *
 * The file is encrypted with AES-256-GCM before storage.
 * In dev: stored to disk. In production: S3/equivalent.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const playerId = formData.get("playerId") as string;
  const documentType = formData.get("documentType") as string;
  const description = formData.get("description") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!playerId || !documentType) {
    return NextResponse.json({ error: "playerId and documentType required" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
  }

  const conn = await connectFamilyDB(familyId);
  const { FamilyDocument } = getFamilyModels(conn);

  // Encrypt the file
  const plainBuffer = Buffer.from(await file.arrayBuffer());
  const encryptionKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store: iv (12) + authTag (16) + encrypted data
  const encryptedBlob = Buffer.concat([iv, authTag, encrypted]);

  // Save encrypted file to disk (dev) or S3 (prod)
  const filename = `vault-${familyId}-${Date.now()}.enc`;
  const vaultDir = path.join(process.cwd(), "data", "vault");
  await mkdir(vaultDir, { recursive: true });
  await writeFile(path.join(vaultDir, filename), encryptedBlob);

  // Store the encryption key ID — in production this goes to a KMS.
  // For dev, we store the key hex in the document record (NOT production-safe).
  const keyId = encryptionKey.toString("hex");

  const doc = await FamilyDocument.create({
    playerId: new Types.ObjectId(playerId),
    documentType,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    encryptedUrl: `vault/${filename}`,
    encryptionMethod: "aes-256-gcm",
    encryptionKeyId: keyId,
    uploadedAt: new Date(),
    uploadedBy: new Types.ObjectId(session.user.id),
    description: description || undefined,
    retentionPolicy: "keep",
  });

  return NextResponse.json({
    _id: doc._id.toString(),
    fileName: file.name,
    documentType,
    sizeBytes: file.size,
    uploadedAt: doc.uploadedAt,
  }, { status: 201 });
}
