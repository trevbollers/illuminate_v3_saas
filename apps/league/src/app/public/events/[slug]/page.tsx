"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Calendar,
  MapPin,
  Trophy,
  Clock,
  Loader2,
  Users,
  BarChart3,
  GitBranch,
  Share2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface EventData {
  _id: string;
  name: string;
  slug: string;
  type: string;
  sport: string;
  startDate: string;
  endDate: string;
  days: { date: string; startTime: string; endTime: string; label?: string }[];
  locations: { name: string; address?: string; city?: string; state?: string; fields: string[] }[];
  status: string;
  settings: { gameDurationMinutes: number };
  divisionIds: string[];
}

interface Division {
  _id: string;
  key: string;
  label: string;
  pools?: { name: string; teamIds: string[] }[];
}

interface Game {
  _id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  scheduledAt: string;
  dayIndex: number;
  locationName: string;
  field: string;
  timeSlot: string;
  round?: string;
  gameNumber?: number;
  status: string;
  divisionId: string;
}

interface Standing {
  _id: string;
  divisionId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  gamesPlayed: number;
  rank?: number;
}

interface Team {
  _id: string;
  divisionId: string;
  teamName: string;
  status: string;
  rosterCount: number;
  pool?: string;
}

interface BracketMatch {
  matchNumber: number;
  round: number;
  roundLabel?: string;
  position: number;
  nextMatchNumber?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  winnerName?: string;
  isBye?: boolean;
  scheduledAt?: string;
  field?: string;
  status: string;
}

interface Bracket {
  _id: string;
  eventId: string;
  divisionId: string;
  name: string;
  type: string;
  matches: BracketMatch[];
  status: string;
}

type SubTab = "teams" | "schedule" | "standings" | "brackets";

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  canceled: "bg-red-100 text-red-700",
  forfeit: "bg-orange-100 text-orange-700",
};

// ============================================================
// Page Component
// ============================================================

