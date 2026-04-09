"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import {
  CalendarDays,
  Users,
  ShieldCheck,
  DollarSign,
  Plus,
  ArrowRight,
  Trophy,
} from "lucide-react";

interface EventSummary {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
  locations: { name: string; city?: string; state?: string }[];
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  registration_open: "Reg. Open",
  registration_closed: "Reg. Closed",
  in_progress: "Live",
  completed: "Done",
  canceled: "Canceled",
};

export default function LeagueDashboard() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [stats, setStats] = useState<{
    registeredTeams: number; totalPlayers: number;
    totalGames: number; completedGames: number; totalRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()).catch(() => null),
    ])
      .then(([eventsData, statsData]) => {
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        if (statsData && !statsData.error) setStats(statsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcomingEvents = events.filter(
    (e) => !["completed", "canceled"].includes(e.status),
  );
  const activeEvents = events.filter(
    (e) => e.status === "in_progress" || e.status === "registration_open",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage events, registrations, and compliance for your league.
          </p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/events/new">
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Upcoming Events</p>
              <p className="text-2xl font-bold">{upcomingEvents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Trophy className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Now</p>
              <p className="text-2xl font-bold">{activeEvents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registered Teams</p>
              <p className="text-2xl font-bold">{stats?.registeredTeams ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Games Completed</p>
              <p className="text-2xl font-bold">
                {stats ? `${stats.completedGames}/${stats.totalGames}` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link href="/events">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">
                No upcoming events. Create one to get started.
              </p>
              <Button className="mt-4 gap-2 bg-blue-600 hover:bg-blue-700" size="sm" asChild>
                <Link href="/events/new">
                  <Plus className="h-3 w-3" /> Create Event
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((event) => {
                const start = new Date(event.startDate);
                const end = new Date(event.endDate);
                const isMultiDay = start.toDateString() !== end.toDateString();
                return (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-blue-50">
                      <span className="text-[10px] font-bold uppercase text-blue-600">
                        {format(start, "MMM")}
                      </span>
                      <span className="text-base font-bold leading-none text-blue-900">
                        {format(start, "d")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold">{event.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(start, "MMM d")}
                        {isMultiDay && ` – ${format(end, "MMM d")}`}
                        {event.locations[0]?.city && ` · ${event.locations[0].city}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {statusLabels[event.status] || event.status}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
