"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Textarea } from "@goparticipate/ui/src/components/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Trophy,
  Settings2,
  Layers,
  GitBranch,
  Loader2,
  Eye,
  Sparkles,
  Upload,
  X,
  Plus,
  Image,
  Pencil,
  Save,
  Trash2,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ScanLine,
  QrCode,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from "lucide-react";

// ─── Types ───

interface EventDetail {
  _id: string;
  name: string;
  slug: string;
  type: string;
  sport: string;
  description?: string;
  posterUrl?: string;
  locations: { name: string; address?: string; city?: string; state?: string; fields: string[] }[];
  days: { date: string; startTime: string; endTime: string; label?: string }[];
  startDate: string;
  endDate: string;
  registrationOpen: string;
  registrationClose: string;
  rosterLockDate?: string;
  pricing: {
    amount: number;
    earlyBirdAmount?: number;
    earlyBirdDeadline?: string;
    refundPolicy?: string;
    multiTeamDiscounts?: { minTeams: number; discountPercent?: number; discountAmountPerTeam?: number }[];
  };
  settings: {
    gameDurationMinutes: number;
    halfDurationMinutes?: number;
    timeBetweenGamesMinutes: number;
    clockType: string;
    maxRosterSize?: number;
    requireAgeVerification: boolean;
    requireWaiver: boolean;
  };
  tiebreakerRules: { priority: number; rule: string; description?: string }[];
  tiebreakerLocked: boolean;
  maxTeamsPerDivision?: number;
  estimatedTeamsPerDivision?: number;
  status: string;
  contactEmail?: string;
  contactPhone?: string;
  rules?: string;
  divisions: DivisionInfo[];
  registrationCount: number;
  gameCount: number;
  createdAt: string;
}

interface DivisionInfo {
  _id: string;
  key: string;
  label: string;
  minAge: number;
  maxAge: number;
  skillLevel?: string;
  pools: any[];
  bracketTiers: { name: string; teamCount: number; bracketType: string }[];
  maxTeams?: number;
  bracketType?: string;
  eventFormat?: string;
  minPoolGamesPerTeam?: number;
  teamsAdvancingPerPool?: number;
  estimatedTeamCount?: number;
}

interface GameData {
  _id: string;
  eventId: string;
  divisionId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
  scheduledAt: string;
  dayIndex: number;
  locationName: string;
  field: string;
  timeSlot: string;
  round?: string;
  gameNumber?: number;
  status: string;
}

interface BracketData {
  _id: string;
  eventId: string;
  divisionId: string;
  name: string;
  type: "single_elimination" | "double_elimination" | "consolation" | "round_robin" | "pool_play";
  matches: BracketMatch[];
  status: "draft" | "published" | "in_progress" | "completed";
}

interface BracketMatch {
  matchNumber: number;
  round: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "in_progress" | "completed" | "canceled";
}

