export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

/**
 * GET /api/programs/checkin?code=PRG-XXXXXXXX — look up a registration by check-in code
 * POST /api/programs/checkin — mark a registration as checked in
 *   Body: { code: string }
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code parameter required" }, { status: 400 });

  const conn = await connectTenantDB(slug, "organization");
  const { ProgramRegistration } = getOrgModels(conn);

  const reg = await ProgramRegistration.findOne({ checkInCode: code.toUpperCase() }).lean();
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const r = reg as any;
  return NextResponse.json({
    registration: {
      _id: r._id.toString(),
      playerName: r.playerName,
      ageGroup: r.ageGroup,
      programName: r.programName,
      programType: r.programType,
      parentName: r.parentName,
      parentEmail: r.parentEmail,
      paymentStatus: r.paymentStatus,
      checkInCode: r.checkInCode,
      checkedIn: r.checkedIn,
      checkedInAt: r.checkedInAt,
      fee: r.fee,
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!slug || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const conn = await connectTenantDB(slug, "organization");
  const { ProgramRegistration } = getOrgModels(conn);

  const reg = await ProgramRegistration.findOne({ checkInCode: code.toUpperCase() });
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  if (reg.checkedIn) {
    return NextResponse.json({
      error: "Already checked in",
      checkedInAt: reg.checkedInAt,
      playerName: reg.playerName,
    }, { status: 409 });
  }

  if (reg.paymentStatus !== "paid" && reg.paymentStatus !== "waived") {
    return NextResponse.json({
      error: "Payment not confirmed",
      paymentStatus: reg.paymentStatus,
      playerName: reg.playerName,
    }, { status: 402 });
  }

  reg.checkedIn = true;
  reg.checkedInAt = new Date();
  reg.checkedInBy = new Types.ObjectId(userId);
  await reg.save();

  return NextResponse.json({
    success: true,
    playerName: reg.playerName,
    programName: reg.programName,
    ageGroup: reg.ageGroup,
    checkedInAt: reg.checkedInAt,
  });
}
