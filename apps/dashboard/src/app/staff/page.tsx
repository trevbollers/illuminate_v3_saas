"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Loader2,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
  Copy,
  Send,
} from "lucide-react";

interface TeamOption {
  _id: string;
  name: string;
}

interface PendingInvite {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  teamName?: string;
  teamNames?: string[];
  expiresAt: string;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Head Coach" },
  { value: "assistant_coach", label: "Assistant Coach" },
  { value: "team_manager", label: "Team Manager" },
];

const ROLE_LABELS: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  team_manager: "Team Manager",
};

export default function StaffPage() {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("assistant_coach");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/staff/invites").then((r) => r.json()),
    ])
      .then(([teamsData, invitesData]) => {
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setInvites(Array.isArray(invitesData) ? invitesData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) return;
    setSending(true);
    setError("");
    setSent(false);
    setInviteUrl("");

    try {
      const res = await fetch("/api/staff/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          teamIds: selectedTeams.length > 0 ? selectedTeams : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      setSent(true);
      if (data.inviteUrl) setInviteUrl(data.inviteUrl);

      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setSelectedTeams([]);

      // Refresh invites
      const invRes = await fetch("/api/staff/invites");
      const invData = await invRes.json();
      setInvites(Array.isArray(invData) ? invData : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Staff &amp; Coaches
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite coaches, assistant coaches, and team managers to your
          organization.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send Invite Form */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Send Invite
          </h2>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Coach name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@email.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-1234"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {teams.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Assign to Teams
                </label>
                <div className="flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      type="button"
                      onClick={() => toggleTeam(team._id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedTeams.includes(team._id)
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
                {selectedTeams.length === 0 && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    No teams selected = org-wide access
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {sent && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                <p className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Invite sent!
                </p>
                {inviteUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="flex-1 rounded border border-green-300 bg-white px-2 py-1 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                      }}
                      className="rounded p-1 text-green-600 hover:bg-green-100"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || (!email.trim() && !phone.trim())}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invite
            </button>
          </form>
        </div>

        {/* Pending Invites */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Invites ({invites.length})
          </h2>

          {invites.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="mx-auto h-10 w-10 text-slate-200" />
              <p className="mt-3 text-sm text-slate-500">
                No pending invites. Send one to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => (
                <div
                  key={inv._id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      {inv.name && (
                        <p className="font-medium text-slate-900 text-sm">
                          {inv.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {inv.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {inv.email}
                          </span>
                        )}
                        {inv.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {inv.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        inv.role === "head_coach"
                          ? "bg-green-100 text-green-700"
                          : inv.role === "assistant_coach"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {ROLE_LABELS[inv.role] || inv.role}
                    </span>
                  </div>
                  {(inv.teamName || inv.teamNames?.length) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {inv.teamName && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                          {inv.teamName}
                        </span>
                      )}
                      {inv.teamNames?.map((t, i) => (
                        <span
                          key={i}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400">
                    Expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
