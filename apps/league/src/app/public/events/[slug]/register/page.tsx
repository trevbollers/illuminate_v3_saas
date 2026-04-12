"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  Loader2,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  Plus,
  Trash2,
  ArrowLeft,
  UserCheck,
  UserPlus,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface EventSummary {
  _id: string;
  name: string;
  slug: string;
  type: string;
  sport: string;
  startDate: string;
  endDate: string;
  locations: { name: string; city?: string; state?: string }[];
  status: string;
  pricing?: {
    amount: number;
    earlyBirdAmount?: number;
    earlyBirdDeadline?: string;
    lateFeeAmount?: number;
    lateFeeStartDate?: string;
    multiTeamDiscounts?: {
      minTeams: number;
      discountPercent?: number;
      discountAmountPerTeam?: number;
    }[];
  };
  settings?: {
    maxRosterSize?: number;
    minRosterSize?: number;
  };
}

interface Division {
  _id: string;
  key: string;
  label: string;
  minAge?: number;
  maxAge?: number;
  skillLevel?: string;
  maxTeams?: number;
  registeredCount?: number;
}

interface TeamEntry {
  id: string;
  teamName: string;
  divisionId: string;
}

interface ExistingTeam {
  _id: string;
  name: string;
  sport: string;
  divisionKey: string;
}

type Path = "choose" | "returning" | "returning-code" | "returning-teams" | "new";
type NewStep = "account" | "teams" | "review" | "confirm";

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getEffectivePrice(pricing?: EventSummary["pricing"]) {
  if (!pricing) return 0;
  const now = new Date();
  if (pricing.earlyBirdAmount && pricing.earlyBirdDeadline) {
    if (now < new Date(pricing.earlyBirdDeadline)) return pricing.earlyBirdAmount;
  }
  if (pricing.lateFeeAmount && pricing.lateFeeStartDate) {
    if (now >= new Date(pricing.lateFeeStartDate))
      return pricing.amount + pricing.lateFeeAmount;
  }
  return pricing.amount;
}

function calcTotal(
  perTeam: number,
  teamCount: number,
  discounts?: NonNullable<EventSummary["pricing"]>["multiTeamDiscounts"],
) {
  if (!perTeam || teamCount === 0) return 0;
  let discount = 0;
  if (discounts?.length) {
    const applicable = discounts
      .filter((d) => teamCount >= d.minTeams)
      .sort((a, b) => b.minTeams - a.minTeams);
    if (applicable.length > 0) {
      const d = applicable[0]!;
      if (d.discountAmountPerTeam) discount = d.discountAmountPerTeam;
      else if (d.discountPercent)
        discount = Math.round((perTeam * d.discountPercent) / 100);
    }
  }
  return (perTeam - discount) * teamCount;
}

let nextId = 1;
function makeTeamEntry(): TeamEntry {
  return { id: `t${nextId++}`, teamName: "", divisionId: "" };
}