interface RegistrationData {
  _id: string;
  eventId: string;
  divisionId: string;
  orgTenantId: string;
  teamId: string;
  teamName: string;
  roster: { playerId: string; playerName: string; jerseyNumber?: number; position?: string; eligibilityStatus: string }[];
  status: "pending" | "approved" | "rejected" | "waitlisted" | "withdrawn";
  paymentStatus: string;
  amountPaid: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Config Maps ───

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; next?: string; nextLabel?: string }> = {
  draft: { label: "Draft", variant: "secondary", next: "published", nextLabel: "Publish Event" },
  published: { label: "Published", variant: "outline", next: "registration_open", nextLabel: "Open Registration" },
  registration_open: { label: "Registration Open", variant: "default", next: "registration_closed", nextLabel: "Close Registration" },
  registration_closed: { label: "Reg. Closed", variant: "secondary", next: "in_progress", nextLabel: "Start Event" },
  in_progress: { label: "In Progress", variant: "default", next: "completed", nextLabel: "Complete Event" },
  completed: { label: "Completed", variant: "secondary" },
  canceled: { label: "Canceled", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
  tournament: "Tournament",
  league_season: "League Season",
  showcase: "Showcase",
  combine: "Combine",
};

const clockLabels: Record<string, string> = {
  running: "Running Clock",
  stop: "Stop Clock",
  mixed: "Mixed (Running > Stop final 2 min)",
};

// ─── Common Tiebreaker Functions ───

const COMMON_TIEBREAKERS: { rule: string; description: string }[] = [
  { rule: "Head-to-head record", description: "Record between tied teams in games they played against each other" },
  { rule: "Win percentage", description: "Total wins divided by games played" },
  { rule: "Point differential", description: "Total points scored minus total points allowed" },
  { rule: "Points allowed", description: "Fewer total points allowed ranks higher" },
  { rule: "Points scored", description: "More total points scored ranks higher" },
  { rule: "Head-to-head point differential", description: "Point differential only in games between tied teams" },
  { rule: "Strength of schedule", description: "Combined win percentage of opponents played" },
  { rule: "Fewest forfeits", description: "Team with fewer forfeits ranks higher" },
  { rule: "Fewest penalties / unsportsmanlike", description: "Team with fewer penalty flags or conduct issues ranks higher" },
  { rule: "Coin flip / random draw", description: "Random selection if all other tiebreakers are equal" },
];

// ─── Component ───

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "divisions" | "registrations" | "brackets" | "settings">("overview");
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [showEndTimes, setShowEndTimes] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [regStatusFilter, setRegStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "waitlisted" | "withdrawn">("all");
  const [brackets, setBrackets] = useState<BracketData[]>([]);
  const [selectedBracketDiv, setSelectedBracketDiv] = useState<string>("");
  const [creatingBracket, setCreatingBracket] = useState(false);
  const [scoringMatch, setScoringMatch] = useState<{ bracketId: string; matchNumber: number } | null>(null);
  const [matchHomeScore, setMatchHomeScore] = useState("");
  const [matchAwayScore, setMatchAwayScore] = useState("");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const canEdit = event?.status !== "completed" && event?.status !== "canceled";

  function startEditing() {
    if (!event) return;
    setEditForm({
      name: event.name,
      description: event.description || "",
      type: event.type,
      startDate: event.startDate?.split("T")[0] || "",
      endDate: event.endDate?.split("T")[0] || "",
      registrationOpen: event.registrationOpen?.split("T")[0] || "",
      registrationClose: event.registrationClose?.split("T")[0] || "",
      rosterLockDate: event.rosterLockDate?.split("T")[0] || "",
      contactEmail: event.contactEmail || "",
      contactPhone: event.contactPhone || "",
      rules: event.rules || "",
      locations: event.locations.map((l) => ({ ...l, fields: [...l.fields], fieldsText: l.fields.filter(Boolean).join(", ") })),
      days: event.days.map((d) => ({ ...d, date: typeof d.date === "string" ? d.date.split("T")[0] : d.date })),
      pricing: {
        amount: event.pricing.amount ? (event.pricing.amount / 100).toFixed(2) : "0.00",
        earlyBirdAmount: event.pricing.earlyBirdAmount ? (event.pricing.earlyBirdAmount / 100).toFixed(2) : "",
        earlyBirdDeadline: event.pricing.earlyBirdDeadline?.split("T")[0] || "",
        refundPolicy: event.pricing.refundPolicy || "",
      },
      settings: { ...event.settings },
      tiebreakerRules: event.tiebreakerRules.length > 0
        ? event.tiebreakerRules.sort((a, b) => a.priority - b.priority).map((r) => ({ ...r }))
        : COMMON_TIEBREAKERS.slice(0, 4).map((t, i) => ({ priority: i + 1, rule: t.rule, description: t.description })),
    });
    setEditing(true);
  }

  async function saveEdits() {
    setSaving(true);
    try {
      const payload = { ...editForm };
      // Parse fieldsText into fields array for each location
      if (payload.locations) {
        payload.locations = payload.locations.map((loc: any) => {
          const { fieldsText, ...rest } = loc;
          return {
            ...rest,
            fields: typeof fieldsText === "string"
              ? fieldsText.split(",").map((f: string) => f.trim()).filter(Boolean)
              : rest.fields || [],
          };
        });
      }
      // Convert dollar amounts to cents for storage
      if (payload.pricing) {
        payload.pricing = { ...payload.pricing };
        payload.pricing.amount = Math.round(parseFloat(payload.pricing.amount || "0") * 100);
        if (payload.pricing.earlyBirdAmount) {
          payload.pricing.earlyBirdAmount = Math.round(parseFloat(payload.pricing.earlyBirdAmount) * 100);
        } else {
          delete payload.pricing.earlyBirdAmount;
        }
        if (!payload.pricing.earlyBirdDeadline) delete payload.pricing.earlyBirdDeadline;
      }
      if (!payload.rosterLockDate) delete payload.rosterLockDate;

      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchEvent();
        setEditing(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save changes");
      }
    } catch {
      alert("Failed to save changes");
    }
    setSaving(false);
  }

  function cancelEditing() {
    setEditing(false);
    setEditForm({});
  }

  // Division creation
  const [showDivForm, setShowDivForm] = useState(false);
  const [divForm, setDivForm] = useState({
    label: "", key: "", minAge: "", maxAge: "", skillLevel: "open",
    eventFormat: "round_robin", bracketType: "single_elimination",
    minPoolGamesPerTeam: "3", teamsAdvancingPerPool: "2",
    maxTeams: "", estimatedTeamCount: "8",
  });

  // Division inline editing
  const [editingDivId, setEditingDivId] = useState<string | null>(null);
  const [divEditForm, setDivEditForm] = useState<Record<string, any>>({});
  const [divSaving, setDivSaving] = useState(false);

  function startEditDiv(d: DivisionInfo) {
    setEditingDivId(d._id);
    setDivEditForm({
      label: d.label,
      eventFormat: d.eventFormat || "round_robin",
      bracketType: d.bracketType || "single_elimination",
      minPoolGamesPerTeam: d.minPoolGamesPerTeam ?? 3,
      teamsAdvancingPerPool: d.teamsAdvancingPerPool ?? 2,
      estimatedTeamCount: d.estimatedTeamCount || 8,
      maxTeams: d.maxTeams || "",
      bracketTiers: d.bracketTiers?.length
        ? d.bracketTiers.map((t) => ({ ...t }))
        : [],
    });
  }

  async function saveDivEdit() {
    if (!editingDivId) return;
    setDivSaving(true);
    try {
      const payload = {
        ...divEditForm,
        minPoolGamesPerTeam: parseInt(divEditForm.minPoolGamesPerTeam) || 3,
        teamsAdvancingPerPool: parseInt(divEditForm.teamsAdvancingPerPool) || 2,
        estimatedTeamCount: parseInt(divEditForm.estimatedTeamCount) || 8,
        maxTeams: parseInt(divEditForm.maxTeams) || undefined,
      };
      const res = await fetch(`/api/events/${id}/divisions/${editingDivId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchEvent();
        setEditingDivId(null);
      }
    } catch { /* ignore */ }
    setDivSaving(false);
  }

  async function deleteDivision(divId: string) {
    if (!confirm("Remove this division from the event? Games in this division will remain but be orphaned.")) return;
    await fetch(`/api/events/${id}/divisions/${divId}`, { method: "DELETE" });
    await fetchEvent();
    await fetchGames();
  }

  // Import divisions from league templates
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [leagueDivisions, setLeagueDivisions] = useState<{ _id: string; key: string; label: string; minAge: number; maxAge: number; skillLevel?: string; sport: string }[]>([]);
  const [selectedImports, setSelectedImports] = useState<string[]>([]);
  const [importFormat, setImportFormat] = useState("pool_play_to_bracket");
  const [importBracketType, setImportBracketType] = useState("single_elimination");
  const [importMinGames, setImportMinGames] = useState("3");
  const [importAdvancing, setImportAdvancing] = useState("2");
  const [importEstTeams, setImportEstTeams] = useState("8");

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/events/${id}`);
    const data = await res.json();
    setEvent(data);
  }, [id]);

  const fetchGames = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedDivision !== "all") params.set("divisionId", selectedDivision);
    const res = await fetch(`/api/events/${id}/games?${params}`);
    const data = await res.json();
    setGames(Array.isArray(data) ? data : []);
  }, [id, selectedDivision]);

  const fetchRegistrations = useCallback(async () => {
    const res = await fetch(`/api/events/${id}/registrations`);
    const data = await res.json();
    setRegistrations(Array.isArray(data) ? data : []);
  }, [id]);

  const fetchBrackets = useCallback(async () => {
    const res = await fetch(`/api/events/${id}/brackets`);
    const data = await res.json();
    setBrackets(Array.isArray(data) ? data : []);
  }, [id]);

  useEffect(() => {
    Promise.all([fetchEvent(), fetchGames(), fetchRegistrations(), fetchBrackets()]).then(() => setLoading(false));
  }, [fetchEvent, fetchGames, fetchRegistrations, fetchBrackets]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchEvent();
    setUpdating(false);
  }

  async function generateSchedule() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/events/${id}/schedule`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate schedule");
      } else {
        await fetchGames();
        await fetchEvent();
        setActiveTab("schedule");
      }
    } catch {
      alert("Failed to generate schedule");
    }
    setGenerating(false);
  }

  async function uploadPoster(file: File) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB. Please resize or compress the image and try again.`);
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/events/${id}/upload`, { method: "POST", body: formData });
      if (res.ok) {
        await fetchEvent();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to upload image. Please try a smaller file.");
      }
    } catch {
      alert("Upload failed. The image may be too large. Maximum size is 5MB.");
    }
    setUploading(false);
  }

  async function updateGameScore(gameId: string, homeScore: number, awayScore: number) {
    await fetch(`/api/events/${id}/games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore, awayScore, status: "completed" }),
    });
    await fetchGames();
    setSelectedGame(null);
  }

  async function updateRegistration(regId: string, status: string) {
    await fetch(`/api/events/${id}/registrations/${regId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchRegistrations();
    await fetchEvent();
  }

  async function createBracket(divisionId: string) {
    setCreatingBracket(true);
    const res = await fetch(`/api/events/${id}/brackets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ divisionId }),
    });
    if (res.ok) {
      await fetchBrackets();
    }
    setCreatingBracket(false);
  }

  async function reportMatchResult(bracketId: string, matchNumber: number, homeScore: number, awayScore: number) {
    const res = await fetch(`/api/events/${id}/brackets/${bracketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchResult: { matchNumber, homeScore, awayScore } }),
    });
    if (res.ok) {
      await fetchBrackets();
    }
    setScoringMatch(null);
    setMatchHomeScore("");
    setMatchAwayScore("");
  }

  async function deleteBracket(bracketId: string) {
    await fetch(`/api/events/${id}/brackets/${bracketId}`, { method: "DELETE" });
    await fetchBrackets();
  }

  async function createDivision() {
    const res = await fetch(`/api/events/${id}/divisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: divForm.label,
        key: divForm.key,
        skillLevel: divForm.skillLevel,
        eventFormat: divForm.eventFormat,
        bracketType: divForm.bracketType,
        sport: event?.sport || "7v7_football",
        minAge: parseInt(divForm.minAge) || 5,
        maxAge: parseInt(divForm.maxAge) || 18,
        maxTeams: parseInt(divForm.maxTeams) || undefined,
        estimatedTeamCount: parseInt(divForm.estimatedTeamCount) || 8,
        minPoolGamesPerTeam: parseInt(divForm.minPoolGamesPerTeam) || 3,
        teamsAdvancingPerPool: parseInt(divForm.teamsAdvancingPerPool) || 2,
      }),
    });
    if (res.ok) {
      await fetchEvent();
      setShowDivForm(false);
      setDivForm({
        label: "", key: "", minAge: "", maxAge: "", skillLevel: "open",
        eventFormat: "round_robin", bracketType: "single_elimination",
        minPoolGamesPerTeam: "3", teamsAdvancingPerPool: "2",
        maxTeams: "", estimatedTeamCount: "8",
      });
    }
  }

  async function openImportPanel() {
    setShowImportPanel(true);
    setImportLoading(true);
    try {
      const res = await fetch("/api/divisions");
      if (res.ok) {
        const data = await res.json();
        const divs = Array.isArray(data) ? data : [];
        setLeagueDivisions(divs);
        // Pre-select all that aren't already on this event
        const existingKeys = new Set((event?.divisions || []).map((d: any) => d.key));
        setSelectedImports(divs.filter((d: any) => !existingKeys.has(d.key)).map((d: any) => d._id));
      }
    } catch { /* ignore */ }
    setImportLoading(false);
  }

  function toggleImport(id: string) {
    setSelectedImports((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id],
    );
  }

  async function importDivisions() {
    setImportLoading(true);
    try {
      // Create event-scoped divisions based on selected league templates
      const selected = leagueDivisions.filter((d) => selectedImports.includes(d._id));
      let created = 0;
      for (const div of selected) {
        const res = await fetch(`/api/events/${id}/divisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: div.label,
            key: div.key,
            sport: div.sport,
            minAge: div.minAge,
            maxAge: div.maxAge,
            skillLevel: div.skillLevel,
            eventFormat: importFormat,
            bracketType: importBracketType,
            minPoolGamesPerTeam: parseInt(importMinGames) || 3,
            teamsAdvancingPerPool: parseInt(importAdvancing) || 2,
            estimatedTeamCount: parseInt(importEstTeams) || 8,
          }),
        });
        if (res.ok) created++;
      }
      if (created > 0) {
        await fetchEvent();
        setShowImportPanel(false);
      } else {
        alert("No new divisions were created — they may already exist on this event.");
      }
    } catch {
      alert("Failed to import divisions");
    }
    setImportLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!event) {
    return <div className="py-20 text-center text-muted-foreground">Event not found</div>;
  }

  const sc = statusConfig[event.status] ?? statusConfig.draft!;
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isMultiDay = startDate.toDateString() !== endDate.toDateString();
  const regClose = new Date(event.registrationClose);

  // Build schedule grid data
  const dayGames = games.filter((g) => g.dayIndex === selectedDay);
  const allFields: { locationName: string; field: string }[] = [];
  for (const loc of event.locations) {
    for (const f of loc.fields) {
      if (f) allFields.push({ locationName: loc.name, field: f });
    }
  }

  // Build time slots for the selected day
  const day = event.days[selectedDay];
  const timeSlots: string[] = [];
  if (day) {
    const [startH, startM] = (day.startTime || "08:00").split(":").map(Number);
    const [endH, endM] = (day.endTime || "18:00").split(":").map(Number);
    const startMin = (startH || 0) * 60 + (startM || 0);
    const endMin = (endH || 0) * 60 + (endM || 0);
    const slotDuration = (event.settings.gameDurationMinutes || 40) + (event.settings.timeBetweenGamesMinutes || 10);
    for (let t = startMin; t + (event.settings.gameDurationMinutes || 40) <= endMin; t += slotDuration) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      timeSlots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }

  // Map games to grid cells: key = `${field}|${timeSlot}`
  const gameGrid = new Map<string, GameData>();
  for (const g of dayGames) {
    gameGrid.set(`${g.field}|${g.timeSlot}`, g);
  }

  // Division color mapping for visual distinction
  const divColors = ["bg-blue-50 border-blue-200 text-blue-800", "bg-emerald-50 border-emerald-200 text-emerald-800", "bg-amber-50 border-amber-200 text-amber-800", "bg-purple-50 border-purple-200 text-purple-800", "bg-rose-50 border-rose-200 text-rose-800", "bg-cyan-50 border-cyan-200 text-cyan-800"];
  const divColorMap = new Map<string, string>();
  event.divisions.forEach((d, i) => {
    divColorMap.set(d._id, divColors[i % divColors.length]!);
  });

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Eye },
    { key: "registrations" as const, label: "Registrations", icon: ClipboardList },
    { key: "schedule" as const, label: "Schedule", icon: CalendarDays },
    { key: "brackets" as const, label: "Brackets", icon: GitBranch },
    { key: "divisions" as const, label: "Divisions", icon: Layers },
    { key: "settings" as const, label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" asChild className="mt-1">
            <Link href="/events"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <Input
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-2xl font-bold h-auto py-0 border-blue-300"
                />
              ) : (
                <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
              )}
              <Badge variant={sc.variant}>{sc.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {editing ? (
                <select value={editForm.type || event.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="rounded border border-input bg-background px-2 py-0.5 text-sm">
                  <option value="tournament">Tournament</option>
                  <option value="league_season">League Season</option>
                  <option value="showcase">Showcase</option>
                  <option value="camp">Camp</option>
                </select>
              ) : (
                <>{typeLabels[event.type]} · {event.sport === "7v7_football" ? "7v7 Football" : "Basketball"}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && !editing && (
            <Button variant="outline" size="sm" className="gap-1" onClick={startEditing}>
              <Pencil className="h-3 w-3" /> Edit Event
            </Button>
          )}
          {editing && (
            <>
              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={saveEdits} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save Changes
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>Cancel</Button>
            </>
          )}
          {["in_progress", "registration_closed", "registration_open"].includes(event.status) && (
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href={`/events/${event._id}/checkin`}>
                <ScanLine className="h-3 w-3" /> Check-In
              </Link>
            </Button>
          )}
          {event.registrationCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href={`/events/${event._id}/qrcodes`}>
                <QrCode className="h-3 w-3" /> QR Codes
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={generateSchedule}
            disabled={generating || event.divisions.length === 0}
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? "Generating..." : "AI Schedule"}
          </Button>
          {sc.next && (
            <Button
              onClick={() => updateStatus(sc.next!)}
              disabled={updating}
              className="gap-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {sc.nextLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Poster */}
      {event.posterUrl ? (
        <div className="relative h-48 overflow-hidden rounded-xl sm:h-56">
          <img src={event.posterUrl} alt={event.name} className="h-full w-full object-cover" />
          <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80">
            <Upload className="h-3 w-3" />
            Change Poster
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPoster(f); }} />
          </label>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 py-10 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Image className="h-10 w-10 text-muted-foreground/40" />
              <span className="mt-2 text-sm font-medium text-muted-foreground">Upload Event Poster</span>
              <span className="text-xs text-muted-foreground/70">JPEG, PNG, WebP up to 5MB</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPoster(f); }} />
        </label>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarDays className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-semibold">
                {format(startDate, "MMM d")}{isMultiDay && ` - ${format(endDate, "MMM d")}`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Teams</p>
              <p className="text-sm font-semibold">{event.registrationCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GitBranch className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Games</p>
              <p className="text-sm font-semibold">{games.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Fee</p>
              <p className="text-sm font-semibold">
                {event.pricing.amount > 0 ? `$${(event.pricing.amount / 100).toFixed(2)}` : "Free"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? "border-blue-600 text-blue-700" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === "schedule" && games.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{games.length}</span>
              )}
              {tab.key === "registrations" && registrations.length > 0 && (
                <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">{registrations.length}</span>
              )}
              {tab.key === "brackets" && brackets.length > 0 && (
                <span className="ml-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">{brackets.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* About / Description */}
            <Card>
              <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Event description..."
                    rows={4}
                  />
                ) : event.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Locations */}
            <Card>
              <CardHeader><CardTitle className="text-base">Locations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <div className="space-y-3">
                    {(editForm.locations || []).map((loc: any, i: number) => (
                      <div key={i} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">Location {i + 1}</Label>
                          <button type="button" onClick={() => {
                            const locs = [...editForm.locations];
                            locs.splice(i, 1);
                            setEditForm({ ...editForm, locations: locs });
                          }} className="text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={loc.name} onChange={(e) => {
                            const locs = [...editForm.locations];
                            locs[i] = { ...locs[i], name: e.target.value };
                            setEditForm({ ...editForm, locations: locs });
                          }} placeholder="Location name" />
                          <Input value={loc.address || ""} onChange={(e) => {
                            const locs = [...editForm.locations];
                            locs[i] = { ...locs[i], address: e.target.value };
                            setEditForm({ ...editForm, locations: locs });
                          }} placeholder="Address" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={loc.city || ""} onChange={(e) => {
                            const locs = [...editForm.locations];
                            locs[i] = { ...locs[i], city: e.target.value };
                            setEditForm({ ...editForm, locations: locs });
                          }} placeholder="City" />
                          <Input value={loc.state || ""} onChange={(e) => {
                            const locs = [...editForm.locations];
                            locs[i] = { ...locs[i], state: e.target.value };
                            setEditForm({ ...editForm, locations: locs });
                          }} placeholder="State" />
                        </div>
                        <div>
                          <Label className="text-xs">Fields (comma-separated)</Label>
                          <Input value={loc.fieldsText ?? (loc.fields || []).join(", ")} onChange={(e) => {
                            const locs = [...editForm.locations];
                            locs[i] = { ...locs[i], fieldsText: e.target.value };
                            setEditForm({ ...editForm, locations: locs });
                          }} placeholder="Field 1, Field 2, Field 3" />
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                      setEditForm({ ...editForm, locations: [...(editForm.locations || []), { name: "", address: "", city: "", state: "", fields: [] }] });
                    }}>
                      <Plus className="h-3 w-3" /> Add Location
                    </Button>
                  </div>
                ) : event.locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No locations added yet.</p>
                ) : (
                  event.locations.map((loc, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{loc.name}</p>
                          {loc.address && (
                            <p className="text-xs text-muted-foreground">
                              {loc.address}{loc.city && `, ${loc.city}`}{loc.state && `, ${loc.state}`}
                            </p>
                          )}
                          {loc.fields.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {loc.fields.filter(Boolean).map((f, fi) => (
                                <Badge key={fi} variant="outline" className="text-xs">{f}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Event Days */}
            {editing && (
              <Card>
                <CardHeader><CardTitle className="text-base">Event Days</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(editForm.days || []).map((d: any, i: number) => (
                    <div key={i} className="flex items-end gap-2 rounded-lg border p-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Input type="date" value={d.date?.split("T")[0] || ""} onChange={(e) => {
                          const days = [...editForm.days];
                          days[i] = { ...days[i], date: e.target.value };
                          setEditForm({ ...editForm, days });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start</Label>
                        <Input type="time" value={d.startTime || ""} onChange={(e) => {
                          const days = [...editForm.days];
                          days[i] = { ...days[i], startTime: e.target.value };
                          setEditForm({ ...editForm, days });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End</Label>
                        <Input type="time" value={d.endTime || ""} onChange={(e) => {
                          const days = [...editForm.days];
                          days[i] = { ...days[i], endTime: e.target.value };
                          setEditForm({ ...editForm, days });
                        }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input value={d.label || ""} onChange={(e) => {
                          const days = [...editForm.days];
                          days[i] = { ...days[i], label: e.target.value };
                          setEditForm({ ...editForm, days });
                        }} placeholder={`Day ${i + 1}`} />
                      </div>
                      <button type="button" onClick={() => {
                        const days = [...editForm.days];
                        days.splice(i, 1);
                        setEditForm({ ...editForm, days });
                      }} className="mb-1 text-red-500 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                    setEditForm({ ...editForm, days: [...(editForm.days || []), { date: "", startTime: "08:00", endTime: "18:00", label: "" }] });
                  }}>
                    <Plus className="h-3 w-3" /> Add Day
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tiebreaker Rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Tiebreaker Rules</CardTitle>
                  {event.tiebreakerLocked && <Badge variant="outline" className="text-xs">Locked by League</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <TiebreakerEditor
                    rules={editForm.tiebreakerRules || []}
                    onChange={(rules) => setEditForm({ ...editForm, tiebreakerRules: rules })}
                    locked={event.tiebreakerLocked}
                  />
                ) : event.tiebreakerRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tiebreaker rules configured. Click <strong>Edit Event</strong> to set up the tiebreaker formula.</p>
                ) : (
                  <ol className="space-y-2">
                    {event.tiebreakerRules.sort((a, b) => a.priority - b.priority).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{r.priority}</span>
                        <div>
                          <span className="font-medium">{r.rule}</span>
                          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Registration & Pricing */}
            <Card>
              <CardHeader><CardTitle className="text-base">Registration & Pricing</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Event Start Date</Label>
                        <Input type="date" value={editForm.startDate || ""} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Event End Date</Label>
                        <Input type="date" value={editForm.endDate || ""} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Registration Opens</Label>
                        <Input type="date" value={editForm.registrationOpen || ""} onChange={(e) => setEditForm({ ...editForm, registrationOpen: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Registration Closes</Label>
                        <Input type="date" value={editForm.registrationClose || ""} onChange={(e) => setEditForm({ ...editForm, registrationClose: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Roster Lock Date</Label>
                      <Input type="date" value={editForm.rosterLockDate || ""} onChange={(e) => setEditForm({ ...editForm, rosterLockDate: e.target.value })} />
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Registration Fee ($)</Label>
                        <Input type="number" min="0" step="0.01" value={editForm.pricing?.amount ?? "0.00"} onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, amount: e.target.value } })} />
                        <p className="text-[10px] text-muted-foreground">e.g. 50.00 for $50</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Early Bird Fee ($)</Label>
                          <Input type="number" min="0" step="0.01" value={editForm.pricing?.earlyBirdAmount || ""} onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, earlyBirdAmount: e.target.value } })} placeholder="Optional" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Early Bird Deadline</Label>
                          <Input type="date" value={editForm.pricing?.earlyBirdDeadline || ""} onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, earlyBirdDeadline: e.target.value } })} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Refund Policy</Label>
                        <Input value={editForm.pricing?.refundPolicy || ""} onChange={(e) => setEditForm({ ...editForm, pricing: { ...editForm.pricing, refundPolicy: e.target.value } })} placeholder="e.g. Full refund until 7 days before event" />
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Contact Email</Label>
                        <Input type="email" value={editForm.contactEmail || ""} onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })} placeholder="events@example.com" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contact Phone</Label>
                        <Input value={editForm.contactPhone || ""} onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })} placeholder="(555) 123-4567" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opens</span>
                      <span className="font-medium">{format(new Date(event.registrationOpen), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Closes</span>
                      <span className="font-medium">{format(regClose, "MMM d, yyyy")}</span>
                    </div>
                    {event.rosterLockDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Roster Lock</span>
                        <span className="font-medium">{format(new Date(event.rosterLockDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-medium">{event.pricing.amount > 0 ? `$${(event.pricing.amount / 100).toFixed(2)}` : "Free"}</span>
                    </div>
                    {event.pricing.earlyBirdAmount && event.pricing.earlyBirdDeadline && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Early Bird</span>
                        <span className="font-medium">${(event.pricing.earlyBirdAmount / 100).toFixed(2)} until {format(new Date(event.pricing.earlyBirdDeadline), "MMM d")}</span>
                      </div>
                    )}
                    {event.contactEmail && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{event.contactEmail}</span>
                      </div>
                    )}
                    {event.contactPhone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone</span>
                        <span className="font-medium">{event.contactPhone}</span>
                      </div>
                    )}
                    {event.pricing.multiTeamDiscounts && event.pricing.multiTeamDiscounts.length > 0 && (
                      <div className="border-t pt-2">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Multi-Team Discounts</p>
                        {event.pricing.multiTeamDiscounts.map((d, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span>{d.minTeams}+ teams</span>
                            <span className="font-medium text-green-700">
                              {d.discountPercent ? `${d.discountPercent}% off` : d.discountAmountPerTeam ? `$${(d.discountAmountPerTeam / 100).toFixed(0)} off/team` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
            {!editing && (
              <Card>
                <CardHeader><CardTitle className="text-base">Divisions</CardTitle></CardHeader>
                <CardContent>
                  {event.divisions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No divisions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {event.divisions.map((d) => (
                        <div key={d._id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                          <span className="font-medium">{d.label}</span>
                          {d.skillLevel && <Badge variant="outline" className="text-xs">{d.skillLevel}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── SCHEDULE TAB ─── */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {event.days.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedDay === i ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {d.label || `Day ${i + 1}`}
                  <span className="text-xs opacity-75">{format(new Date(d.date), "MMM d")}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="all">All Divisions</option>
                {event.divisions.map((d) => (
                  <option key={d._id} value={d._id}>{d.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={showEndTimes} onChange={(e) => setShowEndTimes(e.target.checked)} className="h-3 w-3" />
                End times
              </label>
            </div>
          </div>

          {games.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold">No games scheduled</h3>
                <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                  Add divisions, then click "AI Schedule" to automatically generate a game schedule across your fields and days.
                </p>
                <Button
                  className="mt-6 gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={generateSchedule}
                  disabled={generating || event.divisions.length === 0}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate Schedule with AI
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* ─── Schedule Grid ─── */
            <div className="overflow-x-auto rounded-xl border">
              <div className="min-w-[600px]">
                {/* Header row: field names */}
                <div className="flex border-b bg-muted/50">
                  <div className="w-20 shrink-0 border-r p-2 text-center">
                    <span className="text-xs font-semibold text-muted-foreground">Time</span>
                  </div>
                  {allFields.map((f, i) => (
                    <div key={i} className="flex-1 border-r p-2 text-center last:border-r-0">
                      <p className="text-xs font-bold">{f.field}</p>
                      <p className="text-[10px] text-muted-foreground">{f.locationName}</p>
                    </div>
                  ))}
                </div>

                {/* Time slot rows */}
                {timeSlots.map((ts) => {
                  const gameDur = event.settings.gameDurationMinutes || 40;
                  const [tsH, tsM] = ts.split(":").map(Number);
                  const endTotalMin = (tsH || 0) * 60 + (tsM || 0) + gameDur;
                  const endTimeStr = `${Math.floor(endTotalMin / 60).toString().padStart(2, "0")}:${(endTotalMin % 60).toString().padStart(2, "0")}`;

                  return (
                    <div key={ts} className="flex border-b last:border-b-0 hover:bg-muted/20">
                      <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r py-3">
                        <span className="text-sm font-bold">{ts}</span>
                        {showEndTimes && (
                          <span className="text-[10px] text-muted-foreground">{endTimeStr}</span>
                        )}
                      </div>
                      {allFields.map((f, fi) => {
                        const game = gameGrid.get(`${f.field}|${ts}`);
                        const divColor = game ? (divColorMap.get(game.divisionId) || "") : "";

                        return (
                          <div key={fi} className="flex-1 border-r p-1.5 last:border-r-0">
                            {game ? (
                              <button
                                type="button"
                                onClick={() => setSelectedGame(game)}
                                className={`w-full rounded-lg border p-2 text-left transition-all hover:shadow-md ${divColor}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold opacity-60">#{game.gameNumber}</span>
                                  <div className="flex items-center gap-1">
                                    {game.round && game.round !== "Pool Play" && (
                                      <Badge variant="outline" className="h-4 border-amber-500 px-1 text-[9px] text-amber-700">
                                        {game.round}
                                      </Badge>
                                    )}
                                    {game.status === "completed" ? (
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">Final</Badge>
                                    ) : game.status === "in_progress" ? (
                                      <Badge variant="default" className="h-4 px-1 text-[9px]">Live</Badge>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="mt-1 space-y-0.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="truncate font-medium">{game.homeTeamName}</span>
                                    {game.homeScore !== undefined && (
                                      <span className="ml-1 font-bold">{game.homeScore}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="truncate font-medium">{game.awayTeamName}</span>
                                    {game.awayScore !== undefined && (
                                      <span className="ml-1 font-bold">{game.awayScore}</span>
                                    )}
                                  </div>
                                </div>
                                {game.round === "Pool Play" && (
                                  <p className="mt-1 text-[10px] opacity-50">Pool Play</p>
                                )}
                              </button>
                            ) : (
                              <div className="flex h-full min-h-[60px] items-center justify-center rounded-lg border border-dashed border-transparent">
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Division Legend */}
          {games.length > 0 && event.divisions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.divisions.map((d) => {
                const color = divColorMap.get(d._id) || "";
                return (
                  <span key={d._id} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
                    {d.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── DIVISIONS TAB ─── */}
      {activeTab === "divisions" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Divisions & Pools</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={openImportPanel}>
                  <Layers className="h-3 w-3" /> Import from League
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowDivForm(true)}>
                  <Plus className="h-3 w-3" /> Add Division
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showDivForm && (
              <div className="mb-4 space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <h4 className="text-sm font-semibold">New Division</h4>

                {/* Row 1: Identity */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Label (e.g. "10U D1")</Label>
                    <Input value={divForm.label} onChange={(e) => setDivForm({ ...divForm, label: e.target.value })} placeholder="10U D1" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Key (e.g. "10u_d1")</Label>
                    <Input value={divForm.key} onChange={(e) => setDivForm({ ...divForm, key: e.target.value })} placeholder="10u_d1" />
                  </div>
                </div>

                {/* Row 2: Age + Skill */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Age</Label>
                    <Input type="number" value={divForm.minAge} onChange={(e) => setDivForm({ ...divForm, minAge: e.target.value })} placeholder="7" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Age</Label>
                    <Input type="number" value={divForm.maxAge} onChange={(e) => setDivForm({ ...divForm, maxAge: e.target.value })} placeholder="10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Skill Level</Label>
                    <select value={divForm.skillLevel} onChange={(e) => setDivForm({ ...divForm, skillLevel: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="open">Open</option>
                      <option value="D1">D1 (Competitive)</option>
                      <option value="D2">D2 (Intermediate)</option>
                      <option value="D3">D3 (Recreational)</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Event Structure */}
                <div className="border-t pt-3">
                  <Label className="text-xs font-semibold">Event Structure</Label>
                  <p className="mb-2 text-[11px] text-muted-foreground">How this division plays out during the event</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Format</Label>
                      <select value={divForm.eventFormat} onChange={(e) => setDivForm({ ...divForm, eventFormat: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="round_robin">Round Robin Only</option>
                        <option value="pool_play_to_bracket">Pool Play then Bracket</option>
                        <option value="bracket_only">Bracket Only</option>
                      </select>
                    </div>
                    {divForm.eventFormat !== "round_robin" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Bracket Type</Label>
                        <select value={divForm.bracketType} onChange={(e) => setDivForm({ ...divForm, bracketType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="single_elimination">Single Elimination</option>
                          <option value="double_elimination">Double Elimination</option>
                          <option value="consolation">Consolation Bracket</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Pool Play Settings (if applicable) */}
                {divForm.eventFormat !== "bracket_only" && (
                  <div className="border-t pt-3">
                    <Label className="text-xs font-semibold">Pool Play Settings</Label>
                    <p className="mb-2 text-[11px] text-muted-foreground">Configure minimum games and advancement rules</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Min Games Per Team</Label>
                        <Input type="number" min="1" value={divForm.minPoolGamesPerTeam} onChange={(e) => setDivForm({ ...divForm, minPoolGamesPerTeam: e.target.value })} />
                        <p className="text-[10px] text-muted-foreground">With uneven teams, some may play an extra game</p>
                      </div>
                      {divForm.eventFormat === "pool_play_to_bracket" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Teams Advancing Per Pool</Label>
                          <Input type="number" min="1" value={divForm.teamsAdvancingPerPool} onChange={(e) => setDivForm({ ...divForm, teamsAdvancingPerPool: e.target.value })} />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Est. Teams</Label>
                        <Input type="number" min="2" value={divForm.estimatedTeamCount} onChange={(e) => setDivForm({ ...divForm, estimatedTeamCount: e.target.value })} />
                        <p className="text-[10px] text-muted-foreground">For AI schedule generation</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Row 5: Team Limits (bracket only gets estimated teams here) */}
                {divForm.eventFormat === "bracket_only" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Max Teams</Label>
                      <Input type="number" value={divForm.maxTeams} onChange={(e) => setDivForm({ ...divForm, maxTeams: e.target.value })} placeholder="No limit" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Est. Teams</Label>
                      <Input type="number" min="2" value={divForm.estimatedTeamCount} onChange={(e) => setDivForm({ ...divForm, estimatedTeamCount: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 border-t pt-3">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={createDivision}>Create Division</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDivForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Import from League Divisions Panel */}
            {showImportPanel && (
              <div className="mb-4 space-y-4 rounded-lg border border-green-200 bg-green-50/50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Import from League Divisions</h4>
                  <button type="button" onClick={() => setShowImportPanel(false)} className="rounded-full p-1 hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which league divisions to add to this event. Configure the event format and settings applied to all imported divisions.
                </p>

                {importLoading && leagueDivisions.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                  </div>
                ) : leagueDivisions.length === 0 ? (
                  <div className="rounded-md border bg-white p-4 text-center">
                    <p className="text-sm text-muted-foreground">No league divisions defined yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Go to <a href="/divisions" className="text-blue-600 underline">Divisions</a> to set up your league&apos;s standard age groups first.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Division Selection */}
                    <div>
                      <Label className="text-xs font-semibold">League Divisions</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {leagueDivisions.map((d) => {
                          const alreadyOnEvent = (event?.divisions || []).some((ed: any) => ed.key === d.key);
                          return (
                            <button
                              key={d._id}
                              type="button"
                              onClick={() => !alreadyOnEvent && toggleImport(d._id)}
                              disabled={alreadyOnEvent}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                alreadyOnEvent
                                  ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : selectedImports.includes(d._id)
                                    ? "border-green-600 bg-green-600 text-white"
                                    : "border-gray-300 bg-white text-gray-600 hover:border-green-400"
                              }`}
                            >
                              {d.label} ({d.minAge}-{d.maxAge})
                              {alreadyOnEvent && " (already added)"}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-1 flex gap-2">
                        <button type="button" onClick={() => {
                          const available = leagueDivisions.filter((d) => !(event?.divisions || []).some((ed: any) => ed.key === d.key));
                          setSelectedImports(available.map((d) => d._id));
                        }} className="text-[11px] text-green-700 underline">Select All Available</button>
                        <button type="button" onClick={() => setSelectedImports([])} className="text-[11px] text-gray-500 underline">Clear</button>
                      </div>
                    </div>

                    {/* Event Format (applied to all imported) */}
                    <div className="border-t pt-3">
                      <Label className="text-xs font-semibold">Event Format (applied to all)</Label>
                      <div className="mt-1 grid gap-3 sm:grid-cols-2">
                        <select value={importFormat} onChange={(e) => setImportFormat(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="round_robin">Round Robin Only</option>
                          <option value="pool_play_to_bracket">Pool Play then Bracket</option>
                          <option value="bracket_only">Bracket Only</option>
                        </select>
                        {importFormat !== "round_robin" && (
                          <select value={importBracketType} onChange={(e) => setImportBracketType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <option value="single_elimination">Single Elimination</option>
                            <option value="double_elimination">Double Elimination</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Pool / Bracket Settings */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      {importFormat !== "bracket_only" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Min Games Per Team</Label>
                          <Input type="number" min="1" value={importMinGames} onChange={(e) => setImportMinGames(e.target.value)} />
                        </div>
                      )}
                      {importFormat === "pool_play_to_bracket" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Teams Advancing Per Pool</Label>
                          <Input type="number" min="1" value={importAdvancing} onChange={(e) => setImportAdvancing(e.target.value)} />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Est. Teams Per Division</Label>
                        <Input type="number" min="2" value={importEstTeams} onChange={(e) => setImportEstTeams(e.target.value)} />
                      </div>
                    </div>

                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={importDivisions}
                        disabled={importLoading || selectedImports.length === 0}
                      >
                        {importLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Layers className="mr-1 h-3 w-3" />}
                        Import {selectedImports.length} Division{selectedImports.length !== 1 ? "s" : ""}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowImportPanel(false)}>Cancel</Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {event.divisions.length === 0 && !showDivForm && !showImportPanel ? (
              <div className="py-8 text-center">
                <Layers className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No divisions yet. Import from your league&apos;s divisions or add one manually.
                </p>
                <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openImportPanel}>
                  <Layers className="h-3 w-3" /> Import from League Divisions
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {event.divisions.map((d) => {
                  const divGames = games.filter((g) => g.divisionId === d._id);
                  const isEditingThis = editingDivId === d._id;

                  if (isEditingThis) {
                    return (
                      <div key={d._id} className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">Editing: {d.label}</h4>
                          <p className="text-xs text-muted-foreground">Ages {d.minAge}-{d.maxAge}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input value={divEditForm.label || ""} onChange={(e) => setDivEditForm({ ...divEditForm, label: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Format</Label>
                            <select value={divEditForm.eventFormat} onChange={(e) => setDivEditForm({ ...divEditForm, eventFormat: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                              <option value="round_robin">Round Robin Only</option>
                              <option value="pool_play_to_bracket">Pool Play then Bracket</option>
                              <option value="bracket_only">Bracket Only</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {divEditForm.eventFormat !== "round_robin" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Bracket Type</Label>
                              <select value={divEditForm.bracketType} onChange={(e) => setDivEditForm({ ...divEditForm, bracketType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="single_elimination">Single Elimination</option>
                                <option value="double_elimination">Double Elimination</option>
                              </select>
                            </div>
                          )}
                          {divEditForm.eventFormat !== "bracket_only" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Min Games/Team</Label>
                              <Input type="number" min="1" value={divEditForm.minPoolGamesPerTeam} onChange={(e) => setDivEditForm({ ...divEditForm, minPoolGamesPerTeam: e.target.value })} />
                            </div>
                          )}
                          {divEditForm.eventFormat === "pool_play_to_bracket" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Teams Advancing/Pool</Label>
                              <Input type="number" min="1" value={divEditForm.teamsAdvancingPerPool} onChange={(e) => setDivEditForm({ ...divEditForm, teamsAdvancingPerPool: e.target.value })} />
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label className="text-xs">Est. Teams</Label>
                            <Input type="number" min="2" value={divEditForm.estimatedTeamCount} onChange={(e) => setDivEditForm({ ...divEditForm, estimatedTeamCount: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Max Teams</Label>
                            <Input type="number" value={divEditForm.maxTeams || ""} onChange={(e) => setDivEditForm({ ...divEditForm, maxTeams: e.target.value })} placeholder="No limit" />
                          </div>
                        </div>
                        {/* Bracket Tiers — Gold/Silver/Bronze bracket split */}
                        {divEditForm.eventFormat !== "round_robin" && (
                          <div className="space-y-2 border-t pt-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Bracket Tiers</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => {
                                  const tiers = [...(divEditForm.bracketTiers || [])];
                                  const names = ["Gold", "Silver", "Bronze", "Copper", "Iron"];
                                  const nextName = names[tiers.length] || `Tier ${tiers.length + 1}`;
                                  tiers.push({ name: nextName, teamCount: 4, bracketType: "single_elimination" });
                                  setDivEditForm({ ...divEditForm, bracketTiers: tiers });
                                }}
                              >
                                <Plus className="h-3 w-3" /> Add Tier
                              </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Split this division into bracket tiers (e.g. Gold = top 6, Silver = next 4). Brackets will be pre-generated based on team counts.
                            </p>
                            {(divEditForm.bracketTiers || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground italic py-1">No tiers defined — all teams will share one bracket.</p>
                            ) : (
                              <div className="space-y-2">
                                {(divEditForm.bracketTiers || []).map((tier: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
                                    <Input
                                      className="h-8 w-24 text-sm font-medium"
                                      value={tier.name}
                                      onChange={(e) => {
                                        const tiers = [...divEditForm.bracketTiers];
                                        tiers[idx] = { ...tiers[idx], name: e.target.value };
                                        setDivEditForm({ ...divEditForm, bracketTiers: tiers });
                                      }}
                                      placeholder="Tier name"
                                    />
                                    <div className="flex items-center gap-1">
                                      <Input
                                        className="h-8 w-16 text-sm text-center"
                                        type="number"
                                        min="2"
                                        value={tier.teamCount}
                                        onChange={(e) => {
                                          const tiers = [...divEditForm.bracketTiers];
                                          tiers[idx] = { ...tiers[idx], teamCount: parseInt(e.target.value) || 2 };
                                          setDivEditForm({ ...divEditForm, bracketTiers: tiers });
                                        }}
                                      />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">teams</span>
                                    </div>
                                    <select
                                      className="h-8 rounded-md border bg-background px-2 text-xs"
                                      value={tier.bracketType}
                                      onChange={(e) => {
                                        const tiers = [...divEditForm.bracketTiers];
                                        tiers[idx] = { ...tiers[idx], bracketType: e.target.value };
                                        setDivEditForm({ ...divEditForm, bracketTiers: tiers });
                                      }}
                                    >
                                      <option value="single_elimination">Single Elim</option>
                                      <option value="double_elimination">Double Elim</option>
                                      <option value="consolation">Consolation</option>
                                    </select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 text-red-500 hover:text-red-700"
                                      onClick={() => {
                                        const tiers = divEditForm.bracketTiers.filter((_: any, i: number) => i !== idx);
                                        setDivEditForm({ ...divEditForm, bracketTiers: tiers });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                {(() => {
                                  const total = (divEditForm.bracketTiers || []).reduce((s: number, t: any) => s + (t.teamCount || 0), 0);
                                  const est = parseInt(divEditForm.estimatedTeamCount) || 0;
                                  return total > 0 && (
                                    <p className={`text-xs ${total === est ? "text-green-600" : total > est ? "text-red-500" : "text-amber-600"}`}>
                                      {total} teams across tiers {est > 0 ? `(${est} estimated)` : ""}
                                      {total === est && " ✓"}
                                      {total > est && est > 0 && " — exceeds estimated count"}
                                    </p>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 border-t pt-3">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={saveDivEdit} disabled={divSaving}>
                            {divSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingDivId(null)}>Cancel</Button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={d._id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{d.label}</h4>
                          <p className="text-xs text-muted-foreground">
                            Ages {d.minAge}-{d.maxAge}
                            {d.skillLevel && ` · ${d.skillLevel}`}
                            {" · "}
                            {d.eventFormat === "pool_play_to_bracket" ? "Pool Play → Bracket" : d.eventFormat === "bracket_only" ? "Bracket Only" : "Round Robin"}
                            {d.estimatedTeamCount ? ` · ~${d.estimatedTeamCount} teams` : ""}
                            {" · "}{divGames.length} games
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEditDiv(d)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => deleteDivision(d._id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {d.pools.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {d.pools.map((p: any, pi: number) => (
                            <Badge key={pi} variant="secondary">{p.name}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── REGISTRATIONS TAB ─── */}
      {activeTab === "registrations" && (
        <div className="space-y-4">
          {/* Status filters */}
          <div className="flex items-center gap-2">
            {(["all", "pending", "approved", "rejected", "waitlisted", "withdrawn"] as const).map((s) => {
              const count = s === "all" ? registrations.length : registrations.filter((r) => r.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRegStatusFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    regStatusFilter === s
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {registrations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-lg font-medium">No registrations yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Teams will appear here once they register for this event.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {registrations
                .filter((r) => regStatusFilter === "all" || r.status === regStatusFilter)
                .map((reg) => {
                  const div = event.divisions.find((d) => d._id === reg.divisionId);
                  return (
                    <Card key={reg._id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{reg.teamName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{div?.label || "Unknown Division"}</span>
                              <span>·</span>
                              <span>{reg.roster.length} players</span>
                              <span>·</span>
                              <span>{format(new Date(reg.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            reg.paymentStatus === "paid" ? "default" :
                            reg.paymentStatus === "partial" ? "outline" : "secondary"
                          }>
                            {reg.paymentStatus}
                          </Badge>
                          <Badge variant={
                            reg.status === "approved" ? "default" :
                            reg.status === "pending" ? "outline" :
                            reg.status === "rejected" ? "destructive" : "secondary"
                          }>
                            {reg.status}
                          </Badge>
                          {reg.status === "pending" && (
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                                onClick={() => updateRegistration(reg._id, "approved")}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                onClick={() => updateRegistration(reg._id, "rejected")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {reg.status === "approved" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => updateRegistration(reg._id, "withdrawn")}
                            >
                              Withdraw
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── BRACKETS TAB ─── */}
      {activeTab === "brackets" && (
        <div className="space-y-6">
          {/* Division selector for creating brackets */}
          {event.divisions.filter((d) => d.eventFormat === "bracket_only" || d.eventFormat === "pool_play_to_bracket").length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <GitBranch className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <h3 className="mt-3 text-lg font-medium">No bracket divisions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure a division with "Bracket Only" or "Pool Play to Bracket" format to create brackets.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Create bracket controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Generate Brackets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">Division</Label>
                      <select
                        value={selectedBracketDiv}
                        onChange={(e) => setSelectedBracketDiv(e.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select division...</option>
                        {event.divisions
                          .filter((d) => d.eventFormat === "bracket_only" || d.eventFormat === "pool_play_to_bracket")
                          .map((d) => (
                            <option key={d._id} value={d._id}>
                              {d.label} — {d.eventFormat === "bracket_only" ? "Bracket Only" : "Pool Play → Bracket"}
                              {brackets.find((b) => b.divisionId === d._id) ? " (has bracket)" : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                    <Button
                      onClick={() => selectedBracketDiv && createBracket(selectedBracketDiv)}
                      disabled={!selectedBracketDiv || creatingBracket}
                      className="gap-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {creatingBracket ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                      {brackets.find((b) => b.divisionId === selectedBracketDiv) ? "Regenerate" : "Create"} Bracket
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Brackets are seeded from approved registrations. For pool play → bracket, create the bracket after pool play is complete.
                  </p>
                </CardContent>
              </Card>

              {/* Bracket visualizations */}
              {brackets.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <GitBranch className="mx-auto h-10 w-10 text-muted-foreground/50" />
                    <h3 className="mt-3 text-lg font-medium">No brackets created</h3>
                    <p className="text-sm text-muted-foreground mt-1">Select a division above and generate a bracket.</p>
                  </CardContent>
                </Card>
              ) : (
                brackets.map((bracket) => {
                  const div = event.divisions.find((d) => d._id === bracket.divisionId);
                  // Group matches by round
                  const roundMap = new Map<number, BracketMatch[]>();
                  for (const m of bracket.matches) {
                    const list = roundMap.get(m.round) || [];
                    list.push(m);
                    roundMap.set(m.round, list);
                  }
                  const rounds = [...roundMap.entries()].sort((a, b) => a[0] - b[0]);

                  // Round labels
                  const winnersRoundCount = Math.ceil(Math.log2(Math.max((rounds[0]?.[1]?.length || 1) * 2, 2)));
                  const getRoundLabel = (round: number) => {
                    if (bracket.type === "double_elimination" && round > winnersRoundCount) {
                      const lr = round - winnersRoundCount;
                      if (lr === winnersRoundCount * 2 - 1) return "Grand Final";
                      if (lr === winnersRoundCount * 2) return "Reset";
                      return `Losers R${lr}`;
                    }
                    if (round === winnersRoundCount) return "Final";
                    if (round === winnersRoundCount - 1) return "Semifinal";
                    if (round === winnersRoundCount - 2 && winnersRoundCount >= 3) return "Quarterfinal";
                    return `Round ${round}`;
                  };

                  return (
                    <Card key={bracket._id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{bracket.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {div?.label || "Unknown"} · {bracket.type.replace(/_/g, " ")} · {bracket.matches.length} matches
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            bracket.status === "completed" ? "default" :
                            bracket.status === "in_progress" ? "outline" : "secondary"
                          }>
                            {bracket.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500"
                            onClick={() => deleteBracket(bracket._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Horizontal bracket tree */}
                        <div className="overflow-x-auto pb-4">
                          <div className="flex gap-8" style={{ minWidth: rounds.length * 200 }}>
                            {rounds.map(([round, matches]) => (
                              <div key={round} className="flex flex-col" style={{ minWidth: 180 }}>
                                <h4 className="mb-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  {getRoundLabel(round)}
                                </h4>
                                <div className="flex flex-1 flex-col justify-around gap-4">
                                  {matches.map((match) => {
                                    const isScoring = scoringMatch?.bracketId === bracket._id && scoringMatch?.matchNumber === match.matchNumber;
                                    const canScore = match.homeTeamName && match.awayTeamName &&
                                      match.homeTeamName !== "TBD" && match.awayTeamName !== "TBD" &&
                                      match.homeTeamName !== "BYE" && match.awayTeamName !== "BYE" &&
                                      match.status !== "completed";

                                    return (
                                      <div key={match.matchNumber} className="rounded-lg border bg-card shadow-sm">
                                        {/* Match number */}
                                        <div className="flex items-center justify-between border-b px-2 py-1">
                                          <span className="text-[10px] text-muted-foreground">Match {match.matchNumber}</span>
                                          {match.status === "completed" && (
                                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">Final</Badge>
                                          )}
                                        </div>

                                        {isScoring ? (
                                          <div className="p-2 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs truncate flex-1">{match.homeTeamName || "TBD"}</span>
                                              <Input
                                                type="number"
                                                min="0"
                                                value={matchHomeScore}
                                                onChange={(e) => setMatchHomeScore(e.target.value)}
                                                className="w-14 h-7 text-center text-xs"
                                                placeholder="-"
                                              />
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs truncate flex-1">{match.awayTeamName || "TBD"}</span>
                                              <Input
                                                type="number"
                                                min="0"
                                                value={matchAwayScore}
                                                onChange={(e) => setMatchAwayScore(e.target.value)}
                                                className="w-14 h-7 text-center text-xs"
                                                placeholder="-"
                                              />
                                            </div>
                                            <div className="flex gap-1 justify-end">
                                              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setScoringMatch(null)}>
                                                Cancel
                                              </Button>
                                              <Button
                                                size="sm"
                                                className="h-6 text-xs bg-purple-600 hover:bg-purple-700"
                                                disabled={!matchHomeScore || !matchAwayScore || matchHomeScore === matchAwayScore}
                                                onClick={() => reportMatchResult(
                                                  bracket._id,
                                                  match.matchNumber,
                                                  parseInt(matchHomeScore),
                                                  parseInt(matchAwayScore),
                                                )}
                                              >
                                                Save
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            className="w-full text-left"
                                            disabled={!canScore}
                                            onClick={() => {
                                              if (canScore) {
                                                setScoringMatch({ bracketId: bracket._id, matchNumber: match.matchNumber });
                                                setMatchHomeScore(match.homeScore?.toString() || "");
                                                setMatchAwayScore(match.awayScore?.toString() || "");
                                              }
                                            }}
                                          >
                                            {/* Home team */}
                                            <div className={`flex items-center justify-between px-2 py-1.5 text-xs ${
                                              match.status === "completed" && match.homeScore !== undefined && match.awayScore !== undefined
                                                ? match.homeScore > match.awayScore ? "bg-green-50 font-bold" : "text-muted-foreground"
                                                : ""
                                            }`}>
                                              <span className="truncate">
                                                {match.homeTeamName || <span className="italic text-muted-foreground">TBD</span>}
                                              </span>
                                              {match.homeScore !== undefined && (
                                                <span className="ml-2 font-bold tabular-nums">{match.homeScore}</span>
                                              )}
                                            </div>

                                            {/* Divider */}
                                            <div className="border-t" />

                                            {/* Away team */}
                                            <div className={`flex items-center justify-between px-2 py-1.5 text-xs ${
                                              match.status === "completed" && match.homeScore !== undefined && match.awayScore !== undefined
                                                ? match.awayScore > match.homeScore ? "bg-green-50 font-bold" : "text-muted-foreground"
                                                : ""
                                            }`}>
                                              <span className="truncate">
                                                {match.awayTeamName || <span className="italic text-muted-foreground">TBD</span>}
                                              </span>
                                              {match.awayScore !== undefined && (
                                                <span className="ml-2 font-bold tabular-nums">{match.awayScore}</span>
                                              )}
                                            </div>
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </div>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Game Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Game Duration (min)</Label>
                      <Input type="number" min="1" value={editForm.settings?.gameDurationMinutes ?? 40} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, gameDurationMinutes: parseInt(e.target.value) || 40 } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Half Duration (min)</Label>
                      <Input type="number" min="1" value={editForm.settings?.halfDurationMinutes ?? 20} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, halfDurationMinutes: parseInt(e.target.value) || 20 } })} />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Time Between Games (min)</Label>
                      <Input type="number" min="0" value={editForm.settings?.timeBetweenGamesMinutes ?? 10} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, timeBetweenGamesMinutes: parseInt(e.target.value) || 10 } })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clock Type</Label>
                      <select value={editForm.settings?.clockType || "running"} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, clockType: e.target.value } })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="running">Running Clock</option>
                        <option value="stop">Stop Clock</option>
                        <option value="mixed">Mixed (Running, Stop final 2 min)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Max Roster Size</Label>
                      <Input type="number" min="1" value={editForm.settings?.maxRosterSize || ""} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, maxRosterSize: parseInt(e.target.value) || undefined } })} placeholder="No limit" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min Roster Size</Label>
                      <Input type="number" min="1" value={editForm.settings?.minRosterSize || ""} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, minRosterSize: parseInt(e.target.value) || undefined } })} placeholder="No minimum" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Game Duration</span><span className="font-medium">{event.settings.gameDurationMinutes} min</span></div>
                  {event.settings.halfDurationMinutes && <div className="flex justify-between"><span className="text-muted-foreground">Half Duration</span><span className="font-medium">{event.settings.halfDurationMinutes} min</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">Time Between Games</span><span className="font-medium">{event.settings.timeBetweenGamesMinutes} min</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Clock Type</span><span className="font-medium">{clockLabels[event.settings.clockType] || event.settings.clockType}</span></div>
                  {event.settings.maxRosterSize && <div className="flex justify-between"><span className="text-muted-foreground">Max Roster Size</span><span className="font-medium">{event.settings.maxRosterSize} players</span></div>}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {editing ? (
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-muted-foreground">Age Verification</span>
                    <input type="checkbox" checked={editForm.settings?.requireAgeVerification ?? true} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, requireAgeVerification: e.target.checked } })} className="h-4 w-4 rounded" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-muted-foreground">Waiver Required</span>
                    <input type="checkbox" checked={editForm.settings?.requireWaiver ?? true} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, requireWaiver: e.target.checked } })} className="h-4 w-4 rounded" />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-muted-foreground">Allow Multi-Team Players</span>
                    <input type="checkbox" checked={editForm.settings?.allowMultiTeamPlayers ?? false} onChange={(e) => setEditForm({ ...editForm, settings: { ...editForm.settings, allowMultiTeamPlayers: e.target.checked } })} className="h-4 w-4 rounded" />
                  </label>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age Verification</span>
                    <Badge variant={event.settings.requireAgeVerification ? "default" : "secondary"}>
                      {event.settings.requireAgeVerification ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Waiver</span>
                    <Badge variant={event.settings.requireWaiver ? "default" : "secondary"}>
                      {event.settings.requireWaiver ? "Required" : "Not Required"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── GAME DETAIL MODAL ─── */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          division={event.divisions.find((d) => d._id === selectedGame.divisionId)}
          onClose={() => setSelectedGame(null)}
          onSaveScore={updateGameScore}
        />
      )}
    </div>
  );
}

// ─── Game Detail Modal ───

function GameDetailModal({
  game,
  division,
  onClose,
  onSaveScore,
}: {
  game: GameData;
  division?: DivisionInfo;
  onClose: () => void;
  onSaveScore: (gameId: string, homeScore: number, awayScore: number) => void;
}) {
  const [homeScore, setHomeScore] = useState(game.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(game.awayScore?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSaveScore(game._id, parseInt(homeScore) || 0, parseInt(awayScore) || 0);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="text-lg font-bold">Game #{game.gameNumber}</h3>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {division?.label} · {game.field}
              </p>
              <Badge variant={game.round && game.round !== "Pool Play" ? "default" : "secondary"} className="text-[10px]">
                {game.round || "Pool Play"}
              </Badge>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Matchup */}
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{format(new Date(game.scheduledAt), "MMM d, yyyy")}</span>
            <span>{game.timeSlot}</span>
          </div>

          <div className="space-y-3">
            {/* Home Team */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{game.homeTeamName}</p>
                <p className="text-xs text-muted-foreground">Home</p>
              </div>
              <Input
                type="number"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-20 text-center text-lg font-bold"
                placeholder="-"
              />
            </div>

            <div className="text-center text-xs font-bold text-muted-foreground">VS</div>

            {/* Away Team */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{game.awayTeamName}</p>
                <p className="text-xs text-muted-foreground">Away</p>
              </div>
              <Input
                type="number"
                min="0"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-20 text-center text-lg font-bold"
                placeholder="-"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{game.locationName} - {game.field}</span>
            <Badge variant={game.status === "completed" ? "secondary" : game.status === "in_progress" ? "default" : "outline"}>
              {game.status}
            </Badge>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="gap-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trophy className="h-3 w-3" />}
            Save Score & Complete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tiebreaker Editor Component ───

function TiebreakerEditor({
  rules,
  onChange,
  locked,
}: {
  rules: { priority: number; rule: string; description?: string }[];
  onChange: (rules: { priority: number; rule: string; description?: string }[]) => void;
  locked: boolean;
}) {
  // Available rules = common ones not already in the list
  const usedRules = new Set(rules.map((r) => r.rule));
  const available = COMMON_TIEBREAKERS.filter((t) => !usedRules.has(t.rule));

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...rules];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    onChange(next.map((r, i) => ({ ...r, priority: i + 1 })));
  }

  function moveDown(idx: number) {
    if (idx >= rules.length - 1) return;
    const next = [...rules];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    onChange(next.map((r, i) => ({ ...r, priority: i + 1 })));
  }

  function removeRule(idx: number) {
    const next = rules.filter((_, i) => i !== idx);
    onChange(next.map((r, i) => ({ ...r, priority: i + 1 })));
  }

  function addRule(rule: string, description: string) {
    onChange([...rules, { priority: rules.length + 1, rule, description }]);
  }

  function addCustomRule() {
    onChange([
      ...rules,
      { priority: rules.length + 1, rule: "Custom rule", description: "" },
    ]);
  }

  function updateRule(idx: number, field: "rule" | "description", value: string) {
    const next = [...rules];
    next[idx] = { ...next[idx]!, [field]: value };
    onChange(next);
  }

  if (locked) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
          Tiebreaker rules are locked by the league and cannot be edited for this event.
        </p>
        <ol className="space-y-2">
          {rules.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                {r.priority}
              </span>
              <div>
                <span className="font-medium">{r.rule}</span>
                {r.description && (
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Drag to reorder. Tiebreakers are applied top-to-bottom — the first rule that breaks the tie wins.
      </p>

      {/* Active rules list */}
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No tiebreaker rules yet. Add rules below to define how ties are resolved.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rules.map((r, idx) => {
            const isCustom = !COMMON_TIEBREAKERS.some((t) => t.rule === r.rule);
            return (
              <div
                key={idx}
                className="group flex items-center gap-1.5 rounded-lg border bg-white px-2 py-2 hover:border-blue-200 transition-colors"
              >
                {/* Grip + priority number */}
                <div className="flex items-center gap-1 shrink-0">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                    {idx + 1}
                  </span>
                </div>

                {/* Rule content */}
                <div className="flex-1 min-w-0">
                  {isCustom ? (
                    <div className="space-y-1">
                      <Input
                        value={r.rule}
                        onChange={(e) => updateRule(idx, "rule", e.target.value)}
                        className="h-7 text-sm font-medium"
                        placeholder="Rule name"
                      />
                      <Input
                        value={r.description || ""}
                        onChange={(e) => updateRule(idx, "description", e.target.value)}
                        className="h-6 text-xs"
                        placeholder="Description (optional)"
                      />
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-medium">{r.rule}</span>
                      {r.description && (
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {r.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Move & remove buttons */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={idx === 0}
                    onClick={() => moveUp(idx)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={idx === rules.length - 1}
                    onClick={() => moveDown(idx)}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeRule(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add rule section */}
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Add tiebreaker
        </p>
        <div className="flex flex-wrap gap-1.5">
          {available.map((t) => (
            <button
              key={t.rule}
              type="button"
              onClick={() => addRule(t.rule, t.description)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              title={t.description}
            >
              <Plus className="h-3 w-3" />
              {t.rule}
            </button>
          ))}
          <button
            type="button"
            onClick={addCustomRule}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Custom rule...
          </button>
        </div>
      </div>
    </div>
  );
}
