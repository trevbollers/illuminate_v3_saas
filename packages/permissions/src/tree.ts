/**
 * Permission tree type definitions.
 *
 * The tree is a code-only structure that defines what permissions exist,
 * how they're grouped, and what actions are available on each feature.
 * Storage and transport remain flat string arrays (e.g. "roster.view").
 */

export interface ActionDef {
  action: string;
  label: string;
  permissionKey: string;
  implies?: string[];
}

export interface PermissionNode {
  key: string;
  label: string;
  description?: string;
  actions: readonly ActionDef[];
  children?: readonly PermissionNode[];
}

export interface PermissionTree {
  scope: "platform" | "league" | "organization";
  label: string;
  nodes: readonly PermissionNode[];
}
