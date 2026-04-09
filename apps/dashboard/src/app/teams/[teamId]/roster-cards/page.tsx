"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Circle,
  Users,
  Calendar,
  Download,
  Trophy,
  Shield,
  Camera,
} from "lucide-react";

interface RosterEntry {
  _id: string;
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
}

interface EventCheckIn {
  eventId: string;
  eventName: string;
  eventStatus: string;
  startDate: string;
  leagueName: string;
  divisionLabel: string;
  registrationId: string;
  totalRoster: number;
  checkedInCount: number;
  allCheckedIn: boolean;
  players: {
    playerId: string;
    playerName: string;
    jerseyNumber?: number;
    checkedIn: boolean;
    checkedInAt?: string;
  }[];
}

export default function RosterCardsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [teamName, setTeamName] = useState("");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [events, setEvents] = useState<EventCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teams/${teamId}/roster`).then((r) => r.json()),
      fetch(`/api/teams/${teamId}/checkin`).then((r) => r.json()).catch(() => ({ events: [] })),
      fetch(`/api/teams/${teamId}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([rosterData, checkinData, teamData]) => {
        setRoster(Array.isArray(rosterData) ? rosterData : []);
        setEvents(checkinData.events || []);
        setTeamName(checkinData.teamName || teamData?.name || "Team");
        if (checkinData.events?.length > 0) {
          setSelectedEvent(checkinData.events[0].eventId);
        }
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const activeEvent = events.find((e) => e.eventId === selectedEvent);

  function getPlayerCheckInStatus(playerId: string): boolean {
    if (!activeEvent) return false;
    return activeEvent.players.find((p) => p.playerId === playerId)?.checkedIn || false;
  }

  function exportCSV() {
    const rows = [["Name", "Jersey", "Position", "Checked In"]];
    for (const r of roster) {
      const checkedIn = activeEvent
        ? activeEvent.players.find((p) => p.playerId === r.playerId)?.checkedIn ? "Yes" : "No"
        : "N/A";
      rows.push([r.playerName, r.jerseyNumber?.toString() || "", r.position || "", checkedIn]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${teamName.replace(/\s+/g, "-")}-roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/teams/${teamId}`} className="rounded-lg p-2 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{teamName}</h1>
            <p className="text-sm text-muted-foreground">
              Roster Cards · {roster.length} players
            </p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Event selector for check-in status */}
      {events.length > 0 && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Event Check-In Status
            </h2>
            {activeEvent && (
              <div className="flex items-center gap-2">
                {activeEvent.allCheckedIn ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All Checked In
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {activeEvent.checkedInCount}/{activeEvent.totalRoster} checked in
                  </span>
                )}
              </div>
            )}
          </div>

          {events.length > 1 && (
            <div className="flex gap-2 overflow-x-auto mb-3 pb-1">
              {events.map((ev) => (
                <button
                  key={ev.eventId}
                  onClick={() => setSelectedEvent(ev.eventId)}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedEvent === ev.eventId
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {ev.eventName}
                  {ev.allCheckedIn && <CheckCircle2 className="inline h-3 w-3 ml-1 text-green-600" />}
                </button>
              ))}
            </div>
          )}

          {activeEvent && (
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  activeEvent.allCheckedIn ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{
                  width: `${activeEvent.totalRoster > 0
                    ? (activeEvent.checkedInCount / activeEvent.totalRoster) * 100
                    : 0}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Player Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map((player) => {
          const isCheckedIn = getPlayerCheckInStatus(player.playerId);
          const eventPlayer = activeEvent?.players.find((p) => p.playerId === player.playerId);

          return (
            <div
              key={player._id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isCheckedIn
                  ? "border-green-300 bg-green-50/50 shadow-sm"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden ${
                  isCheckedIn ? "bg-green-100" : "bg-slate-100"
                }`}>
                  <span className={`text-lg font-bold ${isCheckedIn ? "text-green-700" : "text-slate-400"}`}>
                    {player.playerName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{player.playerName}</p>
                    {isCheckedIn && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {player.jerseyNumber != null && (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        isCheckedIn ? "bg-green-200 text-green-800" : "bg-slate-200 text-slate-700"
                      }`}>
                        #{player.jerseyNumber}
                      </span>
                    )}
                    {player.position && (
                      <span className="text-xs text-muted-foreground">{player.position}</span>
                    )}
                  </div>
                  {isCheckedIn && eventPlayer?.checkedInAt && (
                    <p className="text-[10px] text-green-600 mt-0.5">
                      Checked in {new Date(eventPlayer.checkedInAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {roster.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No players on this roster yet.</p>
          <Link href={`/teams/${teamId}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Add players to roster
          </Link>
        </div>
      )}
    </div>
  );
}
