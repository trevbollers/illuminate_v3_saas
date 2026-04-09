export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Types } from "mongoose";
import crypto from "crypto";
import {
  connectTenantDB,
  registerOrgModels,
  getOrgModels,
} from "@goparticipate/db";

/**
 * GET /api/staff/profile?userId=xxx — get coach profile (or own profile if no userId)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const currentUserId = h.get("x-user-id");
  if (!tenantSlug || !currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") || currentUserId;

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  let profile = await models.CoachProfile.findOne({
    userId: new Types.ObjectId(targetUserId),
    isActive: true,
  }).lean();

  if (!profile) {
    return NextResponse.json({ exists: false });
  }

  // Get team names
  const p = profile as any;
  const teams = p.teamIds?.length > 0
    ? await models.Team.find({ _id: { $in: p.teamIds } }).select("name sport").lean()
    : [];

  return NextResponse.json({
    exists: true,
    profile: { ...p, teams },
  });
}

/**
 * PUT /api/staff/profile — create or update own coach profile
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  const userRole = h.get("x-user-role");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const existing = await models.CoachProfile.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (existing) {
    // Update
    const allowed = ["name", "bio", "photoUrl", "email", "phone", "socials", "certifications", "yearsExperience"];
    const update: any = {};
    for (const field of allowed) {
      if (body[field] !== undefined) update[field] = body[field];
    }
    await models.CoachProfile.updateOne(
      { _id: existing._id },
      { $set: update },
    );
    const updated = await models.CoachProfile.findById(existing._id).lean();
    return NextResponse.json(updated);
  }

  // Create new profile
  const checkInCode = `COACH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

  const profile = await models.CoachProfile.create({
    userId: new Types.ObjectId(userId),
    name: body.name || "Coach",
    photoUrl: body.photoUrl,
    bio: body.bio || "",
    role: userRole || "head_coach",
    teamIds: body.teamIds?.map((id: string) => new Types.ObjectId(id)) || [],
    email: body.email,
    phone: body.phone,
    socials: body.socials || {},
    certifications: body.certifications || [],
    yearsExperience: body.yearsExperience,
    badges: [],
    checkInCode,
    isActive: true,
  });

  return NextResponse.json(profile.toObject());
}
