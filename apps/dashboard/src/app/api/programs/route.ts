export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

// GET /api/programs — list programs for this org
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conn = await connectTenantDB(slug, "organization");
  const { Program } = getOrgModels(conn);

  const programs = await Program.find().sort({ startDate: -1 }).lean();
  return NextResponse.json(programs);
}

// POST /api/programs — create a program
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const conn = await connectTenantDB(slug, "organization");
  const { Program } = getOrgModels(conn);

  // Auto-generate slug from name
  const programSlug = (body.name || "program")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const program = await Program.create({
    ...body,
    slug: programSlug,
    fee: Math.round((parseFloat(body.fee) || 0) * 100), // dollars to cents
    earlyBirdFee: body.earlyBirdFee ? Math.round(parseFloat(body.earlyBirdFee) * 100) : undefined,
    createdBy: new Types.ObjectId(userId),
  });

  return NextResponse.json(program, { status: 201 });
}
