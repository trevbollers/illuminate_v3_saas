"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus,
  Users,
  LogIn,
} from "lucide-react";

interface InviteItem {
  _id: string;
  token: string;
  role: string;
  teamNames: string[];
}

interface InvitePageData {
  valid: boolean;
  existingUser: boolean;
  orgName: string;
  orgSlug: string;
  email?: string;
  inviteName?: string;
  invites: InviteItem[];
  error?: string;
}

const ROLE_LABELS: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  team_manager: "Team Manager",
  player: "Player",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  head_coach: "bg-green-100 text-green-800",
  assistant_coach: "bg-blue-100 text-blue-800",
  team_manager: "bg-purple-100 text-purple-800",
  player: "bg-slate-100 text-slate-800",
  viewer: "bg-slate-100 text-slate-600",
};

type PageState = "loading" | "invites" | "login" | "accepting" | "accepted" | "error";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<InvitePageData | null>(null);
  const [error, setError] = useState("");
  const [continueUrl, setContinueUrl] = useState<string>("/login");
  const [continueLabel, setContinueLabel] = useState<string>("Sign in to Dashboard");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.valid) {
          setError(d.error || "Invite not found or expired.");
          setState("error");
          return;
        }
        setData(d);
        if (d.inviteName) setName(d.inviteName);
        if (d.email) setEmail(d.email);
        // Pre-select all invites
        setSelected(new Set(d.invites.map((i: InviteItem) => i.token)));

        if (d.existingUser) {
          setState("login");
        } else {
          setState("invites");
        }
      })
      .catch(() => {
        setError("Failed to load invite.");
        setState("error");
      });
  }, [token]);

  function toggleInvite(invToken: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(invToken)) next.delete(invToken);
      else next.add(invToken);
      return next;
    });
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || selected.size === 0) return;
    setState("accepting");
    setError("");
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          acceptTokens: [...selected],
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Failed to accept.");
        setState("invites");
        return;
      }
      // Server tells us where to send them next — family dashboard for
      // parents/viewers, team dashboard for staff.
      if (d.continueUrl) setContinueUrl(d.continueUrl);
      if (d.continueLabel) setContinueLabel(d.continueLabel);
      setState("accepted");
    } catch {
      setError("Something went wrong.");
      setState("invites");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Loading */}
        {state === "loading" && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {/* Existing user — accept in place, then continueUrl guides them
            to sign in at the right app. No pre-auth loop. */}
        {state === "login" && data && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <LogIn className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Welcome back!
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              You have {data.invites.length} pending invite{data.invites.length !== 1 ? "s" : ""} from{" "}
              <strong className="text-slate-700">{data.orgName}</strong>.
              Review them below and accept.
            </p>

            <div className="mt-4 space-y-1.5 text-left">
              {data.invites.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-900">
                    {inv.teamNames.join(", ") || "Organization-wide"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[inv.role] || "bg-slate-100"}`}>
                    {ROLE_LABELS[inv.role] || inv.role}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={async () => {
                setState("accepting");
                setError("");
                try {
                  const res = await fetch(`/api/invite/${token}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: (data as any).existingUserName || data.inviteName || "User",
                      email: data.email,
                      acceptTokens: data.invites.map((i) => i.token),
                    }),
                  });
                  const d = await res.json();
                  if (!res.ok) {
                    setError(d.error || "Failed to accept.");
                    setState("login");
                    return;
                  }
                  if (d.continueUrl) setContinueUrl(d.continueUrl);
                  if (d.continueLabel) setContinueLabel(d.continueLabel);
                  setState("accepted");
                } catch {
                  setError("Something went wrong.");
                  setState("login");
                }
              }}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept invite{data.invites.length !== 1 ? "s" : ""}
            </button>
          </div>
        )}

        {/* New user — show all invites with checkboxes + signup form */}
        {state === "invites" && data && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-center mb-5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="mt-3 text-xl font-bold text-slate-900">
                Join {data.orgName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Select which teams to join
              </p>
            </div>

            {/* Invite list with checkboxes */}
            <div className="space-y-2 mb-5">
              {data.invites.map((inv) => {
                const checked = selected.has(inv.token);
                return (
                  <label
                    key={inv._id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      checked ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInvite(inv.token)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {inv.teamNames.join(", ") || "Organization-wide"}
                        </p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[inv.role] || "bg-slate-100"}`}>
                          {ROLE_LABELS[inv.role] || inv.role}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <form onSubmit={handleAccept} className="space-y-3">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || !email.trim() || selected.size === 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                Join {selected.size} Team{selected.size !== 1 ? "s" : ""}
              </button>
            </form>
          </div>
        )}

        {/* Accepting */}
        {state === "accepting" && (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-slate-500">Joining...</p>
          </div>
        )}

        {/* Accepted */}
        {state === "accepted" && data && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              You&apos;re in!
            </h1>
            <p className="mt-2 text-slate-600">
              You&apos;ve joined <strong>{data.orgName}</strong>.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Sign in with your email to view schedules, team info, and more.
            </p>
            <button
              onClick={() => {
                // continueUrl may be a full URL (cross-subdomain) or a path.
                if (continueUrl.startsWith("http")) {
                  window.location.href = continueUrl;
                } else {
                  router.push(continueUrl);
                }
              }}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              {continueLabel}
            </button>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Invite Error
            </h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
