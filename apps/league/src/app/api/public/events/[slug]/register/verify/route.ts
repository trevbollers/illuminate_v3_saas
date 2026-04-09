export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  connectPlatformDB,
  connectTenantDB,
  User,
  Tenant,
  MagicCode,
  registerOrgModels,
  getOrgModels,
} from "@goparticipate/db";
import { verifyCode } from "@goparticipate/auth";

/**
 * POST /api/public/events/[slug]/register/verify
 *
 * Verify a magic code for the returning-team registration flow.
 * Returns the user's org info and existing teams so they can pick
 * which ones to register for the event.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { identifier, code } = await req.json();

  if (!identifier || !code) {
    return NextResponse.json(
      { error: "Identifier and code are required" },
      { status: 400 },
    );
  }

  const cleaned = identifier.trim().toLowerCase();
  await connectPlatformDB();

  // Find the latest unused magic code for this identifier
  const magicCode = await MagicCode.findOne({
    identifier: cleaned,
    purpose: "login",
    usedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!magicCode) {
    return NextResponse.json(
      { error: "Invalid or expired code. Please request a new one." },
      { status: 401 },
    );
  }

  // Verify the code hash
  const isValid = await verifyCode(code, (magicCode as any).hashedCode);
  if (!isValid) {
    // Increment attempts
    await MagicCode.updateOne(
      { _id: (magicCode as any)._id },
      { $inc: { attempts: 1 } },
    );

    if (((magicCode as any).attempts || 0) + 1 >= 5) {
      await MagicCode.updateOne(
        { _id: (magicCode as any)._id },
        { $set: { usedAt: new Date() } },
      );
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: "Invalid code. Please try again." },
      { status: 401 },
    );
  }

  // Mark code as used
  await MagicCode.updateOne(
    { _id: (magicCode as any)._id },
    { $set: { usedAt: new Date() } },
  );

  // Find user
  const isEmail = cleaned.includes("@");
  const userFilter = isEmail ? { email: cleaned } : { phone: cleaned };
  const user = await User.findOne(userFilter).lean();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "No account found with this identifier. Register as a new team instead.",
      },
      { status: 404 },
    );
  }

  const userObj = user as any;

  // Find their org membership
  const orgMembership = userObj.memberships?.find(
    (m: any) => m.tenantType === "organization" && m.isActive,
  );

  if (!orgMembership) {
    return NextResponse.json(
      {
        error:
          "No team organization found on your account. Register as a new team instead.",
      },
      { status: 404 },
    );
  }

  // Get tenant info
  const tenant = await Tenant.findById(orgMembership.tenantId)
    .select("name slug")
    .lean();
  if (!tenant) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }
  const tenantObj = tenant as any;

  // Load teams from org DB
  let teams: any[] = [];
  try {
    const orgConn = await connectTenantDB(tenantObj.slug, "organization");
    registerOrgModels(orgConn);
    const orgModels = getOrgModels(orgConn);
    teams = await orgModels.Team.find({ isActive: true })
      .select("name sport divisionKey")
      .lean();
  } catch (err) {
    console.error("[verify] failed to load org teams:", err);
  }

  return NextResponse.json({
    user: {
      userId: userObj._id.toString(),
      name: userObj.name,
      email: userObj.email,
      orgName: tenantObj.name,
      orgTenantId: orgMembership.tenantId.toString(),
    },
    teams: teams.map((t: any) => ({
      _id: t._id.toString(),
      name: t.name,
      sport: t.sport,
      divisionKey: t.divisionKey,
    })),
  });
}
