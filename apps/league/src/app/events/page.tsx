"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  CalendarDays,
  MapPin,
  Plus,
  Search,
  Users,
  Filter,
  ChevronRight,
  Trophy,
  Image,
} from "lucide-react";

interface EventData {
  _id: string;
  name: string;
  slug: string;
  type: string;
  sport: string;
  posterUrl?: string;
  locations: { name: string; city?: string; state?: string }[];
  days: { date: string; label?: string }[];
  startDate: string;
  endDate: string;
  registrationOpen: string;
  registrationClose: string;
  status: string;
  pricing: { amount: number };
  maxTeamsPerDivision?: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "outline" },
  registration_open: { label: "Registration Open", variant: "default" },
  registration_closed: { label: "Reg. Closed", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  canceled: { label: "Canceled", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
  tournament: "Tournament",
  league_season: "League Season",
  showcase: "Showcase",
  combine: "Combine",
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchEvents();
  }, [statusFilter, typeFilter]);

  async function fetchEvents() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("q", search);

    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchEvents();
  }

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Events</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tournaments, seasons, showcases, and combines.
          </p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700" asChild>
          <Link href="/events/new">
            <Plus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </form>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="registration_open">Reg. Open</option>
            <option value="registration_closed">Reg. Closed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="tournament">Tournament</option>
            <option value="league_season">League Season</option>
            <option value="showcase">Showcase</option>
            <option value="combine">Combine</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <CalendarDays className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">No events yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first event to start accepting team registrations.
          </p>
          <Button className="mt-6 gap-2 bg-blue-600 hover:bg-blue-700" asChild>
            <Link href="/events/new">
              <Plus className="h-4 w-4" />
              Create Your First Event
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const sc = statusConfig[event.status] ?? { label: "Unknown", variant: "secondary" as const };
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            const isMultiDay =
              startDate.toDateString() !== endDate.toDateString();
            const regClose = new Date(event.registrationClose);
            const regOpen = regClose > now;
            const locationStr = event.locations.length > 0
              ? event.locations.map((l) => l.city && l.state ? `${l.city}, ${l.state}` : l.name).join(" · ")
              : "TBD";

            return (
              <Link
                key={event._id}
                href={`/events/${event._id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-lg hover:border-blue-300"
              >
                {/* Poster / Header */}
                {event.posterUrl ? (
                  <div className="relative h-40 bg-muted">
                    <img
                      src={event.posterUrl}
                      alt={event.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <Badge variant={sc.variant} className="mb-1">
                        {sc.label}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                    <Trophy className="h-10 w-10 text-blue-300" />
                    <div className="absolute bottom-3 left-3">
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                      {typeLabels[event.type] || event.type}
                    </span>
                    {event.pricing.amount > 0 && (
                      <span className="text-xs font-medium text-muted-foreground">
                        ${(event.pricing.amount / 100).toFixed(0)}/team
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-foreground group-hover:text-blue-700 line-clamp-2">
                    {event.name}
                  </h3>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {format(startDate, "MMM d")}
                        {isMultiDay && ` – ${format(endDate, "MMM d")}`}
                        {`, ${format(startDate, "yyyy")}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{locationStr}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3">
                    {regOpen && event.status !== "draft" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Registration open until {format(regClose, "MMM d")}
                      </span>
                    ) : event.status === "draft" ? (
                      <span className="text-[11px] text-muted-foreground">
                        Not published
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Registration closed
                      </span>
                    )}
                  </div>
                </div>

                {/* Hover indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