export default function PublicEventPage() {
  const { slug } = useParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leagueName, setLeagueName] = useState("");

  // Data
  const [event, setEvent] = useState<EventData | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [brackets, setBrackets] = useState<Bracket[]>([]);

  // Loading flags
  const [standingsLoaded, setStandingsLoaded] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [bracketsLoaded, setBracketsLoaded] = useState(false);

  // Navigation state
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [subTab, setSubTab] = useState<SubTab>("schedule");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Load schedule (primary data) + auto-refresh every 30s for live events
  function refreshSchedule() {
    return fetch(`/api/public/events/${slug}/schedule`)
      .then((r) => {
        if (!r.ok) throw new Error("Event not found");
        return r.json();
      })
      .then((data) => {
        setEvent(data.event || null);
        setDivisions(data.divisions || []);
        setGames(data.games || []);
        setLeagueName(data.leagueName || "");
      });
  }

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/events/${slug}/schedule`)
      .then((r) => {
        if (!r.ok) throw new Error("Event not found");
        return r.json();
      })
      .then((data) => {
        setEvent(data.event || null);
        setDivisions(data.divisions || []);
        setGames(data.games || []);
        setLeagueName(data.leagueName || "");
        // Default to first division if available
        if (data.divisions?.length > 0) {
          setSelectedDivision(data.divisions[0]._id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Auto-refresh for live events (every 30 seconds)
  useEffect(() => {
    if (!event || event.status !== "in_progress") return;
    const interval = setInterval(() => {
      refreshSchedule();
      // Also refresh standings and brackets if loaded
      if (standingsLoaded) {
        fetch(`/api/public/events/${slug}/standings`)
          .then((r) => r.json())
          .then((data) => setStandings(data.standings || []))
          .catch(() => {});
      }
      if (bracketsLoaded) {
        fetch(`/api/public/events/${slug}/brackets`)
          .then((r) => r.json())
          .then((data) => setBrackets(data.brackets || []))
          .catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [event?.status, slug, standingsLoaded, bracketsLoaded]);

  // Lazy-load standings
  useEffect(() => {
    if (subTab !== "standings" || standingsLoaded) return;
    fetch(`/api/public/events/${slug}/standings`)
      .then((r) => r.json())
      .then((data) => {
        setStandings(data.standings || []);
        setStandingsLoaded(true);
      })
      .catch(() => {});
  }, [subTab, slug, standingsLoaded]);

  // Lazy-load teams
  useEffect(() => {
    if (subTab !== "teams" || teamsLoaded) return;
    fetch(`/api/public/events/${slug}/teams`)
      .then((r) => r.json())
      .then((data) => {
        setTeams(data.teams || []);
        setTeamsLoaded(true);
      })
      .catch(() => {});
  }, [subTab, slug, teamsLoaded]);

  // Lazy-load brackets
  useEffect(() => {
    if (subTab !== "brackets" || bracketsLoaded) return;
    fetch(`/api/public/events/${slug}/brackets`)
      .then((r) => r.json())
      .then((data) => {
        setBrackets(data.brackets || []);
        setBracketsLoaded(true);
      })
      .catch(() => {});
  }, [subTab, slug, bracketsLoaded]);

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
          <h1 className="text-2xl font-bold text-slate-900">Event Not Found</h1>
          <p className="mt-2 text-slate-500">
            This event doesn&apos;t exist or isn&apos;t public yet.
          </p>
        </div>
      </div>
    );
  }

  // Filtered data for selected division
  const divGames =
    selectedDivision === "all"
      ? games
      : games.filter((g) => g.divisionId === selectedDivision);

  const divStandings =
    selectedDivision === "all"
      ? standings
      : standings.filter((s) => s.divisionId === selectedDivision);

  const divTeams =
    selectedDivision === "all"
      ? teams
      : teams.filter((t) => t.divisionId === selectedDivision);

  // Filter games by day
  const filteredGames =
    selectedDay !== null
      ? divGames.filter((g) => g.dayIndex === selectedDay)
      : divGames;

  // Group games by day
  const gamesByDay = new Map<number, Game[]>();
  for (const g of filteredGames) {
    if (!gamesByDay.has(g.dayIndex)) gamesByDay.set(g.dayIndex, []);
    gamesByDay.get(g.dayIndex)!.push(g);
  }

  // Group standings by division (for "all" view)
  const standingsByDiv = new Map<string, Standing[]>();
  for (const s of divStandings) {
    if (!standingsByDiv.has(s.divisionId))
      standingsByDiv.set(s.divisionId, []);
    standingsByDiv.get(s.divisionId)!.push(s);
  }

  // Group teams by pool (for single-division view)
  const teamsByPool = new Map<string, Team[]>();
  for (const t of divTeams) {
    const key = t.pool || "Registered Teams";
    if (!teamsByPool.has(key)) teamsByPool.set(key, []);
    teamsByPool.get(key)!.push(t);
  }

  const divisionMap = new Map(divisions.map((d) => [d._id, d]));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---- Header ---- */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL || ""}/${process.env.NEXT_PUBLIC_LEAGUE_SLUG || ""}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {leagueName}
          </a>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {event.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(event.startDate)}
              {event.startDate !== event.endDate &&
                ` – ${formatDate(event.endDate)}`}
            </span>
            {event.locations.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.locations.map((l) => l.name).join(", ")}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {event.settings.gameDurationMinutes} min games
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {event.status === "registration_open" && (
              <a
                href={`/public/events/${slug}/register`}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Register for this Event
              </a>
            )}
            <button
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: event.name, url });
                } else {
                  navigator.clipboard.writeText(url);
                  alert("Event link copied to clipboard!");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </header>

      {/* ---- Division Tabs (horizontal scroll) ---- */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="-mb-px flex gap-0 overflow-x-auto scrollbar-hide">
            {divisions.length > 1 && (
              <DivisionTab
                label="All Divisions"
                active={selectedDivision === "all"}
                onClick={() => setSelectedDivision("all")}
              />
            )}
            {divisions.map((d) => (
              <DivisionTab
                key={d._id}
                label={d.label}
                active={selectedDivision === d._id}
                onClick={() => setSelectedDivision(d._id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ---- Sub-tabs: Teams | Schedule | Standings ---- */}
      <div className="sticky top-[49px] z-10 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex gap-0">
            {(
              [
                { key: "teams", label: "Teams", icon: Users },
                { key: "schedule", label: "Schedule", icon: Calendar },
                { key: "standings", label: "Standings", icon: BarChart3 },
                { key: "brackets", label: "Brackets", icon: GitBranch },
              ] as { key: SubTab; label: string; icon: any }[]
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSubTab(key)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
                  subTab === key
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Day filter (schedule only) ---- */}
      {subTab === "schedule" && event.days.length > 1 && (
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterChip
              label="All Days"
              active={selectedDay === null}
              onClick={() => setSelectedDay(null)}
            />
            {event.days.map((day, idx) => (
              <FilterChip
                key={idx}
                label={day.label || `Day ${idx + 1}`}
                subtitle={formatDate(day.date)}
                active={selectedDay === idx}
                onClick={() => setSelectedDay(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Content ---- */}
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        {subTab === "teams" && (
          <TeamsView
            teamsByPool={teamsByPool}
            loading={!teamsLoaded}
            divisionLabel={
              selectedDivision !== "all"
                ? divisionMap.get(selectedDivision)?.label
                : undefined
            }
          />
        )}
        {subTab === "schedule" && (
          <ScheduleView
            gamesByDay={gamesByDay}
            eventDays={event.days}
            divisionMap={divisionMap}
            showDivisionBadge={selectedDivision === "all"}
          />
        )}
        {subTab === "standings" && (
          <StandingsView
            standingsByDiv={standingsByDiv}
            divisionMap={divisionMap}
            loading={!standingsLoaded}
            singleDivision={selectedDivision !== "all"}
          />
        )}
        {subTab === "brackets" && (
          <BracketsView
            brackets={
              selectedDivision === "all"
                ? brackets
                : brackets.filter((b) => b.divisionId === selectedDivision)
            }
            divisionMap={divisionMap}
            loading={!bracketsLoaded}
            showDivisionLabel={selectedDivision === "all"}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Shared UI Primitives
// ============================================================

function DivisionTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function FilterChip({
  label,
  subtitle,
  active,
  onClick,
}: {
  label: string;
  subtitle?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-700"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
      }`}
    >
      {label}
      {subtitle && (
        <span className="ml-1 text-[10px] opacity-70">{subtitle}</span>
      )}
    </button>
  );
}

