export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels, seedDefaultTemplates } from "@goparticipate/db";

// GET /api/templates — list all message templates (system + custom)
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { MessageTemplate } = getOrgModels(conn);

  // Seed system defaults on first access
  await seedDefaultTemplates(MessageTemplate, "message");

  const templates = await MessageTemplate.find()
    .sort({ isSystem: -1, category: 1, name: 1 })
    .lean();

  return NextResponse.json({ templates });
}

// POST /api/templates — create a custom template
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role");
  const userName = h.get("x-user-name");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only leaders can create templates
  if (!role || !["org_owner", "org_admin", "head_coach"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, subject, body: templateBody, suggestedPriority, suggestedAckOptions } = body;

  if (!name?.trim() || !templateBody?.trim()) {
    return NextResponse.json({ error: "Name and body are required" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { MessageTemplate } = getOrgModels(conn);

  const template = await MessageTemplate.create({
    name: name.trim(),
    description: description?.trim() || "",
    category: category || "custom",
    subject: subject?.trim() || "",
    body: templateBody.trim(),
    context: "message",
    isSystem: false,
    createdByUserId: userId,
    createdByName: userName || "Unknown",
    suggestedPriority: suggestedPriority || undefined,
    suggestedAckOptions: suggestedAckOptions?.filter((o: string) => o.trim()) || undefined,
  });

  return NextResponse.json({ template }, { status: 201 });
}
