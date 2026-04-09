export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

export async function GET(
  _req: Request,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!Types.ObjectId.isValid(params.teamId)) return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const team = await getOrgModels(conn).Team.findById(params.teamId).lean();
  if (!team || !(team as any).isActive) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!Types.ObjectId.isValid(params.teamId)) return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });

  const body = await req.json();
  const updates: Record<string, any> = {};
  for (const field of ["name", "sport", "divisionKey", "season"]) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const team = await getOrgModels(conn).Team.findByIdAndUpdate(params.teamId, { $set: updates }, { new: true }).lean();
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { teamId: string } },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!Types.ObjectId.isValid(params.teamId)) return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  await getOrgModels(conn).Team.findByIdAndUpdate(params.teamId, { $set: { isActive: false } });
  return NextResponse.json({ success: true });
}
