import type { LeagueRole, OrgRole } from "./roles";
import { flattenTreeToArray } from "./tree-utils";
import { LEAGUE_PERMISSION_TREE } from "./trees/league";
import { ORGANIZATION_PERMISSION_TREE } from "./trees/organization";

// ─── League permission constants ────────────────────────────────────────────

export const EVENTS_VIEW = "events.view" as const;
export const EVENTS_CREATE = "events.create" as const;
export const EVENTS_EDIT = "events.edit" as const;
export const EVENTS_DELETE = "events.delete" as const;
export const EVENTS_PUBLISH = "events.publish" as const;
export const REGISTRATIONS_VIEW = "registrations.view" as const;
export const REGISTRATIONS_MANAGE = "registrations.manage" as const;
export const REGISTRATIONS_REFUND = "registrations.refund" as const;
export const VERIFICATION_VIEW = "verification.view" as const;
export const VERIFICATION_REVIEW = "verification.review" as const;
export const VERIFICATION_OVERRIDE = "verification.override" as const;
export const COMPLIANCE_VIEW = "compliance.view" as const;
export const COMPLIANCE_MANAGE = "compliance.manage" as const;
export const BRACKETS_VIEW = "brackets.view" as const;
export const BRACKETS_MANAGE = "brackets.manage" as const;
export const SCORING_VIEW = "scoring.view" as const;
export const SCORING_ENTER = "scoring.enter" as const;
export const SCORING_EDIT = "scoring.edit" as const;
export const L_FINANCIALS_VIEW = "financials.view" as const;
export const L_FINANCIALS_MANAGE = "financials.manage" as const;
export const L_STAFF_VIEW = "staff.view" as const;
export const L_STAFF_INVITE = "staff.invite" as const;
export const L_STAFF_MANAGE = "staff.manage" as const;
export const L_SETTINGS_VIEW = "settings.view" as const;
export const L_SETTINGS_BILLING = "settings.billing" as const;
export const L_SETTINGS_MANAGE = "settings.manage" as const;

export const ALL_LEAGUE_PERMISSIONS = flattenTreeToArray(LEAGUE_PERMISSION_TREE);
export type LeaguePermission = string;

// ─── Organization permission constants ──────────────────────────────────────

export const ROSTER_VIEW = "roster.view" as const;
export const ROSTER_ADD = "roster.add" as const;
export const ROSTER_EDIT = "roster.edit" as const;
export const ROSTER_REMOVE = "roster.remove" as const;
export const SCHEDULE_VIEW = "schedule.view" as const;
export const SCHEDULE_CREATE = "schedule.create" as const;
export const SCHEDULE_EDIT = "schedule.edit" as const;
export const SCHEDULE_DELETE = "schedule.delete" as const;
export const COMMS_VIEW = "comms.view" as const;
export const COMMS_SEND = "comms.send" as const;
export const COMMS_MANAGE = "comms.manage" as const;
export const ATTENDANCE_VIEW = "attendance.view" as const;
export const ATTENDANCE_MARK = "attendance.mark" as const;
export const REGISTRATION_VIEW = "registration.view" as const;
export const REGISTRATION_SUBMIT = "registration.submit" as const;
export const REGISTRATION_MANAGE = "registration.manage" as const;
export const PAYMENTS_VIEW = "payments.view" as const;
export const PAYMENTS_COLLECT = "payments.collect" as const;
export const PAYMENTS_MANAGE = "payments.manage" as const;
export const STATS_VIEW = "stats.view" as const;
export const STATS_ENTER = "stats.enter" as const;
export const STATS_EDIT = "stats.edit" as const;
export const DEVELOPMENT_VIEW = "development.view" as const;
export const DEVELOPMENT_CREATE = "development.create" as const;
export const DEVELOPMENT_MANAGE = "development.manage" as const;
export const UNIFORMS_VIEW = "uniforms.view" as const;
export const UNIFORMS_INITIATE = "uniforms.initiate" as const;
export const UNIFORMS_MANAGE = "uniforms.manage" as const;
export const TEAMS_VIEW = "teams.view" as const;
export const TEAMS_CREATE = "teams.create" as const;
export const TEAMS_MANAGE = "teams.manage" as const;
export const ORG_STAFF_VIEW = "org_staff.view" as const;
export const ORG_STAFF_INVITE = "org_staff.invite" as const;
export const ORG_STAFF_MANAGE = "org_staff.manage" as const;
export const ORG_SETTINGS_VIEW = "org_settings.view" as const;
export const ORG_SETTINGS_BILLING = "org_settings.billing" as const;
export const ORG_SETTINGS_MANAGE = "org_settings.manage" as const;
export const ORG_FINANCIALS_VIEW = "org_financials.view" as const;
export const ORG_FINANCIALS_MANAGE = "org_financials.manage" as const;
export const STOREFRONT_VIEW = "storefront.view" as const;
export const STOREFRONT_MANAGE = "storefront.manage" as const;

export const ALL_ORG_PERMISSIONS = flattenTreeToArray(ORGANIZATION_PERMISSION_TREE);
export type OrgPermission = string;

// ─── Default permissions per league role ────────────────────────────────────