// ============================================================
// Page Component
// ============================================================

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [leagueName, setLeagueName] = useState("");

  // Path: returning vs new
  const [path, setPath] = useState<Path>("choose");

  // --- Returning team flow ---
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [returningUser, setReturningUser] = useState<{
    userId: string;
    name: string;
    email: string;
    orgName: string;
    orgTenantId: string;
  } | null>(null);
  const [existingTeams, setExistingTeams] = useState<ExistingTeam[]>([]);
  const [selectedExistingTeams, setSelectedExistingTeams] = useState<
    { teamId: string; teamName: string; divisionId: string; isNew?: boolean; _newId?: string }[]
  >([]);

  // --- New team flow ---
  const [newStep, setNewStep] = useState<NewStep>("account");
  const [coachName, setCoachName] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPhone, setCoachPhone] = useState("");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [newTeams, setNewTeams] = useState<TeamEntry[]>([makeTeamEntry()]);

  // Load event + divisions
  useEffect(() => {
    fetch(`/api/public/events/${slug}/register`)
      .then((r) => {
        if (!r.ok) throw new Error("Event not found or registration closed");
        return r.json();
      })
      .then((data) => {
        setEvent(data.event);
        setDivisions(data.divisions || []);
        setLeagueName(data.leagueName || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // --------------------------------------------------------
  // Returning team: send code
  // --------------------------------------------------------
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch("/api/auth/magic-code/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || "Failed to send code.");
        return;
      }
      if (data._devCode) setDevCode(data._devCode);
      setPath("returning-code");
    } catch {
      setCodeError("Failed to send code.");
    } finally {
      setCodeLoading(false);
    }
  }

  // --------------------------------------------------------
  // Returning team: verify code & load teams
  // --------------------------------------------------------
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch(`/api/public/events/${slug}/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          code: code.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || "Invalid or expired code.");
        return;
      }
      setReturningUser(data.user);
      setExistingTeams(data.teams || []);

      // Pre-select existing teams
      const existingSelections = (data.teams || []).map((t: ExistingTeam) => ({
        teamId: t._id,
        teamName: t.name,
        divisionId: "",
      }));

      // Carry over any new team entries the user already filled in
      // (happens when they were redirected from the new-team flow due to duplicate detection)
      const carryOverTeams = newTeams
        .filter((nt) => nt.teamName.trim())
        .filter(
          (nt) =>
            !(data.teams || []).some(
              (et: ExistingTeam) =>
                et.name.toLowerCase() === nt.teamName.trim().toLowerCase(),
            ),
        )
        .map((nt, i) => ({
          teamId: "",
          teamName: nt.teamName.trim(),
          divisionId: nt.divisionId || "",
          isNew: true,
          _newId: `carry-${Date.now()}-${i}`,
        }));

      setSelectedExistingTeams([...existingSelections, ...carryOverTeams]);
      setPath("returning-teams");
    } catch {
      setCodeError("Something went wrong.");
    } finally {
      setCodeLoading(false);
    }
  }

  // --------------------------------------------------------
  // Returning team: submit registration
  // --------------------------------------------------------
  async function handleReturningSubmit() {
    const selected = selectedExistingTeams.filter((t) => t.teamId || t.isNew);
    if (selected.length === 0) {
      setSubmitError("Select at least one team.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/public/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returning: true,
          userId: returningUser!.userId,
          orgTenantId: returningUser!.orgTenantId,
          teams: selected.map((t) => ({
            teamId: t.teamId || undefined,
            teamName: t.teamName,
            divisionId: t.divisionId || undefined,
            isNew: t.isNew || false,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setPath("choose"); // reuse confirm
      setNewStep("confirm");
      // Trigger confirm via a flag
      setSubmitting(false);
      setPath("returning-teams"); // stay here but show success
      // Actually let's use a simpler approach
      window.location.href = `/public/events/${slug}/register?success=1&count=${selected.length}`;
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // --------------------------------------------------------
  // New team: team list management
  // --------------------------------------------------------
  function addTeam() {
    setNewTeams((prev) => [...prev, makeTeamEntry()]);
  }
  function removeTeam(id: string) {
    setNewTeams((prev) =>
      prev.length > 1 ? prev.filter((t) => t.id !== id) : prev,
    );
  }
  function updateTeam(id: string, field: keyof TeamEntry, value: string) {
    setNewTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  }

  const newTeamsValid = newTeams.every((t) => t.teamName.trim());

  // --------------------------------------------------------
  // New team: submit
  // --------------------------------------------------------
  async function handleNewSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/public/events/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returning: false,
          coachName,
          coachEmail,
          coachPhone,
          orgName: orgName || newTeams[0]?.teamName || "My Team",
          city,
          state,
          teams: newTeams.map((t) => ({
            teamName: t.teamName.trim(),
            divisionId: t.divisionId || undefined,
          })),
        }),
      });
      const data = await res.json();

      // Check for duplicate detection redirect BEFORE throwing on error
      if (data.existingMatch) {
        setIdentifier(coachEmail);
        setPath("returning");
        setSubmitError("");
        setSubmitting(false);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Registration failed");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setNewStep("confirm");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Registration Unavailable
          </h1>
          <p className="mt-2 text-slate-500">
            {error || "This event is not currently accepting registrations."}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            &larr; Back to event
          </button>
        </div>
      </div>
    );
  }

  // Success screen (both paths)
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  if (searchParams?.get("success") === "1") {
    const count = parseInt(searchParams.get("count") || "1", 10);
    return (
      <SuccessScreen
        event={event}
        leagueName={leagueName}
        teamCount={count}
      />
    );
  }
  if (newStep === "confirm" && path !== "returning-teams") {
    return (
      <SuccessScreen
        event={event}
        leagueName={leagueName}
        teamCount={newTeams.length}
      />
    );
  }

  const price = getEffectivePrice(event.pricing);
  const hasDivisions = divisions.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            &larr; Back to event
          </button>
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL || ""}/${process.env.NEXT_PUBLIC_LEAGUE_SLUG || ""}`}
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {leagueName}
          </a>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Register for {event.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(event.startDate)}
              {event.startDate !== event.endDate &&
                ` – ${formatDate(event.endDate)}`}
            </span>
            {event.locations?.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.locations[0]!.name}
                {event.locations[0]!.city && `, ${event.locations[0]!.city}`}
              </span>
            )}
            {price > 0 && (
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                {formatCents(price)} per team
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {/* ════════════════════════════════════════════════════
            PATH CHOOSER
        ════════════════════════════════════════════════════ */}
        {path === "choose" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Have you played with {leagueName || "this league"} before?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setPath("returning")}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
              >
                <UserCheck className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-900">Yes, returning team</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sign in with your email or phone to register your existing
                    team(s)
                  </p>
                </div>
              </button>
              <button
                onClick={() => setPath("new")}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 text-center transition-colors hover:border-green-400 hover:bg-green-50"
              >
                <UserPlus className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold text-slate-900">
                    No, new to the league
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Register your team and get a free management dashboard
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            RETURNING: Enter email/phone
        ════════════════════════════════════════════════════ */}
        {path === "returning" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={() => {
                setPath("choose");
                setCodeError("");
              }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <h2 className="text-lg font-semibold text-slate-900">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the email or phone number associated with your team.
              We&apos;ll send a one-time code.
            </p>
            <form onSubmit={handleSendCode} className="mt-4 space-y-4">
              {codeError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {codeError}
                </div>
              )}
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="coach@example.com or (555) 555-1234"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!identifier.trim() || codeLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {codeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Code"
                )}
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            RETURNING: Verify code
        ════════════════════════════════════════════════════ */}
        {path === "returning-code" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={() => {
                setPath("returning");
                setCode("");
                setDevCode(null);
                setCodeError("");
              }}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            <h2 className="text-lg font-semibold text-slate-900">
              Enter your code
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sent to{" "}
              <span className="font-medium text-slate-700">{identifier}</span>
            </p>
            <form onSubmit={handleVerifyCode} className="mt-4 space-y-4">
              {codeError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {codeError}
                </div>
              )}
              {devCode && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  Dev mode — code:{" "}
                  <span className="font-mono font-bold">{devCode}</span>
                </div>
              )}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={code.length !== 6 || codeLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {codeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & Continue"
                )}
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            RETURNING: Select teams to register
        ════════════════════════════════════════════════════ */}
        {path === "returning-teams" && returningUser && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <p className="text-sm text-slate-500">
                Welcome back,{" "}
                <span className="font-medium text-slate-900">
                  {returningUser.name}
                </span>
              </p>
              <p className="text-xs text-slate-400">{returningUser.orgName}</p>
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              Select teams to register
            </h2>

            {existingTeams.length === 0 ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                No teams found on your account. You can add new teams below or{" "}
                <button
                  onClick={() => setPath("new")}
                  className="font-medium underline"
                >
                  register as a new team
                </button>
                .
              </div>
            ) : (
              <div className="space-y-2">
                {existingTeams.map((team) => {
                  const selected = selectedExistingTeams.find(
                    (s) => s.teamId === team._id,
                  );
                  const isChecked = !!selected;
                  return (
                    <div
                      key={team._id}
                      className={`rounded-lg border p-4 transition-colors ${
                        isChecked
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExistingTeams((prev) => [
                                ...prev,
                                {
                                  teamId: team._id,
                                  teamName: team.name,
                                  divisionId: "",
                                },
                              ]);
                            } else {
                              setSelectedExistingTeams((prev) =>
                                prev.filter((s) => s.teamId !== team._id),
                              );
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {team.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {team.sport.replace(/_/g, " ")} ·{" "}
                            {team.divisionKey}
                          </p>
                          {isChecked && (
                            <select
                              value={selected?.divisionId || ""}
                              onChange={(e) => {
                                setSelectedExistingTeams((prev) =>
                                  prev.map((s) =>
                                    s.teamId === team._id
                                      ? { ...s, divisionId: e.target.value }
                                      : s,
                                  ),
                                );
                              }}
                              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">
                                {hasDivisions
                                  ? "Select division..."
                                  : "No divisions yet — league will assign"}
                              </option>
                              {divisions.map((div) => {
                                const isFull =
                                  div.maxTeams != null &&
                                  div.registeredCount != null &&
                                  div.registeredCount >= div.maxTeams;
                                return (
                                  <option
                                    key={div._id}
                                    value={div._id}
                                    disabled={isFull}
                                  >
                                    {div.label}
                                    {div.minAge && div.maxAge
                                      ? ` (Ages ${div.minAge}–${div.maxAge})`
                                      : ""}
                                    {isFull ? " — FULL" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New teams section — always visible with Add button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Add new teams
                </p>
                <button
                  onClick={() => {
                    setSelectedExistingTeams((prev) => [
                      ...prev,
                      {
                        teamId: "",
                        teamName: "",
                        divisionId: "",
                        isNew: true,
                        _newId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Team
                </button>
              </div>
              {selectedExistingTeams.filter((t) => t.isNew).length === 0 && (
                <p className="text-xs text-slate-400">
                  Need to register a team not listed above? Add it here.
                </p>
              )}
              {selectedExistingTeams
                .filter((t) => t.isNew)
                .map((team) => (
                  <div
                    key={team._newId}
                    className="rounded-lg border border-green-200 bg-green-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={team.teamName}
                            onChange={(e) => {
                              const name = e.target.value;
                              setSelectedExistingTeams((prev) =>
                                prev.map((s) =>
                                  s._newId === team._newId
                                    ? { ...s, teamName: name }
                                    : s,
                                ),
                              );
                            }}
                            placeholder="Team name (e.g. KC Thunder 16U)"
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 shrink-0">
                            NEW
                          </span>
                        </div>
                        <select
                          value={team.divisionId}
                          onChange={(e) => {
                            const divId = e.target.value;
                            setSelectedExistingTeams((prev) =>
                              prev.map((s) =>
                                s._newId === team._newId
                                  ? { ...s, divisionId: divId }
                                  : s,
                              ),
                            );
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">
                            {hasDivisions
                              ? "Select division..."
                              : "No divisions yet — league will assign"}
                          </option>
                          {divisions.map((div) => {
                            const isFull =
                              div.maxTeams != null &&
                              div.registeredCount != null &&
                              div.registeredCount >= div.maxTeams;
                            return (
                              <option
                                key={div._id}
                                value={div._id}
                                disabled={isFull}
                              >
                                {div.label}
                                {div.minAge && div.maxAge
                                  ? ` (Ages ${div.minAge}–${div.maxAge})`
                                  : ""}
                                {isFull ? " — FULL" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedExistingTeams((prev) =>
                            prev.filter((s) => s._newId !== team._newId),
                          );
                        }}
                        className="mt-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Remove team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                onClick={() => {
                  setPath("choose");
                  setSubmitError("");
                }}
                className="text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                &larr; Back
              </button>
              <button
                disabled={
                  submitting ||
                  selectedExistingTeams.filter(
                    (t) => t.teamId || t.isNew,
                  ).length === 0
                }
                onClick={handleReturningSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Register{" "}
                    {selectedExistingTeams.filter((t) => t.teamId || t.isNew).length} Team
                    {selectedExistingTeams.filter((t) => t.teamId || t.isNew).length !== 1
                      ? "s"
                      : ""}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            NEW TEAM FLOW
        ════════════════════════════════════════════════════ */}
        {path === "new" && newStep !== "confirm" && (
          <>
            {/* Progress */}
            <div className="mb-6">
              <ProgressBar
                step={newStep}
                steps={[
                  { key: "account", label: "Contact" },
                  { key: "teams", label: "Teams" },
                  { key: "review", label: "Review" },
                ]}
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Account + Org */}
              {newStep === "account" && (
                <div className="space-y-4">
                  <button
                    onClick={() => setPath("choose")}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Coach &amp; Organization
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={coachName}
                        onChange={(e) => setCoachName(e.target.value)}
                        placeholder="John Smith"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={coachEmail}
                          onChange={(e) => setCoachEmail(e.target.value)}
                          placeholder="coach@example.com"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={coachPhone}
                          onChange={(e) => setCoachPhone(e.target.value)}
                          placeholder="(555) 555-1234"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <hr className="border-slate-200" />
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Organization / Program Name
                      </label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="KC Thunder Athletics"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          City *
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Kansas City"
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">
                          State *
                        </label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="MO"
                          maxLength={2}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      disabled={
                        !coachName.trim() ||
                        !coachEmail.trim() ||
                        !city.trim() ||
                        !state.trim()
                      }
                      onClick={() => setNewStep("teams")}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Teams */}
              {newStep === "teams" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Your Teams
                    </h2>
                    <button
                      onClick={addTeam}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Add Team
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newTeams.map((team, idx) => (
                      <div
                        key={team.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={team.teamName}
                                onChange={(e) =>
                                  updateTeam(
                                    team.id,
                                    "teamName",
                                    e.target.value,
                                  )
                                }
                                placeholder="Team name (e.g. KC Thunder 10U)"
                                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <select
                              value={team.divisionId}
                              onChange={(e) =>
                                updateTeam(
                                  team.id,
                                  "divisionId",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">
                                {hasDivisions
                                  ? "Select division..."
                                  : "No divisions yet — league will assign"}
                              </option>
                              {divisions.map((div) => {
                                const isFull =
                                  div.maxTeams != null &&
                                  div.registeredCount != null &&
                                  div.registeredCount >= div.maxTeams;
                                return (
                                  <option
                                    key={div._id}
                                    value={div._id}
                                    disabled={isFull}
                                  >
                                    {div.label}
                                    {div.minAge && div.maxAge
                                      ? ` (Ages ${div.minAge}–${div.maxAge})`
                                      : ""}
                                    {div.skillLevel
                                      ? ` · ${div.skillLevel}`
                                      : ""}
                                    {isFull ? " — FULL" : ""}
                                    {div.maxTeams
                                      ? ` [${div.registeredCount || 0}/${div.maxTeams}]`
                                      : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          {newTeams.length > 1 && (
                            <button
                              onClick={() => removeTeam(team.id)}
                              className="mt-1 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {price > 0 && (
                    <PricingSummary
                      price={price}
                      teamCount={newTeams.length}
                      discounts={event.pricing?.multiTeamDiscounts}
                    />
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setNewStep("account")}
                      className="text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                      &larr; Back
                    </button>
                    <button
                      disabled={!newTeamsValid}
                      onClick={() => setNewStep("review")}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Review <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Review */}
              {newStep === "review" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Review Registration
                  </h2>
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        Contact
                      </p>
                      <p className="font-medium text-slate-900">{coachName}</p>
                      <p>
                        {coachEmail}
                        {coachPhone ? ` · ${coachPhone}` : ""}
                      </p>
                    </div>
                    <hr className="border-slate-200" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        Organization
                      </p>
                      <p className="font-medium text-slate-900">
                        {orgName || newTeams[0]?.teamName}
                      </p>
                      <p>
                        {city}, {state}
                      </p>
                    </div>
                    <hr className="border-slate-200" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">
                        Teams ({newTeams.length})
                      </p>
                      <div className="space-y-1.5">
                        {newTeams.map((t, idx) => {
                          const div = divisions.find(
                            (d) => d._id === t.divisionId,
                          );
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between rounded bg-white px-3 py-2 border border-slate-200"
                            >
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-slate-900">
                                  {t.teamName}
                                </span>
                              </div>
                              {div ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                  {div.label}
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                                  Division TBD
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {price > 0 && (
                      <>
                        <hr className="border-slate-200" />
                        <PricingSummary
                          price={price}
                          teamCount={newTeams.length}
                          discounts={event.pricing?.multiTeamDiscounts}
                          inline
                        />
                      </>
                    )}
                  </div>

                  {submitError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => setNewStep("teams")}
                      className="text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                      &larr; Back
                    </button>
                    <button
                      disabled={submitting}
                      onClick={handleNewSubmit}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Complete Registration
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Progress Bar
// ============================================================

function ProgressBar({
  step,
  steps,
}: {
  step: string;
  steps: { key: string; label: string }[];
}) {
  const currentIdx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, idx) => (
        <div key={s.key} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                idx < currentIdx
                  ? "bg-blue-600 text-white"
                  : idx === currentIdx
                  ? "bg-blue-600 text-white ring-2 ring-blue-200"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {idx < currentIdx ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                idx + 1
              )}
            </div>
            <span className="mt-1 text-[10px] font-medium text-slate-500">
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 -mt-4 ${
                idx < currentIdx ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Pricing Summary
// ============================================================

function PricingSummary({
  price,
  teamCount,
  discounts,
  inline,
}: {
  price: number;
  teamCount: number;
  discounts?: NonNullable<EventSummary["pricing"]>["multiTeamDiscounts"];
  inline?: boolean;
}) {
  const total = calcTotal(price, teamCount, discounts);
  const perTeamAfterDiscount =
    teamCount > 0 ? Math.round(total / teamCount) : price;
  const hasDiscount = perTeamAfterDiscount < price;

  return (
    <div
      className={
        inline
          ? "text-sm"
          : "rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm"
      }
    >
      <div className="flex items-center justify-between text-slate-600">
        <span>
          {teamCount} team{teamCount !== 1 ? "s" : ""} &times;{" "}
          {formatCents(price)}
        </span>
        <span className="font-medium text-slate-900">{formatCents(total)}</span>
      </div>
      {hasDiscount && (
        <p className="mt-1 text-xs text-green-700">
          Multi-team discount applied: {formatCents(perTeamAfterDiscount)}/team
        </p>
      )}
    </div>
  );
}

// ============================================================
// Success Screen
// ============================================================

function SuccessScreen({
  event,
  leagueName,
  teamCount,
}: {
  event: EventSummary;
  leagueName: string;
  teamCount: number;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="mx-auto max-w-md px-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Registration Submitted!
        </h1>
        <p className="mt-2 text-slate-600">
          {teamCount === 1 ? (
            <>Your team has been registered for <strong>{event.name}</strong>.</>
          ) : (
            <>
              <strong>{teamCount} teams</strong> have been registered for{" "}
              <strong>{event.name}</strong>.
            </>
          )}
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Check your email for a link to your team management dashboard. From
          there you can manage your roster, invite parents, and track your
          schedule.
        </p>
        <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <p className="font-medium">
            What&apos;s included with your registration:
          </p>
          <ul className="mt-2 space-y-1 text-left">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              Team management dashboard
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              Roster management &amp; parent invites
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              Game schedule &amp; notifications
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
              Event registration streamlined
            </li>
          </ul>
        </div>
        <a
          href={`/public/events/${event.slug}`}
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          &larr; Back to event details
        </a>
      </div>
    </div>
  );
}
