export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels, seedDefaultTemplates } from "@goparticipate/db";

// GET /api/templates — list all message templates (system + custom)
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
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
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only leaders can create templates
  const role = session.user.scopedRole;
  if (!role || !["org_owner", "org_admin", "head_coach"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, subject, body: templateBody, suggestedPriority, suggestedAckOptions } = body;

  if (!name?.trim() || !templateBody?.trim()) {
    return NextResponse.json({ error: "Name and body are required" }, { status: 400 });
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { MessageTemplate } = getOrgModels(conn);

  const template = await MessageTemplate.create({
    name: name.trim(),
    description: description?.trim() || "",
    category: category || "custom",
    subject: subject?.trim() || "",
    body: templateBody.trim(),
    context: "message",
    isSystem: false,
    createdByUserId: session.user.id,
    createdByName: session.user.name || "Unknown",
    suggestedPriority: suggestedPriority || undefined,
    suggestedAckOptions: suggestedAckOptions?.filter((o: string) => o.trim()) || undefined,
  });

  return NextResponse.json({ template }, { status: 201 });
}
