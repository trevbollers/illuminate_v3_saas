export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";
import { processUploadedImage } from "@goparticipate/db/src/utils/image-processor";

/**
 * POST /api/upload — upload an image for a team or org entity.
 *
 * FormData:
 *   file: File
 *   target: "team" | "org" | "player"
 *   targetId: string (team ID, etc.)
 *
 * Auto-converts to webp. SVGs pass through.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const target = formData.get("target") as string | null;
  const targetId = formData.get("targetId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!target || !targetId || !Types.ObjectId.isValid(targetId)) {
    return NextResponse.json({ error: "Missing target or targetId" }, { status: 400 });
  }

  try {
    const result = await processUploadedImage(file, `${target}-${targetId}`, {
      maxDimension: target === "team" ? 512 : 1200,
      quality: 85,
    });

    // Update the appropriate model
    const conn = await connectTenantDB(tenantSlug, "organization");
    const models = getOrgModels(conn);

    if (target === "team") {
      await models.Team.findByIdAndUpdate(targetId, {
        $set: { logoUrl: result.url },
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
