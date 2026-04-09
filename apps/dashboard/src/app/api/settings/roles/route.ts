export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectPlatformDB, Tenant } from "@goparticipate/db";
import {
  ORGANIZATION_PERMISSION_TREE,
  DEFAULT_ORG_ROLE_PERMISSIONS,
  ORG_ROLES,
} from "@goparticipate/permissions";

/**
 * GET /api/settings/roles — get the permission grid for this org
 *
 * Returns:
 * - permissionTree: the full org permission tree (areas + actions)
 * - roles: the editable roles (head_coach, assistant_coach, team_manager, viewer)
 * - defaults: the built-in default permissions per role
 * - current: the custom overrides stored on the tenant (or defaults if none)
 */
export async function GET(): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userRole = h.get("x-user-role");

  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only org_owner and org_admin can view role settings
  if (!userRole || !["org_owner", "org_admin"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug })
    .select("customRolePermissions")
    .lean();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Roles that can be customized (owners/admins are not editable)
  const editableRoles = [
    { key: "head_coach", label: ORG_ROLES.head_coach.label, level: ORG_ROLES.head_coach.level },
    { key: "assistant_coach", label: ORG_ROLES.assistant_coach.label, level: ORG_ROLES.assistant_coach.level },
    { key: "team_manager", label: ORG_ROLES.team_manager.label, level: ORG_ROLES.team_manager.level },
    { key: "viewer", label: ORG_ROLES.viewer.label, level: ORG_ROLES.viewer.level },
  ];

  // Build current permissions (custom overrides or defaults)
  const customPerms = (tenant as any).customRolePermissions || {};
  const current: Record<string, string[]> = {};
  for (const role of editableRoles) {
    current[role.key] = customPerms[role.key] ||
      [...(DEFAULT_ORG_ROLE_PERMISSIONS as any)[role.key]];
  }

  return NextResponse.json({
    permissionTree: ORGANIZATION_PERMISSION_TREE.nodes,
    roles: editableRoles,
    defaults: {
      head_coach: [...(DEFAULT_ORG_ROLE_PERMISSIONS as any).head_coach],
      assistant_coach: [...(DEFAULT_ORG_ROLE_PERMISSIONS as any).assistant_coach],
      team_manager: [...(DEFAULT_ORG_ROLE_PERMISSIONS as any).team_manager],
      viewer: [...(DEFAULT_ORG_ROLE_PERMISSIONS as any).viewer],
    },
    current,
  });
}

/**
 * PUT /api/settings/roles — save custom role permissions
 *
 * Body: { rolePermissions: { head_coach: [...], assistant_coach: [...], ... } }
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userRole = h.get("x-user-role");

  if (!tenantSlug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!userRole || !["org_owner", "org_admin"].includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { rolePermissions } = body;

  if (!rolePermissions || typeof rolePermissions !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate: only allow known roles
  const allowedRoles = ["head_coach", "assistant_coach", "team_manager", "viewer"];
  const sanitized: Record<string, string[]> = {};
  for (const role of allowedRoles) {
    if (Array.isArray(rolePermissions[role])) {
      sanitized[role] = rolePermissions[role];
    }
  }

  await connectPlatformDB();
  const result = await Tenant.findOneAndUpdate(
    { slug: tenantSlug },
    { $set: { customRolePermissions: sanitized } },
    { new: true },
  );

  if (!result) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({ saved: true, customRolePermissions: sanitized });
}
