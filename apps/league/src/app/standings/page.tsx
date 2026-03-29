"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";

interface Event {
  _id: string;
  name: string;
  slug: string;
  status: string;
}

interface Division {
  _id: string;
  key: string;
  label: string;
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

export default function StandingsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Load events
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        const evts = (data.events || data || []).filter(
          (e: any) => e.status !== "draft" && e.status !== "canceled",
        );
        setEvents(evts);
        if (evts.length > 0) setSelectedEventId(evts[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load standings for selected event
  const fetchStandings = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/standings`);
      const data = await res.json();
      setDivisions(data.divisions || []);
      setStandings(data.standings || []);
    } catch {
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  const recalculate = async () => {
    if (!selectedEventId) return;
    setRecalculating(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/standings`, {
        method: "POST",
      });
      const data = await res.json();
      setStandings(data.standings || []);
    } catch {
    } finally {
      setRecalculating(false);
    }
  };

  const divisionMap = new Map(divisions.map((d) => [d._id, d]));
  const selectedEvent = events.find((e) => e._id === selectedEventId);

  // Group standings by division
  const standingsByDiv = new Map<string, Standing[]>();
  for (const s of standings) {
    if (!standingsByDiv.has(s.divisionId)) standingsByDiv.set(s.divisionId, []);
    standingsByDiv.get(s.divisionId)!.push(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Standings</h1>
          <p className="text-muted-foreground">
            View and recalculate event standings from game results.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedEvent && (
            <Link
              href={`/public/events/${selectedEvent.slug}`}
              target="_blank"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Public View
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={recalculating || !selectedEventId}
            onClick={recalculate}
          >
            <RefreshCw
              className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`}
            />
            Recalculate
          </Button>
        </div>
      </div>

      {/* Event selector */}
      {events.length > 1 && (
        <select
          className="rounded-lg border bg-card px-3 py-2 text-sm"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          {events.map((evt) => (
            <option key={evt._id} value={evt._id}>
              {evt.name}
            </option>
          ))}
        </select>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : standings.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No standings yet</h3>
          <p className="mt-1 text-muted-foreground">
            Standings will appear once games are completed. Click{" "}
            <strong>Recalculate</strong> to generate standings from game results.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...standingsByDiv.entries()].map(([divId, divStandings]) => {
            const div = divisionMap.get(divId);
            return (
              <div key={divId}>
                <h2 className="mb-3 text-lg font-bold">
                  {div?.label || "Division"}
                </h2>
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 w-8">#</th>
                        <th className="px-4 py-3">Team</th>
                        <th className="px-4 py-3 text-center">W</th>
                        <th className="px-4 py-3 text-center">L</th>
                        <th className="px-4 py-3 text-center">T</th>
                        <th className="px-4 py-3 text-center">GP</th>
                        <th className="px-4 py-3 text-center">PF</th>
                        <th className="px-4 py-3 text-center">PA</th>
                        <th className="px-4 py-3 text-center">+/−</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {divStandings.map((s, idx) => (
                        <tr key={s._id}>
                          <td className="px-4 py-3 text-muted-foreground font-medium">
                            {s.rank || idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {s.teamName}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-green-600">
                            {s.wins}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-red-500">
                            {s.losses}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {s.ties}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {s.gamesPlayed}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {s.pointsFor}
                          </td>
                          <td className="px-4 py-3 text-center text-muted-foreground">
                            {s.pointsAgainst}
                          </td>
                          <td
                            className={`px-4 py-3 text-center font-medium ${
                              s.pointDifferential > 0
                                ? "text-green-600"
                                : s.pointDifferential < 0
                                ? "text-red-500"
                                : "text-muted-foreground"
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
      )}
    </div>
  );
}
