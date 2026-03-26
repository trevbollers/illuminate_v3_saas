import { NextResponse } from "next/server";
import { connectPlatformDB, Plan } from "@goparticipate/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/plans
 * Returns active plans from MongoDB for the public pricing page.
 * Sorted by sortOrder ascending (free plans first, then by price).
 */
export async function GET() {
  await connectPlatformDB();

  const plans = await Plan.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .select("planId name description features limits pricing isActive")
    .lean();

  return NextResponse.json(plans);
}
