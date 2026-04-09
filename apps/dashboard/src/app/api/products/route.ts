export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// GET /api/products — list all products for this org
export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Product } = getOrgModels(conn);

  const activeOnly = new URL(req.url).searchParams.get("active") !== "false";
  const filter: Record<string, unknown> = {};
  if (activeOnly) filter.isActive = true;

  const products = await Product.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  return NextResponse.json({ products });
}

// POST /api/products — create a new product
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!role || !["org_owner", "org_admin", "head_coach"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, imageUrl, pricing, options, teamIds } = body;

  if (!name?.trim() || !category || !pricing?.amount) {
    return NextResponse.json(
      { error: "name, category, and pricing.amount are required" },
      { status: 400 },
    );
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { Product } = getOrgModels(conn);

  const product = await Product.create({
    name: name.trim(),
    slug,
    description: description?.trim() || "",
    category,
    imageUrl: imageUrl?.trim() || undefined,
    pricing: {
      amount: pricing.amount,
      type: pricing.type || "one_time",
      interval: pricing.interval || undefined,
      allowPartialPayment: pricing.allowPartialPayment || false,
      installmentCount: pricing.installmentCount || undefined,
    },
    options: options || [],
    teamIds: teamIds?.map((id: string) => new Types.ObjectId(id)) || [],
    isActive: true,
    sortOrder: 0,
    createdBy: new Types.ObjectId(userId),
  });

  return NextResponse.json({ product }, { status: 201 });
}
