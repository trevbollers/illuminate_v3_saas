export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels } from "@goparticipate/db";
import { processUploadedImage } from "@goparticipate/db/src/utils/image-processor";

/**
 * POST /api/family/players/[playerId]/photo — upload yearly verification photo
 *
 * FormData: file (image)
 * Auto-converts to webp. Marks as current photo for this season.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { playerId: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ error: "No family" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  try {
    const result = await processUploadedImage(file, `player-${params.playerId}`, {
      maxDimension: 800,
      quality: 85,
    });

    const conn = await connectFamilyDB(familyId);
    const { FamilyPlayer } = getFamilyModels(conn);

    const now = new Date();
    const year = now.getFullYear();
    const season = `${year}-${year + 1}`;

    // Unmark all existing photos as not current
    await FamilyPlayer.updateOne(
      { _id: new Types.ObjectId(params.playerId) },
      { $set: { "photos.$[].isCurrent": false } },
    );

    // Add new photo and set as current
    const updated = await FamilyPlayer.findByIdAndUpdate(
      params.playerId,
      {
        $push: {
          photos: {
            url: result.url,
            season,
            year,
            uploadedAt: now,
            isCurrent: true,
          },
        },
        $set: { currentPhotoUrl: result.url },
      },
      { new: true },
    ).lean();

    return NextResponse.json({
      url: result.url,
      season,
      year,
      player: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
