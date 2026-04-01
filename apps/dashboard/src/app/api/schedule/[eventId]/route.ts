export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/schedule/[eventId] — get a single event
export async function GET(
  _req: Request,
  { params }: { params: { eventId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  const models = getOrgModels(conn);

  const event = await models.OrgEvent.findById(params.eventId).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Populate team name
  const team = await models.Team.findById((event as any).teamId)
    .select("name")
    .lean();

  return NextResponse.json({
    ...event,
    _id: (event as any)._id.toString(),
    teamId: (event as any).teamId.toString(),
    teamName: (team as any)?.name ?? "Unknown Team",
  });
}

// PATCH /api/schedule/[eventId] — update an event
export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();
  const updates: any = {};

  // Allow updating these fields
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.type !== undefined) {
    const validTypes = ["practice", "scrimmage", "meeting", "tryout", "game", "tournament", "other"];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    updates.type = body.type;
  }
  if (body.startTime !== undefined) {
    const d = new Date(body.startTime);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    updates.startTime = d;
  }
  if (body.endTime !== undefined) {
    const d = new Date(body.endTime);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
    updates.endTime = d;
  }
  if (body.location !== undefined) {
    updates.location = body.location?.name
      ? { name: body.location.name.trim(), address: body.location.address?.trim() || undefined }
      : undefined;
  }
  if (body.opponentName !== undefined) updates.opponentName = body.opponentName?.trim() || undefined;
  if (body.homeAway !== undefined) updates.homeAway = body.homeAway || undefined;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || undefined;
  if (body.isCancelled !== undefined) updates.isCancelled = body.isCancelled;
  if (body.result !== undefined) updates.result = body.result;
  if (body.recurrence !== undefined) {
    updates.recurrence = body.recurrence?.frequency
      ? {
          frequency: body.recurrence.frequency,
          daysOfWeek: body.recurrence.daysOfWeek || undefined,
          endDate: body.recurrence.endDate ? new Date(body.recurrence.endDate) : undefined,
        }
      : undefined;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  const models = getOrgModels(conn);

  const updated = await models.OrgEvent.findByIdAndUpdate(
    params.eventId,
    { $set: updates },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/schedule/[eventId] — soft cancel an event
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { eventId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  const models = getOrgModels(conn);

  await models.OrgEvent.findByIdAndUpdate(params.eventId, {
    $set: { isCancelled: true },
  });

  return NextResponse.json({ success: true });
}
