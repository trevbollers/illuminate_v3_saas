"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MapPin, Trophy, Loader2 } from "lucide-react";

interface PublicEvent {
  _id: string;
  name: string;
  slug: string;
  type: string;
  sport: string;
  startDate: string;
  endDate?: string;
  status: string;
  locations?: { name: string; address?: string }[];
  bannerUrl?: string;
}

export default function PublicEventsPage() {
  const [leagueName, setLeagueName] = useState("");
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/events")
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setLeagueName(data.leagueName || "");
        setEvents(data.events || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Split into upcoming and past
  const now = new Date();
  const upcoming = events.filter(
    (e) => new Date(e.endDate || e.startDate) >= now || e.status === "in_progress",
  );
  const past = events.filter(
    (e) => new Date(e.endDate || e.startDate) < now && e.status !== "in_progress",
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {leagueName || "Events"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Upcoming tournaments, leagues, and events
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {events.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-medium">No events yet</h3>
            <p className="text-muted-foreground mt-2">
              Check back soon for upcoming events.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {upcoming.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Past Events
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {past.map((event) => (
                    <EventCard key={event._id} event={event} muted />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function EventCard({
  event,
  muted,
}: {
  event: PublicEvent;
  muted?: boolean;
}) {
  const location = event.locations?.[0];

  const statusColors: Record<string, string> = {
    registration_open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  const statusLabels: Record<string, string> = {
    published: "Coming Soon",
    registration_open: "Registration Open",
    registration_closed: "Registration Closed",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <Link
      href={`/public/events/${event.slug}`}
      className={`block rounded-lg border bg-card p-5 transition-shadow hover:shadow-md ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lg leading-snug">{event.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            statusColors[event.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {statusLabels[event.status] || event.status}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            {format(new Date(event.startDate), "MMM d, yyyy")}
            {event.endDate &&
              event.endDate !== event.startDate &&
              ` — ${format(new Date(event.endDate), "MMM d, yyyy")}`}
          </span>
        </div>

        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{location.name}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 shrink-0" />
          <span>
            {event.sport} — {event.type === "tournament" ? "Tournament" : event.type === "league" ? "League" : event.type}
          </span>
        </div>
      </div>
    </Link>
  );
}
