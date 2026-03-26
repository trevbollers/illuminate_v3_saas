import type { PermissionTree, PermissionNode, ActionDef } from "./tree";

export function flattenTree(tree: PermissionTree): Set<string> {
  const keys = new Set<string>();
  function walk(nodes: readonly PermissionNode[]) {
    for (const node of nodes) {
      for (const action of node.actions) {
        keys.add(action.permissionKey);
      }
      if (node.children) walk(node.children);
    }
  }
  walk(tree.nodes);
  return keys;
}

export function flattenTreeToArray(tree: PermissionTree): string[] {
  return Array.from(flattenTree(tree));
}

export function buildImpliesMap(tree: PermissionTree): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  function walk(nodes: readonly PermissionNode[]) {
    for (const node of nodes) {
      for (const action of node.actions) {
        if (action.implies && action.implies.length > 0) {
          map.set(action.permissionKey, new Set(action.implies));
        }
      }
      if (node.children) walk(node.children);
    }
  }
  walk(tree.nodes);
  return map;
}

export function expandImplied(grantedKeys: string[], tree: PermissionTree): Set<string> {
  const impliesMap = buildImpliesMap(tree);
  const expanded = new Set(grantedKeys);
  const queue = [...grantedKeys];
  while (queue.length > 0) {
    const key = queue.pop()!;
    const implied = impliesMap.get(key);
    if (implied) {
      for (const imp of implied) {
        if (!expanded.has(imp)) {
          expanded.add(imp);
          queue.push(imp);
        }
      }
    }
  }
  return expanded;
}

export function getNodeByKey(tree: PermissionTree, key: string): PermissionNode | null {
  function walk(nodes: readonly PermissionNode[]): PermissionNode | null {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(tree.nodes);
}

export function getAllActions(tree: PermissionTree): ActionDef[] {
  const actions: ActionDef[] = [];
  function walk(nodes: readonly PermissionNode[]) {
    for (const node of nodes) {
      actions.push(...node.actions);
      if (node.children) walk(node.children);
    }
  }
  walk(tree.nodes);
  return actions;
}

export function hasPermissionInTree(
  grantedKeys: string[],
  permissionKey: string,
  tree: PermissionTree,
): boolean {
  const expanded = expandImplied(grantedKeys, tree);
  return expanded.has(permissionKey);
}