export const DEFAULT_LEAGUE_ROLE_PERMISSIONS: Record<LeagueRole, readonly string[]> = {
  league_owner: ALL_LEAGUE_PERMISSIONS,

  league_admin: [
    EVENTS_VIEW, EVENTS_CREATE, EVENTS_EDIT, EVENTS_DELETE, EVENTS_PUBLISH,
    REGISTRATIONS_VIEW, REGISTRATIONS_MANAGE, REGISTRATIONS_REFUND,
    VERIFICATION_VIEW, VERIFICATION_REVIEW, VERIFICATION_OVERRIDE,
    COMPLIANCE_VIEW, COMPLIANCE_MANAGE,
    BRACKETS_VIEW, BRACKETS_MANAGE,
    SCORING_VIEW, SCORING_ENTER, SCORING_EDIT,
    L_FINANCIALS_VIEW,
    L_STAFF_VIEW, L_STAFF_INVITE,
    L_SETTINGS_VIEW,
  ],

  league_staff: [
    EVENTS_VIEW,
    REGISTRATIONS_VIEW,
    VERIFICATION_VIEW,
    COMPLIANCE_VIEW,
    BRACKETS_VIEW,
    SCORING_VIEW, SCORING_ENTER,
    L_STAFF_VIEW,
    L_SETTINGS_VIEW,
  ],

  league_viewer: [
    EVENTS_VIEW,
    REGISTRATIONS_VIEW,
    VERIFICATION_VIEW,
    COMPLIANCE_VIEW,
    BRACKETS_VIEW,
    SCORING_VIEW,
    L_STAFF_VIEW,
    L_SETTINGS_VIEW,
  ],
};

// ─── Default permissions per org role ───────────────────────────────────────

export const DEFAULT_ORG_ROLE_PERMISSIONS: Record<OrgRole, readonly string[]> = {
  org_owner: ALL_ORG_PERMISSIONS,

  org_admin: [
    ROSTER_VIEW, ROSTER_ADD, ROSTER_EDIT, ROSTER_REMOVE,
    SCHEDULE_VIEW, SCHEDULE_CREATE, SCHEDULE_EDIT, SCHEDULE_DELETE,
    COMMS_VIEW, COMMS_SEND, COMMS_MANAGE,
    ATTENDANCE_VIEW, ATTENDANCE_MARK,
    REGISTRATION_VIEW, REGISTRATION_SUBMIT, REGISTRATION_MANAGE,
    PAYMENTS_VIEW, PAYMENTS_COLLECT, PAYMENTS_MANAGE,
    STATS_VIEW, STATS_ENTER, STATS_EDIT,
    DEVELOPMENT_VIEW, DEVELOPMENT_CREATE, DEVELOPMENT_MANAGE,
    UNIFORMS_VIEW, UNIFORMS_INITIATE, UNIFORMS_MANAGE,
    TEAMS_VIEW, TEAMS_CREATE, TEAMS_MANAGE,
    ORG_STAFF_VIEW, ORG_STAFF_INVITE, ORG_STAFF_MANAGE,
    ORG_SETTINGS_VIEW,
    ORG_FINANCIALS_VIEW, ORG_FINANCIALS_MANAGE,
    STOREFRONT_VIEW, STOREFRONT_MANAGE,
  ],

  head_coach: [
    ROSTER_VIEW, ROSTER_ADD, ROSTER_EDIT, ROSTER_REMOVE,
    SCHEDULE_VIEW, SCHEDULE_CREATE, SCHEDULE_EDIT, SCHEDULE_DELETE,
    COMMS_VIEW, COMMS_SEND, COMMS_MANAGE,
    ATTENDANCE_VIEW, ATTENDANCE_MARK,
    REGISTRATION_VIEW, REGISTRATION_SUBMIT,
    PAYMENTS_VIEW,
    STATS_VIEW, STATS_ENTER, STATS_EDIT,
    DEVELOPMENT_VIEW, DEVELOPMENT_CREATE, DEVELOPMENT_MANAGE,
    UNIFORMS_VIEW, UNIFORMS_INITIATE,
    TEAMS_VIEW,
    ORG_STAFF_VIEW, ORG_STAFF_INVITE,
    ORG_SETTINGS_VIEW,
    STOREFRONT_VIEW,
  ],

  assistant_coach: [
    ROSTER_VIEW,
    SCHEDULE_VIEW, SCHEDULE_CREATE, SCHEDULE_EDIT,
    COMMS_VIEW, COMMS_SEND,
    ATTENDANCE_VIEW, ATTENDANCE_MARK,
    REGISTRATION_VIEW,
    STATS_VIEW, STATS_ENTER,
    DEVELOPMENT_VIEW,
    UNIFORMS_VIEW,
    TEAMS_VIEW,
    ORG_STAFF_VIEW,
  ],

  team_manager: [
    ROSTER_VIEW,
    SCHEDULE_VIEW, SCHEDULE_CREATE, SCHEDULE_EDIT,
    COMMS_VIEW, COMMS_SEND,
    ATTENDANCE_VIEW, ATTENDANCE_MARK,
    REGISTRATION_VIEW,
    PAYMENTS_VIEW, PAYMENTS_COLLECT,
    UNIFORMS_VIEW, UNIFORMS_INITIATE,
    TEAMS_VIEW,
    ORG_STAFF_VIEW,
  ],

  viewer: [
    ROSTER_VIEW,
    SCHEDULE_VIEW,
    COMMS_VIEW,
    ATTENDANCE_VIEW,
    REGISTRATION_VIEW,
    STATS_VIEW,
    UNIFORMS_VIEW,
    TEAMS_VIEW,
    ORG_STAFF_VIEW,
    ORG_SETTINGS_VIEW,
    ORG_FINANCIALS_VIEW,
    STOREFRONT_VIEW,
  ],
};
