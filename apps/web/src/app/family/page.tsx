"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Users,
  CalendarDays,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Camera,
  Plus,
  Loader2,
  Mail,
  MapPin,
  Medal,
  Heart,
  Trophy,
  ChevronRight,
  Pencil,
  X,
  Upload,
} from "lucide-react";

// ─── Types ───

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  age: number | null;
  currentPhotoUrl?: string;
  sizing?: { top?: string; bottom?: string; shoe?: string; headgear?: string };
  sports: { sport: string; positions: string[] }[];
  teamHistory: {
    tenantSlug: string;
    tenantName: string;
    teamName: string;
    sport: string;
    season: string;
    year: number;
    jerseyNumber?: string;
  }[];
  verificationStatus: string;
  verifications: any[];
}

interface ScheduleEvent {
  _id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  location?: { name: string; address?: string };
  orgSlug: string;
  orgName: string;
  teamName: string;
  isOrgWide?: boolean;
}

interface Message {
  _id: string;
  subject?: string;
  body: string;
  authorName: string;
  channel: string;
  createdAt: string;
  orgSlug: string;
  orgName: string;
}

interface FamilyData {
  hasFamily: boolean;
  familyId?: string;
  profile?: any;
  guardians?: any[];
  players?: Player[];
  user?: { name: string; email: string };
}

type Tab = "kids" | "schedule" | "messages" | "documents";

// ─── Page ───

