export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id] — get a single event
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const event = await tenant.models.Event.findById(params.id).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Also fetch divisions for this event
  const divisions = await tenant.models.Division.find({
    eventId: new Types.ObjectId(params.id),
  })
    .sort({ sortOrder: 1 })
    .lean();

  // Fetch registration count
  const registrationCount = await tenant.models.Registration.countDocuments({
    eventId: new Types.ObjectId(params.id),
  });

  // Fetch game count
  const gameCount = await tenant.models.Game.countDocuments({
    eventId: new Types.ObjectId(params.id),
  });

  return NextResponse.json({
    ...event,
    divisions,
    registrationCount,
    gameCount,
  });
}

// PATCH /api/events/[id] — update an event
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();

  // Convert date strings to Date objects if present
  const dateFields = [
    "startDate",
    "endDate",
    "registrationOpen",
    "registrationClose",
    "rosterLockDate",
    "publishedAt",
  ];
  for (const field of dateFields) {
    if (body[field]) body[field] = new Date(body[field]);
  }

  // Handle nested pricing dates
  if (body.pricing?.earlyBirdDeadline) {
    body.pricing.earlyBirdDeadline = new Date(body.pricing.earlyBirdDeadline);
  }
  if (body.pricing?.lateFeeStartDate) {
    body.pricing.lateFeeStartDate = new Date(body.pricing.lateFeeStartDate);
  }

  // Handle days array dates
  if (body.days) {
    body.days = body.days.map((d: any) => ({
      ...d,
      date: new Date(d.date),
    }));
  }

  // If publishing, set publishedAt
  if (body.status === "published" || body.status === "registration_open") {
    body.publishedAt = body.publishedAt || new Date();
  }

  const event = await tenant.models.Event.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true, runValidators: true },
  ).lean();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

// DELETE /api/events/[id] — delete an event (only if draft)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const event = await tenant.models.Event.findById(params.id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status !== "draft" && event.status !== "canceled") {
    return NextResponse.json(
      { error: "Only draft or canceled events can be deleted" },
      { status: 400 },
    );
  }

  await tenant.models.Event.findByIdAndDelete(params.id);

  return NextResponse.json({ success: true });
}