// ============================================================
// Teams Tab
// ============================================================

function TeamsView({
  teamsByPool,
  loading,
  divisionLabel,
}: {
  teamsByPool: Map<string, Team[]>;
  loading: boolean;
  divisionLabel?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalTeams = [...teamsByPool.values()].reduce(
    (sum, t) => sum + t.length,
    0,
  );

  if (totalTeams === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No teams registered yet"
        description="Teams will appear here once registrations are approved."
      />
    );
  }

  const poolEntries = [...teamsByPool.entries()];

  return (
    <div className="space-y-6">
      {/* Team count header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {totalTeams} team{totalTeams !== 1 ? "s" : ""}{" "}
          {divisionLabel ? `in ${divisionLabel}` : "registered"}
        </p>
      </div>

      {poolEntries.map(([poolName, poolTeams]) => (
        <div key={poolName}>
          {/* Only show pool header if there are actual pools */}
          {poolEntries.length > 1 && (
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              {poolName}
            </h3>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {poolTeams.map((team) => (
              <div
                key={team._id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Placeholder team avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-200">
                    <span className="text-sm font-bold text-blue-700">
                      {team.teamName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {team.teamName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {team.rosterCount} player{team.rosterCount !== 1 ? "s" : ""}
                      {team.pool && (
                        <span className="ml-1.5 text-blue-600">
                          · {team.pool}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {team.status === "pending" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Schedule Tab
// ============================================================

function ScheduleView({
  gamesByDay,
  eventDays,
  divisionMap,
  showDivisionBadge,
}: {
  gamesByDay: Map<number, Game[]>;
  eventDays: EventData["days"];
  divisionMap: Map<string, Division>;
  showDivisionBadge: boolean;
}) {
  if (gamesByDay.size === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No games scheduled yet"
        description="Check back closer to the event for the full schedule."
      />
    );
  }

  const sortedDays = [...gamesByDay.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedDays.map((dayIdx) => {
        const dayGames = gamesByDay.get(dayIdx)!;
        const dayInfo = eventDays[dayIdx];

        return (
          <div key={dayIdx}>
            <h2 className="mb-3 text-lg font-bold text-slate-900">
              {dayInfo?.label || `Day ${dayIdx + 1}`}
              {dayInfo && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {formatDate(dayInfo.date)}
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {dayGames.map((game) => (
                <GameCard
                  key={game._id}
                  game={game}
                  divisionLabel={
                    showDivisionBadge
                      ? divisionMap.get(game.divisionId)?.label
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GameCard({
  game,
  divisionLabel,
}: {
  game: Game;
  divisionLabel?: string;
}) {
  const isComplete = game.status === "completed" || game.status === "forfeit";
  const isLive = game.status === "in_progress";

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
        isLive ? "border-green-300 ring-1 ring-green-200" : "border-slate-200"
      }`}
    >
      {/* Meta row */}
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{formatTime(game.scheduledAt)}</span>
          <span>·</span>
          <span>
            {game.locationName} — {game.field}
          </span>
          {game.round && (
            <>
              <span>·</span>
              <span className="font-medium text-blue-600">{game.round}</span>
            </>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            STATUS_COLORS[game.status] || "bg-slate-100 text-slate-600"
          }`}
        >
          {isLive ? "LIVE" : game.status.replace("_", " ")}
        </span>
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamRow
          name={game.homeTeamName}
          score={game.homeScore}
          isWinner={
            isComplete && (game.homeScore ?? 0) > (game.awayScore ?? 0)
          }
          showScore={isComplete || isLive}
        />
        <TeamRow
          name={game.awayTeamName}
          score={game.awayScore}
          isWinner={
            isComplete && (game.awayScore ?? 0) > (game.homeScore ?? 0)
          }
          showScore={isComplete || isLive}
        />
      </div>

      {divisionLabel && (
        <div className="mt-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {divisionLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function TeamRow({
  name,
  score,
  isWinner,
  showScore,
}: {
  name: string;
  score?: number;
  isWinner: boolean;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${
          isWinner ? "font-bold text-slate-900" : "font-medium text-slate-700"
        }`}
      >
        {name}
      </span>
      {showScore && (
        <span
          className={`min-w-[2rem] text-center text-lg tabular-nums ${
            isWinner
              ? "font-bold text-slate-900"
              : "font-medium text-slate-500"
          }`}
        >
          {score ?? "–"}
        </span>
      )}
    </div>
  );
}

// ============================================================
// Standings Tab
// ============================================================

function StandingsView({
  standingsByDiv,
  divisionMap,
  loading,
  singleDivision,
}: {
  standingsByDiv: Map<string, Standing[]>;
  divisionMap: Map<string, Division>;
  loading: boolean;
  singleDivision: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (standingsByDiv.size === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No standings yet"
        description="Standings will appear once games are completed."
      />
    );
  }

  return (
    <div className="space-y-8">
      {[...standingsByDiv.entries()].map(([divId, divStandings]) => {
        const div = divisionMap.get(divId);
        return (
          <div key={divId}>
            {!singleDivision && (
              <h2 className="mb-3 text-lg font-bold text-slate-900">
                {div?.label || "Division"}
              </h2>
            )}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="w-8 px-3 py-3 sm:px-4">#</th>
                    <th className="px-3 py-3 sm:px-4">Team</th>
                    <th className="px-2 py-3 text-center sm:px-4">W</th>
                    <th className="px-2 py-3 text-center sm:px-4">L</th>
                    <th className="px-2 py-3 text-center sm:px-4">T</th>
                    <th className="hidden px-2 py-3 text-center sm:table-cell sm:px-4">
                      GP
                    </th>
                    <th className="hidden px-2 py-3 text-center sm:table-cell sm:px-4">
                      PF
                    </th>
                    <th className="hidden px-2 py-3 text-center sm:table-cell sm:px-4">
                      PA
                    </th>
                    <th className="px-2 py-3 text-center sm:px-4">+/−</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {divStandings.map((s, idx) => (
                    <tr key={s._id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3 font-medium text-slate-500 sm:px-4">
                        {s.rank || idx + 1}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 sm:px-4">
                        {s.teamName}
                      </td>
                      <td className="px-2 py-3 text-center font-medium text-green-700 sm:px-4">
                        {s.wins}
                      </td>
                      <td className="px-2 py-3 text-center font-medium text-red-600 sm:px-4">
                        {s.losses}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-500 sm:px-4">
                        {s.ties}
                      </td>
                      <td className="hidden px-2 py-3 text-center text-slate-500 sm:table-cell sm:px-4">
                        {s.gamesPlayed}
                      </td>
                      <td className="hidden px-2 py-3 text-center text-slate-500 sm:table-cell sm:px-4">
                        {s.pointsFor}
                      </td>
                      <td className="hidden px-2 py-3 text-center text-slate-500 sm:table-cell sm:px-4">
                        {s.pointsAgainst}
                      </td>
                      <td
                        className={`px-2 py-3 text-center font-medium sm:px-4 ${
                          s.pointDifferential > 0
                            ? "text-green-700"
                            : s.pointDifferential < 0
                            ? "text-red-600"
                            : "text-slate-500"
                        }`}
                      >
                        {s.pointDifferential > 0 ? "+" : ""}
                        {s.pointDifferential}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Brackets Tab
// ============================================================

function BracketsView({
  brackets,
  divisionMap,
  loading,
  showDivisionLabel,
}: {
  brackets: Bracket[];
  divisionMap: Map<string, Division>;
  loading: boolean;
  showDivisionLabel: boolean;
}) {
  const [mobileRound, setMobileRound] = useState<Record<string, number>>({});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (brackets.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No brackets yet"
        description="Brackets will appear here once the event bracket draw is published."
      />
    );
  }

  return (
    <div className="space-y-8">
      {brackets.map((bracket) => {
        const div = divisionMap.get(bracket.divisionId);
        const maxRound = Math.max(...bracket.matches.map((m) => m.round), 0);
        const rounds: { round: number; label: string; matches: BracketMatch[] }[] = [];

        for (let r = 1; r <= maxRound; r++) {
          const roundMatches = bracket.matches
            .filter((m) => m.round === r)
            .sort((a, b) => a.position - b.position);
          const label =
            roundMatches[0]?.roundLabel ||
            (r === maxRound
              ? "Championship"
              : r === maxRound - 1
              ? "Semifinals"
              : `Round ${r}`);
          rounds.push({ round: r, label, matches: roundMatches });
        }

        const currentMobileRound = mobileRound[bracket._id] ?? 0;
        const isChampionshipRound = currentMobileRound === rounds.length - 1;

        return (
          <div key={bracket._id}>
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                {bracket.name}
              </h2>
              {showDivisionLabel && div && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {div.label}
                </span>
              )}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {bracket.type.replace(/_/g, " ")}
              </span>
            </div>

            {/* ── Desktop: horizontal scroll bracket ── */}
            <div className="hidden sm:block">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex gap-6" style={{ minWidth: `${rounds.length * 220}px` }}>
                  {rounds.map(({ round, label, matches }) => (
                    <div key={round} className="flex-shrink-0" style={{ width: 200 }}>
                      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <div
                        className="flex flex-col justify-around gap-4"
                        style={{ minHeight: `${bracket.matches.filter((m) => m.round === 1).length * 80}px` }}
                      >
                        {matches.map((match) => (
                          <BracketMatchCard key={match.matchNumber} match={match} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Mobile: round-by-round navigation ── */}
            <div className="sm:hidden">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Round navigation */}
                <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
                  <button
                    onClick={() =>
                      setMobileRound((prev) => ({
                        ...prev,
                        [bracket._id]: Math.max(0, currentMobileRound - 1),
                      }))
                    }
                    disabled={currentMobileRound === 0}
                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="text-center">
                    <p className={`text-sm font-semibold ${isChampionshipRound ? "text-amber-700" : "text-slate-900"}`}>
                      {isChampionshipRound && <Trophy className="inline h-4 w-4 text-amber-500 mr-1" />}
                      {rounds[currentMobileRound]?.label}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {currentMobileRound + 1} of {rounds.length}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setMobileRound((prev) => ({
                        ...prev,
                        [bracket._id]: Math.min(rounds.length - 1, currentMobileRound + 1),
                      }))
                    }
                    disabled={currentMobileRound === rounds.length - 1}
                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Round dots */}
                <div className="flex justify-center gap-1.5 py-2 border-b border-slate-100">
                  {rounds.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() =>
                        setMobileRound((prev) => ({ ...prev, [bracket._id]: idx }))
                      }
                      className={`h-2 rounded-full transition-all ${
                        idx === currentMobileRound
                          ? "w-4 bg-blue-600"
                          : "w-2 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Match cards for current round */}
                <div className="space-y-2 p-3">
                  {rounds[currentMobileRound]?.matches.map((match) => (
                    <BracketMatchCard key={match.matchNumber} match={match} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BracketMatchCard({ match }: { match: BracketMatch }) {
  const isComplete = match.status === "completed";
  const isLive = match.status === "in_progress";
  const homeWon = isComplete && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = isComplete && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <div
      className={`rounded-lg border text-sm shadow-sm ${
        isLive
          ? "border-green-300 ring-1 ring-green-200"
          : "border-slate-200"
      }`}
    >
      {/* Home team */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 ${
          homeWon ? "bg-blue-50 font-semibold text-slate-900" : "text-slate-700"
        }`}
      >
        <span className="truncate text-sm">
          {homeWon && <Trophy className="inline h-3 w-3 text-amber-500 mr-1" />}
          {match.homeTeamName || (match.isBye ? "BYE" : "TBD")}
        </span>
        {(isComplete || isLive) && (
          <span className={`ml-2 text-base tabular-nums ${homeWon ? "font-bold" : ""}`}>
            {match.homeScore ?? "–"}
          </span>
        )}
      </div>
      <div className="border-t border-slate-100" />
      {/* Away team */}
      <div
        className={`flex items-center justify-between px-3 py-2.5 ${
          awayWon ? "bg-blue-50 font-semibold text-slate-900" : "text-slate-700"
        }`}
      >
        <span className="truncate text-sm">
          {awayWon && <Trophy className="inline h-3 w-3 text-amber-500 mr-1" />}
          {match.awayTeamName || (match.isBye ? "BYE" : "TBD")}
        </span>
        {(isComplete || isLive) && (
          <span className={`ml-2 text-base tabular-nums ${awayWon ? "font-bold" : ""}`}>
            {match.awayScore ?? "–"}
          </span>
        )}
      </div>
      {/* Match info footer */}
      <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">
          {match.field || "TBD"}
          {match.scheduledAt && ` · ${formatTime(match.scheduledAt)}`}
        </span>
        {isLive && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700 animate-pulse">
            LIVE
          </span>
        )}
        {isComplete && (
          <span className="text-[9px] font-medium text-slate-400">FINAL</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-sm border border-slate-200">
      <Icon className="mx-auto h-10 w-10 text-slate-300" />
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
