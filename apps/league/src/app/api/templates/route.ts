export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getLeagueTenant } from "@/lib/tenant-db";
import { seedDefaultTemplates } from "@goparticipate/db";

// GET /api/templates — list all announcement templates (system + custom)
export async function GET(): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { models } = tenant;

  // Seed system defaults on first access
  await seedDefaultTemplates(models.MessageTemplate, "announcement");

  const templates = await models.MessageTemplate.find()
    .sort({ isSystem: -1, category: 1, name: 1 })
    .lean();

  return NextResponse.json({ templates });
}

// POST /api/templates — create a custom announcement template
export async function POST(req: NextRequest): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session, models } = tenant;
  const role = session.user.scopedRole;
  if (!role || !["league_owner", "league_admin"].includes(role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category, subject, body: templateBody, suggestedPriority } = body;

  if (!name?.trim() || !templateBody?.trim()) {
    return NextResponse.json({ error: "Name and body are required" }, { status: 400 });
  }

  const template = await models.MessageTemplate.create({
    name: name.trim(),
    description: description?.trim() || "",
    category: category || "custom",
    subject: subject?.trim() || "",
    body: templateBody.trim(),
    context: "announcement",
    isSystem: false,
    createdByUserId: session.user.id,
    createdByName: session.user.name || "Unknown",
    suggestedPriority: suggestedPriority || undefined,
  });

  return NextResponse.json({ template }, { status: 201 });
}
