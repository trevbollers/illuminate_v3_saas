export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels } from "@goparticipate/db";

// PATCH /api/templates/[templateId] — update a custom template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse> {
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

  const { templateId } = await params;
  const body = await req.json();

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { MessageTemplate } = getOrgModels(conn);

  const template = await MessageTemplate.findById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.isSystem) {
    return NextResponse.json({ error: "Cannot edit system templates" }, { status: 403 });
  }

  const updates: Record<string, any> = {};
  if (body.name?.trim()) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.category) updates.category = body.category;
  if (body.subject !== undefined) updates.subject = body.subject.trim();
  if (body.body?.trim()) updates.body = body.body.trim();
  if (body.suggestedPriority !== undefined) updates.suggestedPriority = body.suggestedPriority || undefined;
  if (body.suggestedAckOptions !== undefined) {
    updates.suggestedAckOptions = body.suggestedAckOptions?.filter((o: string) => o.trim()) || [];
  }

  const updated = await MessageTemplate.findByIdAndUpdate(templateId, updates, { new: true }).lean();

  return NextResponse.json({ template: updated });
}

// DELETE /api/templates/[templateId] — delete a custom template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse> {
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

  const { templateId } = await params;

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const { MessageTemplate } = getOrgModels(conn);

  const template = await MessageTemplate.findById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.isSystem) {
    return NextResponse.json({ error: "Cannot delete system templates" }, { status: 403 });
  }

  await MessageTemplate.findByIdAndDelete(templateId);

  return NextResponse.json({ success: true });
}
