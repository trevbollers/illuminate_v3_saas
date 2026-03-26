export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import crypto from "crypto";
import { getLeagueTenant } from "@/lib/tenant-db";

/**
 * QR Code Format:
 * {
 *   v: 1,                          // version
 *   pid: "playerId",               // platform player ID
 *   rid: "registrationId",         // league registration ID
 *   eid: "eventId",                // event ID
 *   ts: "leagueSlug",              // tenant slug (for cross-tenant verification)
 *   cs: "hmac_checksum_first_12"   // HMAC-SHA256 checksum (prevents forging)
 * }
 *
 * The checksum is: HMAC-SHA256(pid|rid|eid|ts, secret).slice(0, 12)
 * Secret is derived from NEXTAUTH_SECRET + tenant slug to be tenant-specific.
 */

function generateChecksum(playerId: string, registrationId: string, eventId: string, tenantSlug: string): string {
  const secret = `${process.env.NEXTAUTH_SECRET || "gp-dev-secret"}-${tenantSlug}`;
  const payload = `${playerId}|${registrationId}|${eventId}|${tenantSlug}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 12);
}

export { generateChecksum };

// GET /api/events/[id]/qrcodes — generate QR code data for all rostered players in an event
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
  const registrationId = searchParams.get("registrationId");
  const divisionId = searchParams.get("divisionId");

  // Build filter
  const filter: any = {
    eventId: new Types.ObjectId(params.id),
    status: "approved",
  };
  if (registrationId && Types.ObjectId.isValid(registrationId)) {
    filter._id = new Types.ObjectId(registrationId);
  }
  if (divisionId && Types.ObjectId.isValid(divisionId)) {
    filter.divisionId = new Types.ObjectId(divisionId);
  }

  const registrations = await tenant.models.Registration.find(filter).lean();

  const qrCodes: {
    playerId: string;
    playerName: string;
    teamName: string;
    jerseyNumber?: number;
    divisionId: string;
    registrationId: string;
    qrData: string; // JSON string to encode in QR
  }[] = [];

  for (const reg of registrations) {
    const r = reg as any;
    for (const player of r.roster || []) {
      const pid = player.playerId.toString();
      const rid = r._id.toString();
      const eid = params.id;
      const cs = generateChecksum(pid, rid, eid, tenant.tenantSlug);

      const qrPayload = JSON.stringify({
        v: 1,
        pid,
        rid,
        eid,
        ts: tenant.tenantSlug,
        cs,
      });

      qrCodes.push({
        playerId: pid,
        playerName: player.playerName,
        teamName: r.teamName,
        jerseyNumber: player.jerseyNumber,
        divisionId: r.divisionId.toString(),
        registrationId: rid,
        qrData: qrPayload,
      });
    }
  }

  return NextResponse.json({
    eventId: params.id,
    totalPlayers: qrCodes.length,
    qrCodes,
  });
}
