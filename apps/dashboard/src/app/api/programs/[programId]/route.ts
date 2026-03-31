export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/programs/[programId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { programId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await connectTenantDB(slug, "organization");
  const { Program } = getOrgModels(conn);

  const program = await Program.findById(params.programId).lean();
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(program);
}

// PATCH /api/programs/[programId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { programId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Convert fee from dollars to cents if provided
  if (body.fee !== undefined) body.fee = Math.round(parseFloat(body.fee) * 100);
  if (body.earlyBirdFee !== undefined) body.earlyBirdFee = Math.round(parseFloat(body.earlyBirdFee) * 100);

  const conn = await connectTenantDB(slug, "organization");
  const { Program } = getOrgModels(conn);

  const updated = await Program.findByIdAndUpdate(
    params.programId,
    { $set: body },
    { new: true },
  ).lean();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/programs/[programId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { programId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await connectTenantDB(slug, "organization");
  const { Program } = getOrgModels(conn);

  await Program.findByIdAndDelete(params.programId);
  return NextResponse.json({ ok: true });
}
