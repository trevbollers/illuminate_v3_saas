"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronDown,
  Shield,
  Trophy,
  Users,
  Heart,
  Loader2,
  Check,
} from "lucide-react";

interface Context {
  key: string;
  type: "platform" | "org" | "league" | "family";
  label: string;
  role: string;
  url: string;
  tenantId?: string;
  tenantSlug?: string;
}

const TYPE_ICON = {
  platform: Shield,
  league: Trophy,
  org: Users,
  family: Heart,
} as const;

const TYPE_COLOR = {
  platform: "text-slate-600",
  league: "text-blue-600",
  org: "text-emerald-600",
  family: "text-amber-600",
} as const;

/**
 * RoleSwitcher — dropdown for users who have more than one "persona" in the
 * app. A person can be a platform admin + coach at Eastern Iowa + parent at
 * the same time; the switcher lets them jump between those contexts without
 * logging out.
 *
 * Renders nothing when the user has 0 or 1 contexts (single-role users see
 * the regular nav button in that case).
 */
export function RoleSwitcher() {
  const { data: session, update } = useSession();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load contexts once we have a session
  useEffect(() => {
    if (!session?.user) return;
    setLoading(true);
    fetch("/api/me/contexts")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.contexts)) {
          setContexts(d.contexts);
          setCurrent(d.current ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [session?.user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!session?.user || loading || contexts.length <= 1) return null;

  const currentCtx = contexts.find((c) => c.key === current) ?? contexts[0]!;

  async function handleSwitch(ctx: Context) {
    setSwitching(ctx.key);
    try {
      // Org/league contexts need an active tenant update in the session so
      // the target app's middleware sees the right tenantSlug on arrival.
      if (ctx.tenantId) {
        await update({ tenantId: ctx.tenantId });
      }
      window.location.href = ctx.url;
    } catch {
      setSwitching(null);
    }
  }

  const CurrentIcon = TYPE_ICON[currentCtx.type];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <CurrentIcon className={`h-4 w-4 ${TYPE_COLOR[currentCtx.type]}`} />
        <span className="hidden sm:inline max-w-[140px] truncate">
          {currentCtx.label}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[260px] rounded-lg border border-slate-200 bg-white shadow-lg p-1">
          <div className="px-3 pt-2 pb-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Acting as
            </p>
          </div>
          {contexts.map((c) => {
            const Icon = TYPE_ICON[c.type];
            const isCurrent = c.key === current;
            const isSwitching = switching === c.key;
            return (
              <button
                key={c.key}
                onClick={() => handleSwitch(c)}
                disabled={switching !== null}
                className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-left transition-colors ${
                  isCurrent ? "bg-blue-50" : "hover:bg-slate-50"
                } disabled:opacity-60`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${TYPE_COLOR[c.type]}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {c.label}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{c.role}</div>
                </div>
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : isCurrent ? (
                  <Check className="h-4 w-4 text-blue-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
