import type { PermissionTree } from "../tree";

/**
 * Platform permission tree — permissions for Go Participate admin users.
 * All permissionKeys prefixed with "platform." to avoid collision.
 */
export const PLATFORM_PERMISSION_TREE: PermissionTree = {
  scope: "platform",
  label: "Platform Permissions",
  nodes: [
    {
      key: "platform.dashboard",
      label: "Dashboard",
      description: "Platform analytics and overview",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.dashboard.read" },
      ],
    },
    {
      key: "platform.tenants",
      label: "Tenants",
      description: "Manage league and organization tenants",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.tenants.read" },
        { action: "write", label: "Edit", permissionKey: "platform.tenants.write", implies: ["platform.tenants.read"] },
        { action: "delete", label: "Delete", permissionKey: "platform.tenants.delete", implies: ["platform.tenants.read"] },
      ],
      children: [
        {
          key: "platform.tenants.subscription",
          label: "Subscription",
          description: "Manage tenant plans and billing",
          actions: [
            { action: "read", label: "View", permissionKey: "platform.tenants.subscription.read", implies: ["platform.tenants.read"] },
            { action: "write", label: "Edit", permissionKey: "platform.tenants.subscription.write", implies: ["platform.tenants.subscription.read"] },
          ],
        },
        {
          key: "platform.tenants.members",
          label: "Members",
          description: "Manage tenant team members",
          actions: [
            { action: "read", label: "View", permissionKey: "platform.tenants.members.read", implies: ["platform.tenants.read"] },
            { action: "write", label: "Edit", permissionKey: "platform.tenants.members.write", implies: ["platform.tenants.members.read"] },
          ],
        },
      ],
    },
    {
      key: "platform.billing",
      label: "Billing",
      description: "Platform revenue and payment management",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.billing.read" },
        { action: "write", label: "Edit", permissionKey: "platform.billing.write", implies: ["platform.billing.read"] },
      ],
    },
    {
      key: "platform.plans",
      label: "Plans & Pricing",
      description: "Subscription plan management",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.plans.read" },
        { action: "write", label: "Edit", permissionKey: "platform.plans.write", implies: ["platform.plans.read"] },
        { action: "delete", label: "Delete", permissionKey: "platform.plans.delete", implies: ["platform.plans.read"] },
      ],
    },
    {
      key: "platform.features",
      label: "Feature Flags",
      description: "Feature flag and rollout management",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.features.read" },
        { action: "write", label: "Edit", permissionKey: "platform.features.write", implies: ["platform.features.read"] },
      ],
    },
    {
      key: "platform.verification",
      label: "Verification",
      description: "Global player verification oversight",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.verification.read" },
        { action: "write", label: "Edit", permissionKey: "platform.verification.write", implies: ["platform.verification.read"] },
      ],
    },
    {
      key: "platform.partners",
      label: "Partners",
      description: "Uniform partner management",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.partners.read" },
        { action: "write", label: "Edit", permissionKey: "platform.partners.write", implies: ["platform.partners.read"] },
      ],
    },
    {
      key: "platform.stripe",
      label: "Stripe Config",
      description: "Stripe integration and product sync",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.stripe.read" },
        { action: "write", label: "Edit", permissionKey: "platform.stripe.write", implies: ["platform.stripe.read"] },
      ],
    },
    {
      key: "platform.settings",
      label: "Settings",
      description: "Platform-wide configuration",
      actions: [
        { action: "read", label: "View", permissionKey: "platform.settings.read" },
        { action: "write", label: "Edit", permissionKey: "platform.settings.write", implies: ["platform.settings.read"] },
      ],
    },
  ],
};
