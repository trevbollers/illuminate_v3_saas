import type { PermissionTree } from "../tree";

/**
 * Organization tenant permission tree — permissions for org/team management.
 * Maps to org roles (org_owner, org_admin, head_coach, assistant_coach, team_manager, viewer).
 */
export const ORGANIZATION_PERMISSION_TREE: PermissionTree = {
  scope: "organization",
  label: "Organization Permissions",
  nodes: [
    {
      key: "roster",
      label: "Roster",
      description: "Player roster management",
      actions: [
        { action: "read", label: "View", permissionKey: "roster.view" },
        { action: "add", label: "Add", permissionKey: "roster.add", implies: ["roster.view"] },
        { action: "edit", label: "Edit", permissionKey: "roster.edit", implies: ["roster.view"] },
        { action: "remove", label: "Remove", permissionKey: "roster.remove", implies: ["roster.view"] },
      ],
    },
    {
      key: "schedule",
      label: "Scheduling",
      description: "Practices, games, meetings, and events",
      actions: [
        { action: "read", label: "View", permissionKey: "schedule.view" },
        { action: "create", label: "Create", permissionKey: "schedule.create", implies: ["schedule.view"] },
        { action: "edit", label: "Edit", permissionKey: "schedule.edit", implies: ["schedule.view"] },
        { action: "delete", label: "Delete", permissionKey: "schedule.delete", implies: ["schedule.view"] },
      ],
    },
    {
      key: "comms",
      label: "Communication",
      description: "Team announcements, chat, and notifications",
      actions: [
        { action: "read", label: "View", permissionKey: "comms.view" },
        { action: "send", label: "Send", permissionKey: "comms.send", implies: ["comms.view"] },
        { action: "manage", label: "Manage", permissionKey: "comms.manage", implies: ["comms.view", "comms.send"] },
      ],
    },
    {
      key: "attendance",
      label: "Attendance",
      description: "Event check-in and attendance tracking",
      actions: [
        { action: "read", label: "View", permissionKey: "attendance.view" },
        { action: "mark", label: "Mark", permissionKey: "attendance.mark", implies: ["attendance.view"] },
      ],
    },
    {
      key: "registration",
      label: "Event Registration",
      description: "Register teams for league events",
      actions: [
        { action: "read", label: "View", permissionKey: "registration.view" },
        { action: "submit", label: "Submit", permissionKey: "registration.submit", implies: ["registration.view"] },
        { action: "manage", label: "Manage", permissionKey: "registration.manage", implies: ["registration.view", "registration.submit"] },
      ],
    },
    {
      key: "payments",
      label: "Payments",
      description: "Dues collection and payment tracking",
      actions: [
        { action: "read", label: "View", permissionKey: "payments.view" },
        { action: "collect", label: "Collect", permissionKey: "payments.collect", implies: ["payments.view"] },
        { action: "manage", label: "Manage", permissionKey: "payments.manage", implies: ["payments.view", "payments.collect"] },
      ],
    },
    {
      key: "stats",
      label: "Stats",
      description: "Game statistics and player performance",
      actions: [
        { action: "read", label: "View", permissionKey: "stats.view" },
        { action: "enter", label: "Enter", permissionKey: "stats.enter", implies: ["stats.view"] },
        { action: "edit", label: "Edit", permissionKey: "stats.edit", implies: ["stats.view", "stats.enter"] },
      ],
    },
    {
      key: "development",
      label: "Player Development",
      description: "Skill assessments and progress tracking",
      actions: [
        { action: "read", label: "View", permissionKey: "development.view" },
        { action: "create", label: "Create", permissionKey: "development.create", implies: ["development.view"] },
        { action: "manage", label: "Manage", permissionKey: "development.manage", implies: ["development.view", "development.create"] },
      ],
    },
    {
      key: "uniforms",
      label: "Uniforms",
      description: "Uniform ordering and size collection",
      actions: [
        { action: "read", label: "View", permissionKey: "uniforms.view" },
        { action: "initiate", label: "Initiate", permissionKey: "uniforms.initiate", implies: ["uniforms.view"] },
        { action: "manage", label: "Manage", permissionKey: "uniforms.manage", implies: ["uniforms.view", "uniforms.initiate"] },
      ],
    },
    {
      key: "teams",
      label: "Team Management",
      description: "Create and manage teams within the organization",
      actions: [
        { action: "read", label: "View", permissionKey: "teams.view" },
        { action: "create", label: "Create", permissionKey: "teams.create", implies: ["teams.view"] },
        { action: "manage", label: "Manage", permissionKey: "teams.manage", implies: ["teams.view", "teams.create"] },
      ],
    },
    {
      key: "org_staff",
      label: "Staff",
      description: "Coaches, managers, and staff members",
      actions: [
        { action: "read", label: "View", permissionKey: "org_staff.view" },
        { action: "invite", label: "Invite", permissionKey: "org_staff.invite", implies: ["org_staff.view"] },
        { action: "manage", label: "Manage", permissionKey: "org_staff.manage", implies: ["org_staff.view", "org_staff.invite"] },
      ],
    },
    {
      key: "org_settings",
      label: "Settings",
      description: "Organization settings and billing",
      actions: [
        { action: "read", label: "View", permissionKey: "org_settings.view" },
        { action: "billing", label: "Billing", permissionKey: "org_settings.billing", implies: ["org_settings.view"] },
        { action: "manage", label: "Manage", permissionKey: "org_settings.manage", implies: ["org_settings.view"] },
      ],
    },
    {
      key: "org_financials",
      label: "Financials",
      description: "Organization-wide financial data",
      actions: [
        { action: "read", label: "View", permissionKey: "org_financials.view" },
        { action: "manage", label: "Manage", permissionKey: "org_financials.manage", implies: ["org_financials.view"] },
      ],
    },
    {
      key: "storefront",
      label: "Storefront",
      description: "Organization public page configuration",
      actions: [
        { action: "read", label: "View", permissionKey: "storefront.view" },
        { action: "manage", label: "Manage", permissionKey: "storefront.manage", implies: ["storefront.view"] },
      ],
    },
  ],
};
