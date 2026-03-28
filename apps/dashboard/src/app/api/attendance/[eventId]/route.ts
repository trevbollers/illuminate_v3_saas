export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@goparticipate/auth/edge";
import { connectTenantDB, getOrgModels } from "@goparticipate/db";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

// PATCH /api/attendance/[eventId] — bulk update attendance statuses
export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
  }

  const body = await req.json();
  const { updates } = body;

  // updates: [{ playerId: string, status?: string, rsvp?: string, notes?: string }]
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "updates array is required" },
      { status: 400 }
    );
  }

  const conn = await connectTenantDB(session.user.tenantSlug, "organization");
  const { Attendance } = getOrgModels(conn);

  const validStatuses = ["present", "absent", "late", "excused"];
  const validRsvps = ["yes", "no", "maybe", "no_response"];
  const markedBy = new Types.ObjectId(session.user.id);

  const ops = updates.map(
    (u: { playerId: string; status?: string; rsvp?: string; notes?: string }) => {
      const set: Record<string, unknown> = { markedBy };

      if (u.status && validStatuses.includes(u.status)) {
        set.status = u.status;
        if (u.status === "present" || u.status === "late") {
          set.checkedInAt = new Date();
        }
      }
      if (u.rsvp && validRsvps.includes(u.rsvp)) {
        set.rsvp = u.rsvp;
      }
      if (u.notes !== undefined) {
        set.notes = u.notes;
      }

      return {
        updateOne: {
          filter: {
            orgEventId: new Types.ObjectId(eventId),
            playerId: new Types.ObjectId(u.playerId),
          },
          update: { $set: set },
        },
      };
    }
  );

  await Attendance.bulkWrite(ops);

  // Return updated records
  const records = await Attendance.find({
    orgEventId: new Types.ObjectId(eventId),
  })
    .sort({ playerName: 1 })
    .lean();

  return NextResponse.json({ attendance: records });
}
