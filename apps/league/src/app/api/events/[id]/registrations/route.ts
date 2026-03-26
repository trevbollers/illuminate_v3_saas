export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getLeagueTenant } from "@/lib/tenant-db";

// GET /api/events/[id]/registrations — list registrations for an event
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const divisionId = searchParams.get("divisionId");

  const filter: any = { eventId: new Types.ObjectId(params.id) };
  if (status) filter.status = status;
  if (divisionId && Types.ObjectId.isValid(divisionId)) {
    filter.divisionId = new Types.ObjectId(divisionId);
  }

  const registrations = await tenant.models.Registration.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(registrations);
}

// POST /api/events/[id]/registrations — register a team for an event
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const tenant = await getLeagueTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.id)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const event = await tenant.models.Event.findById(params.id).lean();
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Only allow registration when event is in registration_open status
  if (event.status !== "registration_open") {
    return NextResponse.json(
      { error: "Registration is not open for this event" },
      { status: 400 },
    );
  }

  const body = await req.json();
  const { divisionId, orgTenantId, teamId, teamName, roster, registeredBy, notes } = body;

  if (!divisionId || !orgTenantId || !teamId || !teamName || !registeredBy) {
    return NextResponse.json(
      { error: "Missing required fields: divisionId, orgTenantId, teamId, teamName, registeredBy" },
      { status: 400 },
    );
  }

  if (!Types.ObjectId.isValid(divisionId)) {
    return NextResponse.json({ error: "Invalid division ID" }, { status: 400 });
  }

  // Check division exists for this event
  const division = await tenant.models.Division.findOne({
    _id: new Types.ObjectId(divisionId),
    eventId: new Types.ObjectId(params.id),
  }).lean();

  if (!division) {
    return NextResponse.json({ error: "Division not found for this event" }, { status: 404 });
  }

  // Check max teams limit
  if (division.maxTeams) {
    const currentCount = await tenant.models.Registration.countDocuments({
      eventId: new Types.ObjectId(params.id),
      divisionId: new Types.ObjectId(divisionId),
      status: { $nin: ["rejected", "withdrawn"] },
    });
    if (currentCount >= division.maxTeams) {
      return NextResponse.json(
        { error: "Division is full. Maximum teams reached." },
        { status: 400 },
      );
    }
  }

  // Check for duplicate registration (same team in same division)
  const existing = await tenant.models.Registration.findOne({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(divisionId),
    teamId: new Types.ObjectId(teamId),
    status: { $nin: ["rejected", "withdrawn"] },
  }).lean();

  if (existing) {
    return NextResponse.json(
      { error: "This team is already registered for this division" },
      { status: 409 },
    );
  }

  const registration = await tenant.models.Registration.create({
    eventId: new Types.ObjectId(params.id),
    divisionId: new Types.ObjectId(divisionId),
    orgTenantId: new Types.ObjectId(orgTenantId),
    teamId: new Types.ObjectId(teamId),
    teamName,
    roster: roster || [],
    status: "pending",
    paymentStatus: "unpaid",
    amountPaid: 0,
    registeredBy: new Types.ObjectId(registeredBy),
    notes: notes || "",
  });

  return NextResponse.json(registration, { status: 201 });
}
