export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectPlatformDB } from "@goparticipate/db";
import { Plan } from "@goparticipate/db";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectPlatformDB();
  const plans = await Plan.find().sort({ sortOrder: 1 }).lean();
  return NextResponse.json(plans);
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectPlatformDB();

  const body = await req.json();
  const { planId, pricing, limits, features, addOns, name, description, isActive } = body;

  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const updateFields: Record<string, unknown> = {};

  if (pricing) updateFields.pricing = pricing;
  if (limits) updateFields.limits = limits;
  if (features) updateFields.features = features;
  if (addOns) updateFields.addOns = addOns;
  if (name) updateFields.name = name;
  if (description) updateFields.description = description;
  if (typeof isActive === "boolean") updateFields.isActive = isActive;

  const plan = await Plan.findOneAndUpdate(
    { planId },
    { $set: updateFields },
    { new: true, lean: true }
  );

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}
