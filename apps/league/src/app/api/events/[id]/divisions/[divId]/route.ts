export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// PATCH /api/events/[id]/divisions/[divId] — update an event division
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; divId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.divId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  const body = await req.json();
  const updated = await tenant.models.Division.findByIdAndUpdate(
    params.divId,
    { $set: body },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/events/[id]/divisions/[divId] — remove a division from an event
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; divId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.divId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  await tenant.models.Division.findByIdAndDelete(params.divId);

  // Remove from event's divisionIds
  await tenant.models.Event.findByIdAndUpdate(params.id, {
    $pull: { divisionIds: new Types.ObjectId(params.divId) },
  });

  return NextResponse.json({ ok: true });
}
