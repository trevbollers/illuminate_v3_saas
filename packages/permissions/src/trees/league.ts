import type { PermissionTree } from "../tree";

/**
 * League tenant permission tree — permissions for league management.
 * Maps to the league roles (league_owner, league_admin, league_staff, league_viewer).
 */
export const LEAGUE_PERMISSION_TREE: PermissionTree = {
  scope: "league",
  label: "League Permissions",
  nodes: [
    {
      key: "events",
      label: "Events",
      description: "Tournament, season, showcase, and combine management",
      actions: [
        { action: "read", label: "View", permissionKey: "events.view" },
        { action: "create", label: "Create", permissionKey: "events.create", implies: ["events.view"] },
        { action: "edit", label: "Edit", permissionKey: "events.edit", implies: ["events.view"] },
        { action: "delete", label: "Delete", permissionKey: "events.delete", implies: ["events.view"] },
        { action: "publish", label: "Publish", permissionKey: "events.publish", implies: ["events.view"] },
      ],
    },
    {
      key: "registrations",
      label: "Registrations",
      description: "Team registration for events",
      actions: [
        { action: "read", label: "View", permissionKey: "registrations.view" },
        { action: "manage", label: "Manage", permissionKey: "registrations.manage", implies: ["registrations.view"] },
        { action: "refund", label: "Refund", permissionKey: "registrations.refund", implies: ["registrations.view"] },
      ],
    },
    {
      key: "verification",
      label: "Age Verification",
      description: "Player age verification and document review",
      actions: [
        { action: "read", label: "View", permissionKey: "verification.view" },
        { action: "review", label: "Review", permissionKey: "verification.review", implies: ["verification.view"] },
        { action: "override", label: "Override", permissionKey: "verification.override", implies: ["verification.view", "verification.review"] },
      ],
    },
    {
      key: "compliance",
      label: "Compliance",
      description: "Coach certifications and waiver management",
      actions: [
        { action: "read", label: "View", permissionKey: "compliance.view" },
        { action: "manage", label: "Manage", permissionKey: "compliance.manage", implies: ["compliance.view"] },
      ],
    },
    {
      key: "brackets",
      label: "Brackets & Scheduling",
      description: "Bracket generation, field assignments, and scheduling",
      actions: [
        { action: "read", label: "View", permissionKey: "brackets.view" },
        { action: "manage", label: "Manage", permissionKey: "brackets.manage", implies: ["brackets.view"] },
      ],
    },
    {
      key: "scoring",
      label: "Scoring",
      description: "Game scores and standings",
      actions: [
        { action: "read", label: "View", permissionKey: "scoring.view" },
        { action: "enter", label: "Enter", permissionKey: "scoring.enter", implies: ["scoring.view"] },
        { action: "edit", label: "Edit", permissionKey: "scoring.edit", implies: ["scoring.view", "scoring.enter"] },
      ],
    },
    {
      key: "financials",
      label: "Financials",
      description: "League revenue, registration fees, and payouts",
      actions: [
        { action: "read", label: "View", permissionKey: "financials.view" },
        { action: "manage", label: "Manage", permissionKey: "financials.manage", implies: ["financials.view"] },
      ],
    },
    {
      key: "staff",
      label: "League Staff",
      description: "League staff members and roles",
      actions: [
        { action: "read", label: "View", permissionKey: "staff.view" },
        { action: "invite", label: "Invite", permissionKey: "staff.invite", implies: ["staff.view"] },
        { action: "manage", label: "Manage", permissionKey: "staff.manage", implies: ["staff.view", "staff.invite"] },
      ],
    },
    {
      key: "settings",
      label: "Settings",
      description: "League settings, divisions, and billing",
      actions: [
        { action: "read", label: "View", permissionKey: "settings.view" },
        { action: "billing", label: "Billing", permissionKey: "settings.billing", implies: ["settings.view"] },
        { action: "manage", label: "Manage", permissionKey: "settings.manage", implies: ["settings.view"] },
      ],
    },
  ],
};
