"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  RotateCcw,
  Shield,
  Check,
  Minus,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface PermissionAction {
  action: string;
  label: string;
  permissionKey: string;
  implies?: string[];
}

interface PermissionNode {
  key: string;
  label: string;
  description: string;
  actions: PermissionAction[];
}

interface RoleInfo {
  key: string;
  label: string;
  level: number;
}

// ============================================================
// Page
// ============================================================

export default function RolePermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [permissionTree, setPermissionTree] = useState<PermissionNode[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [defaults, setDefaults] = useState<Record<string, string[]>>({});
  const [current, setCurrent] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch("/api/settings/roles")
      .then((r) => r.json())
      .then((data) => {
        setPermissionTree(data.permissionTree || []);
        setRoles(data.roles || []);
        setDefaults(data.defaults || {});
        setCurrent(data.current || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function isChecked(role: string, permKey: string): boolean {
    return (current[role] || []).includes(permKey);
  }

  function toggle(role: string, permKey: string) {
    setSaved(false);
    setCurrent((prev) => {
      const perms = [...(prev[role] || [])];
      const idx = perms.indexOf(permKey);
      if (idx >= 0) {
        // Unchecking — also remove permissions that imply this one
        perms.splice(idx, 1);
      } else {
        // Checking — also add implied permissions
        perms.push(permKey);
        const action = permissionTree
          .flatMap((n) => n.actions)
          .find((a) => a.permissionKey === permKey);
        if (action?.implies) {
          for (const imp of action.implies) {
            if (!perms.includes(imp)) perms.push(imp);
          }
        }
      }
      return { ...prev, [role]: perms };
    });
  }

  function toggleAllForArea(area: PermissionNode, role: string) {
    setSaved(false);
    const allKeys = area.actions.map((a) => a.permissionKey);
    const allChecked = allKeys.every((k) => (current[role] || []).includes(k));

    setCurrent((prev) => {
      const perms = [...(prev[role] || [])];
      if (allChecked) {
        // Uncheck all
        return { ...prev, [role]: perms.filter((p) => !allKeys.includes(p)) };
      } else {
        // Check all
        for (const k of allKeys) {
          if (!perms.includes(k)) perms.push(k);
        }
        return { ...prev, [role]: perms };
      }
    });
  }

  function resetToDefaults() {
    setSaved(false);
    setCurrent({ ...defaults });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolePermissions: current }),
      });
      if (res.ok) setSaved(true);
    } catch {}
    setSaving(false);
  }

  function isDefault(role: string): boolean {
    const cur = [...(current[role] || [])].sort();
    const def = [...(defaults[role] || [])].sort();
    return JSON.stringify(cur) === JSON.stringify(def);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Role Permissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customize what each role can do in your organization. Changes apply
            to all users with that role.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Permission Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 min-w-[200px]">
                Permission
              </th>
              {roles.map((role) => (
                <th
                  key={role.key}
                  className="px-3 py-3 text-center font-semibold text-slate-700 min-w-[110px]"
                >
                  <div>{role.label}</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Level {role.level}
                    {!isDefault(role.key) && (
                      <span className="ml-1 text-amber-600">modified</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionTree.map((area) => (
              <>
                {/* Area header row */}
                <tr key={area.key} className="border-t bg-slate-50/50">
                  <td className="sticky left-0 z-10 bg-slate-50/50 px-4 py-2">
                    <p className="font-semibold text-slate-900">{area.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {area.description}
                    </p>
                  </td>
                  {roles.map((role) => {
                    const allKeys = area.actions.map(
                      (a) => a.permissionKey,
                    );
                    const checkedCount = allKeys.filter((k) =>
                      (current[role.key] || []).includes(k),
                    ).length;
                    const allChecked = checkedCount === allKeys.length;
                    const someChecked = checkedCount > 0 && !allChecked;
                    return (
                      <td
                        key={role.key}
                        className="px-3 py-2 text-center"
                      >
                        <button
                          onClick={() => toggleAllForArea(area, role.key)}
                          className={`mx-auto flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            allChecked
                              ? "border-blue-600 bg-blue-600 text-white"
                              : someChecked
                              ? "border-blue-400 bg-blue-100 text-blue-600"
                              : "border-slate-300 bg-white hover:border-slate-400"
                          }`}
                        >
                          {allChecked ? (
                            <Check className="h-3 w-3" />
                          ) : someChecked ? (
                            <Minus className="h-3 w-3" />
                          ) : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>

                {/* Individual permission rows */}
                {area.actions.map((action) => (
                  <tr
                    key={action.permissionKey}
                    className="border-t border-slate-100 hover:bg-slate-50/30"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 pl-8">
                      <span className="text-slate-600">{action.label}</span>
                      <span className="ml-1.5 text-[10px] text-slate-300">
                        {action.permissionKey}
                      </span>
                    </td>
                    {roles.map((role) => (
                      <td key={role.key} className="px-3 py-2 text-center">
                        <button
                          onClick={() =>
                            toggle(role.key, action.permissionKey)
                          }
                          className={`mx-auto flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                            isChecked(role.key, action.permissionKey)
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white hover:border-slate-400"
                          }`}
                        >
                          {isChecked(role.key, action.permissionKey) && (
                            <Check className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded border border-blue-600 bg-blue-600 text-white">
            <Check className="h-2.5 w-2.5" />
          </span>
          Enabled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded border border-blue-400 bg-blue-100 text-blue-600">
            <Minus className="h-2.5 w-2.5" />
          </span>
          Partial (some enabled)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 rounded border border-slate-300 bg-white" />
          Disabled
        </span>
        <span className="text-slate-400">
          Owner &amp; Admin roles always have full access
        </span>
      </div>
    </div>
  );
}
