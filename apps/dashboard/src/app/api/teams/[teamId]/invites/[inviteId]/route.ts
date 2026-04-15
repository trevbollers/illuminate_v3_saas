export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import {
  connectTenantDB,
  registerOrgModels,
  getOrgModels,
} from "@goparticipate/db";

/**
 * DELETE /api/teams/[teamId]/invites/[inviteId] — revoke a pending invite.
 *
 * Marks status: "revoked" rather than hard-deleting so we keep an audit
 * trail of who was invited and when it was pulled back. The team page's
 * GET only shows status: "pending" so a revoked invite disappears from
 * the UI immediately.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string; inviteId: string }> },
): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userId = h.get("x-user-id");
  if (!tenantSlug || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, inviteId } = await params;
  if (!Types.ObjectId.isValid(teamId) || !Types.ObjectId.isValid(inviteId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  const teamObjectId = new Types.ObjectId(teamId);
  const result = await models.Invite.updateOne(
    {
      _id: new Types.ObjectId(inviteId),
      $or: [{ teamId: teamObjectId }, { teamIds: teamObjectId }],
      status: "pending",
    },
    {
      $set: {
        status: "revoked",
        revokedAt: new Date(),
        revokedBy: new Types.ObjectId(userId),
      },
    },
  );

  if (result.matchedCount === 0) {
    return NextResponse.json(
      { error: "Invite not found or already accepted/revoked" },
      { status: 404 },
    );
  }

  return NextResponse.json({ revoked: true });
}
