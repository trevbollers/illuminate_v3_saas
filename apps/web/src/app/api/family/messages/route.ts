export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@goparticipate/auth/edge";
import { connectPlatformDB, User, connectFamilyDB, getFamilyModels, connectTenantDB, getOrgModels } from "@goparticipate/db";

/**
 * GET /api/family/messages — aggregate unread/recent messages across all connected orgs
 */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectPlatformDB();
  const user = await User.findById(session.user.id).select("familyId").lean();
  const familyId = (user as any)?.familyId?.toString();
  if (!familyId) return NextResponse.json({ messages: [] });

  const conn = await connectFamilyDB(familyId);
  const { FamilyProfile } = getFamilyModels(conn);

  const profile = await FamilyProfile.findOne().lean();
  if (!profile) return NextResponse.json({ messages: [] });

  const orgSlugs = (profile as any).orgConnections
    ?.filter((c: any) => c.status === "active")
    .map((c: any) => c.tenantSlug) || [];

  const allMessages: any[] = [];

  for (const slug of orgSlugs) {
    try {
      const orgConn = await connectTenantDB(slug, "organization");
      const orgModels = getOrgModels(orgConn);

      // Get recent messages (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const messages = await orgModels.Message.find({
        createdAt: { $gte: weekAgo },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("subject body channel authorName createdAt teamId requiresAcknowledgement")
        .lean();

      const orgName = (profile as any).orgConnections
        ?.find((c: any) => c.tenantSlug === slug)?.tenantName || slug;

      for (const m of messages as any[]) {
        allMessages.push({
          ...m,
          _id: m._id.toString(),
          orgSlug: slug,
          orgName,
        });
      }
    } catch (err) {
      console.error(`[family:messages] Error loading ${slug}:`, err);
    }
  }

  allMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ messages: allMessages.slice(0, 30) });
}
