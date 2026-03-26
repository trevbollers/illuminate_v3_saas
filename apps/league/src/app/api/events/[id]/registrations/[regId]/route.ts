export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id]/registrations/[regId] — get a single registration
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; regId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.regId)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  const registration = await tenant.models.Registration.findById(params.regId).lean();
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json(registration);
}

// PATCH /api/events/[id]/registrations/[regId] — update registration (approve/reject/etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; regId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.regId)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  const body = await req.json();
  const allowedFields = ["status", "paymentStatus", "amountPaid", "notes", "roster"];
  const update: any = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const registration = await tenant.models.Registration.findByIdAndUpdate(
    params.regId,
    { $set: update },
    { new: true },
  ).lean();

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json(registration);
}

// DELETE /api/events/[id]/registrations/[regId] — withdraw/delete a registration
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; regId: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.regId)) {
    return NextResponse.json({ error: "Invalid registration ID" }, { status: 400 });
  }

  await tenant.models.Registration.findByIdAndDelete(params.regId);

  return NextResponse.json({ ok: true });
}
