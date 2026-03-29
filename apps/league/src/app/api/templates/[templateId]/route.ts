export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getLeagueTenant } from "@/lib/tenant-db";

// PATCH /api/templates/[templateId] — update a custom template
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session, models } = tenant;
  const role = session.user.scopedRole;
  if (!role || !["league_owner", "league_admin"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { templateId } = await params;
  const body = await req.json();

  const template = await models.MessageTemplate.findById(templateId);
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

  const updated = await models.MessageTemplate.findByIdAndUpdate(templateId, updates, { new: true }).lean();

  return NextResponse.json({ template: updated });
}

// DELETE /api/templates/[templateId] — delete a custom template
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session, models } = tenant;
  const role = session.user.scopedRole;
  if (!role || !["league_owner", "league_admin"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { templateId } = await params;

  const template = await models.MessageTemplate.findById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.isSystem) {
    return NextResponse.json({ error: "Cannot delete system templates" }, { status: 403 });
  }

  await models.MessageTemplate.findByIdAndDelete(templateId);

  return NextResponse.json({ success: true });
}
