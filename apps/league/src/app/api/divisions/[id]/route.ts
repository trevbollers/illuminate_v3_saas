export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// PATCH /api/divisions/[id] — update a league-wide division
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  const body = await req.json();
  const updated = await tenant.models.Division.findByIdAndUpdate(
    params.id,
    { $set: body },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Division not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/divisions/[id] — delete a league-wide division
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  await tenant.models.Division.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
