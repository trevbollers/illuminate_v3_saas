export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPublicLeagueTenant } from "@/lib/public-tenant";

// GET /api/public/events/[slug]/brackets — public bracket data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const tenant = await getPublicLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  const { slug } = await params;
  const { Event, Bracket, Division } = tenant.models;

  const event = await Event.findOne({
    slug,
    status: { $in: ["published", "registration_open", "registration_closed", "in_progress", "completed"] },
  }).select("_id name divisionIds").lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [brackets, divisions] = await Promise.all([
    // Show all brackets including draft (unfilled) so teams can see the structure
    Bracket.find({
      eventId: (event as any)._id,
    })
      .sort({ createdAt: 1 })
      .lean(),
    Division.find({ _id: { $in: (event as any).divisionIds } })
      .select("key label bracketTiers")
      .lean(),
  ]);

  return NextResponse.json({ event, brackets, divisions });
}
