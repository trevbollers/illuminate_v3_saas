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

type SubTab = "teams" | "schedule" | "standings";

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

  // Loading flags
  const [standingsLoaded, setStandingsLoaded] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  // Navigation state
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [subTab, setSubTab] = useState<SubTab>("schedule");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Load schedule (primary data)
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
          <p className="text-sm font-medium text-blue-600">{leagueName}</p>
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