export default function FamilyDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("kids");
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);

  // Load family data
  const refreshFamily = useCallback(() => {
    return fetch("/api/family")
      .then((r) => {
        if (r.status === 401) { router.push("/auth/login?callbackUrl=/family"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    refreshFamily();
  }, [refreshFamily]);

  // Lazy-load schedule
  useEffect(() => {
    if (tab !== "schedule" || scheduleLoaded) return;
    fetch("/api/family/schedule")
      .then((r) => r.json())
      .then((d) => setSchedule(d.events || []))
      .finally(() => setScheduleLoaded(true));
  }, [tab, scheduleLoaded]);

  // Lazy-load messages
  useEffect(() => {
    if (tab !== "messages" || messagesLoaded) return;
    fetch("/api/family/messages")
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .finally(() => setMessagesLoaded(true));
  }, [tab, messagesLoaded]);

  // Lazy-load documents + grants
  useEffect(() => {
    if (tab !== "documents" || docsLoaded) return;
    Promise.all([
      fetch("/api/family/documents").then((r) => r.json()),
      fetch("/api/family/grants").then((r) => r.json()),
    ]).then(([docData, grantData]) => {
      setDocuments(docData.documents || []);
      setGrants(grantData.grants || []);
    }).finally(() => setDocsLoaded(true));
  }, [tab, docsLoaded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not logged in or no family — show setup
  if (!data || !data.hasFamily) {
    return <FamilySetup userName={data?.user?.name} />;
  }

  const { profile, players = [], guardians = [] } = data;
  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "kids", label: "My Kids", icon: Heart, count: players.length },
    { key: "schedule", label: "Schedule", icon: CalendarDays },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "documents", label: "Documents", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Heart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{profile?.familyName || "My Family"}</h1>
                <p className="text-sm text-gray-500">
                  {players.length} player{players.length !== 1 ? "s" : ""}
                  {profile?.orgConnections?.length > 0 && ` · ${profile.orgConnections.length} org${profile.orgConnections.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <Link
              href="/account"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Settings
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {t.count !== undefined && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px]">{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {tab === "kids" && <KidsTab players={players} familyId={data.familyId!} />}
        {tab === "schedule" && <ScheduleTab events={schedule} loading={!scheduleLoaded} />}
        {tab === "messages" && <MessagesTab messages={messages} loading={!messagesLoaded} />}
        {tab === "documents" && (
          <DocumentsTab
            documents={documents}
            grants={grants}
            players={players}
            loading={!docsLoaded}
            onGrantRevoked={(grantId) =>
              setGrants((prev) => prev.map((g) => g._id === grantId ? { ...g, status: "revoked" } : g))
            }
          />
        )}
      </main>
    </div>
  );
}

// ─── Family Setup (no family yet) ───

function FamilySetup({ userName }: { userName?: string }) {
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const createFamily = async () => {
    setCreating(true);
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyName: userName ? `${userName}'s Family` : "My Family" }),
    });
    if (res.ok) {
      router.refresh();
      window.location.reload();
    }
    setCreating(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 mb-6">
          <Heart className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to Go Participate</h1>
        <p className="text-gray-500 mt-2 mb-6">
          Set up your family profile to manage your kids' sports, schedules, and documents all in one place.
        </p>
        <button
          onClick={createFamily}
          disabled={creating}
          className="rounded-md bg-amber-600 text-white px-6 py-3 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create My Family"}
        </button>
      </div>
    </div>
  );
}

// ─── Kids Tab ───

function KidsTab({ players, familyId }: { players: Player[]; familyId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", dateOfBirth: "", gender: "male" });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!addForm.firstName || !addForm.lastName || !addForm.dateOfBirth) return;
    setAdding(true);
    const res = await fetch("/api/family/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      window.location.reload();
    }
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Kids</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-md bg-amber-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-amber-700"
        >
          <Plus className="h-3.5 w-3.5" /> Add Player
        </button>
      </div>

      {/* Add player form */}
      {showAdd && (
        <div className="rounded-lg border bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First Name"
              value={addForm.firstName}
              onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
              className="flex h-10 rounded-md border px-3 py-2 text-sm"
            />
            <input
              placeholder="Last Name"
              value={addForm.lastName}
              onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
              className="flex h-10 rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={addForm.dateOfBirth}
              onChange={(e) => setAddForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              className="flex h-10 rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={addForm.gender}
              onChange={(e) => setAddForm((f) => ({ ...f, gender: e.target.value }))}
              className="flex h-10 rounded-md border px-3 py-2 text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={adding}
              className="rounded-md bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {adding ? "Adding..." : "Add Player"}
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Player cards */}
      {players.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No players yet. Add your first player above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <PlayerCard key={player._id} player={player} onUpdate={refreshFamily} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, onUpdate }: { player: Player; onUpdate: () => void }) {
  const currentTeams = player.teamHistory.filter((t) => !(t as any).leftAt);
  const verifiedCount = player.verifications.length;
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-start gap-4">
        {/* Photo */}
        <div className="shrink-0">
          {player.currentPhotoUrl ? (
            <img
              src={player.currentPhotoUrl}
              alt={player.firstName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Camera className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{player.firstName} {player.lastName}</h3>
            {player.verificationStatus === "verified" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-300" />
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
            {player.age !== null && <span>Age {player.age}</span>}
            {player.gender && <span className="capitalize">{player.gender}</span>}
            {player.dateOfBirth && (
              <span>DOB: {format(new Date(player.dateOfBirth), "MMM d, yyyy")}</span>
            )}
          </div>

          {/* Current teams */}
          {currentTeams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentTeams.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Shield className="h-3 w-3" />
                  {t.teamName}
                  {t.jerseyNumber && ` #${t.jerseyNumber}`}
                </span>
              ))}
            </div>
          )}

          {/* Sports */}
          {player.sports.length > 0 && (
            <div className="flex gap-1.5 mt-1.5">
              {player.sports.map((s, i) => (
                <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 capitalize">
                  {s.sport.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

          {/* Sizing */}
          {(player.sizing?.top || player.sizing?.shoe) && (
            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              {player.sizing?.top && <span>Top: {player.sizing.top}</span>}
              {player.sizing?.bottom && <span>Bottom: {player.sizing.bottom}</span>}
              {player.sizing?.shoe && <span>Shoe: {player.sizing.shoe}</span>}
            </div>
          )}
        </div>

        {/* Verification badge + Edit */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {verifiedCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 border px-2.5 py-1 text-xs text-gray-400">
              Not Verified
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>
      </div>

      {/* Team history (collapsed) */}
      {player.teamHistory.length > currentTeams.length && (
        <details className="mt-3 text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">
            {player.teamHistory.length} season{player.teamHistory.length !== 1 ? "s" : ""} of history
          </summary>
          <div className="mt-2 space-y-1 pl-4">
            {player.teamHistory.map((t, i) => (
              <div key={i}>
                {t.year} — {t.teamName} ({t.tenantName}) {t.jerseyNumber && `#${t.jerseyNumber}`}
              </div>
            ))}
          </div>
        </details>
      )}

      {editing && (
        <EditPlayerModal
          player={player}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

// ─── Edit Player Modal ───

function EditPlayerModal({
  player,
  onClose,
  onSaved,
}: {
  player: Player;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [dob, setDob] = useState(
    player.dateOfBirth ? new Date(player.dateOfBirth).toISOString().slice(0, 10) : "",
  );
  const [gender, setGender] = useState(player.gender || "male");
  const [sizingTop, setSizingTop] = useState(player.sizing?.top || "");
  const [sizingBottom, setSizingBottom] = useState(player.sizing?.bottom || "");
  const [sizingShoe, setSizingShoe] = useState(player.sizing?.shoe || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    player.currentPhotoUrl || null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }
    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // 1. Patch the player fields
      const patchRes = await fetch(`/api/family/players/${player._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob ? new Date(dob) : undefined,
          gender,
          sizing: {
            top: sizingTop.trim() || undefined,
            bottom: sizingBottom.trim() || undefined,
            shoe: sizingShoe.trim() || undefined,
          },
        }),
      });
      if (!patchRes.ok) {
        const body = await patchRes.json().catch(() => null);
        throw new Error(body?.error || "Failed to save profile");
      }

      // 2. If a new photo was selected, upload it
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const photoRes = await fetch(`/api/family/players/${player._id}/photo`, {
          method: "POST",
          body: fd,
        });
        if (!photoRes.ok) {
          const body = await photoRes.json().catch(() => null);
          throw new Error(body?.error || "Failed to upload photo");
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Player</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photo */}
        <div className="mb-4 flex items-center gap-4">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Player photo"
              className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              {photoPreview ? "Change photo" : "Upload photo"}
            </button>
            {photoFile && (
              <p className="mt-1 text-xs text-gray-500">{photoFile.name}</p>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
        </div>

        {/* DOB & Gender */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        {/* Sizing */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-1">Sizing (optional)</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              placeholder="Top"
              value={sizingTop}
              onChange={(e) => setSizingTop(e.target.value)}
              className="h-10 rounded-md border px-3 text-sm"
            />
            <input
              placeholder="Bottom"
              value={sizingBottom}
              onChange={(e) => setSizingBottom(e.target.value)}
              className="h-10 rounded-md border px-3 text-sm"
            />
            <input
              placeholder="Shoe"
              value={sizingShoe}
              onChange={(e) => setSizingShoe(e.target.value)}
              className="h-10 rounded-md border px-3 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !firstName.trim() || !lastName.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Tab ───

function ScheduleTab({ events, loading }: { events: ScheduleEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">No upcoming events in the next 2 weeks.</p>
      </div>
    );
  }

  // Group by day
  const grouped = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const day = format(new Date(event.startTime), "yyyy-MM-dd");
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(event);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([day, dayEvents]) => (
        <div key={day}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {format(new Date(day), "EEEE, MMMM d")}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <div key={event._id} className="rounded-lg border bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{event.title}</h4>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 capitalize">
                      {event.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(event.startTime), "h:mm a")} — {format(new Date(event.endTime), "h:mm a")}
                    </span>
                    {event.location?.name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <Shield className="h-3 w-3" />
                    {event.orgName} — {event.teamName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Messages Tab ───

function MessagesTab({ messages, loading }: { messages: Message[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">No recent messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <div key={msg._id} className="rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">{msg.subject || "Message"}</h4>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.body}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-400">
              {format(new Date(msg.createdAt), "MMM d")}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <Shield className="h-3 w-3" />
            {msg.orgName} · {msg.authorName}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Documents Tab ───

function DocumentsTab({
  documents,
  grants,
  players,
  loading,
  onGrantRevoked,
}: {
  documents: any[];
  grants: any[];
  players: Player[];
  loading: boolean;
  onGrantRevoked: (grantId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadPlayerId, setUploadPlayerId] = useState("");
  const [uploadDocType, setUploadDocType] = useState("birth_certificate");

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleUpload = async (file: File) => {
    if (!uploadPlayerId) { alert("Select a player first"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("playerId", uploadPlayerId);
    fd.append("documentType", uploadDocType);
    const res = await fetch("/api/family/documents", { method: "POST", body: fd });
    if (res.ok) window.location.reload();
    setUploading(false);
  };

  const revokeGrant = async (grantId: string) => {
    const res = await fetch("/api/family/grants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grantId }),
    });
    if (res.ok) onGrantRevoked(grantId);
  };

  const docTypeLabels: Record<string, string> = {
    birth_certificate: "Birth Certificate",
    passport: "Passport",
    school_id: "School ID",
    state_id: "State ID",
    medical_form: "Medical Form",
    insurance_card: "Insurance Card",
    photo_id: "Photo ID",
    other: "Other",
  };

  const activeGrants = grants.filter((g) => g.status === "active" && new Date(g.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="rounded-lg border bg-white p-5 space-y-3">
        <h3 className="font-semibold">Upload Document</h3>
        <p className="text-sm text-gray-500">
          Documents are encrypted and stored securely. Only you control who can access them.
        </p>
        <div className="flex flex-wrap gap-3">
          <select
            value={uploadPlayerId}
            onChange={(e) => setUploadPlayerId(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select player</option>
            {players.map((p) => (
              <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
          <select
            value={uploadDocType}
            onChange={(e) => setUploadDocType(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {Object.entries(docTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className={`rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
            uploading || !uploadPlayerId
              ? "bg-gray-100 text-gray-400"
              : "bg-amber-600 text-white hover:bg-amber-700"
          }`}>
            {uploading ? "Uploading..." : "Choose File"}
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              disabled={uploading || !uploadPlayerId}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
          </label>
        </div>
      </div>

      {/* Documents list */}
      <div>
        <h3 className="font-semibold mb-3">Stored Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-gray-500">
            No documents uploaded yet. Upload a birth certificate to get started with verification.
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc._id} className="rounded-lg border bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase">
                      {docTypeLabels[doc.documentType] || doc.documentType}
                    </span>
                    <span className="font-medium text-sm">{doc.playerName}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.fileName} · {Math.round(doc.sizeBytes / 1024)}KB · {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Encrypted</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active grants */}
      {activeGrants.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Active Access Grants ({activeGrants.length})</h3>
          <div className="space-y-2">
            {activeGrants.map((grant) => (
              <div key={grant._id} className="rounded-lg border bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{grant.grantedToName}</span>
                    <span className="text-xs text-gray-400">· {grant.playerName}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {grant.purpose.replace(/_/g, " ")} · Expires {format(new Date(grant.expiresAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <button
                  onClick={() => revokeGrant(grant._id)}
                  className="rounded-md border border-red-200 bg-red-50 text-red-600 px-3 py-1 text-xs font-medium hover:bg-red-100"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past grants */}
      {grants.filter((g) => g.status !== "active").length > 0 && (
        <details className="text-sm text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">
            Past grants ({grants.filter((g) => g.status !== "active").length})
          </summary>
          <div className="mt-2 space-y-1">
            {grants.filter((g) => g.status !== "active").map((g) => (
              <div key={g._id} className="text-xs">
                {g.grantedToName} — {g.playerName} — {g.status} — {format(new Date(g.grantedAt), "MMM d, yyyy")}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
