"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Loader2,
  Shield,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@goparticipate/ui";

interface FamilyEvent {
  _id: string;
  teamId: string;
  teamName: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  location?: { name: string; address?: string };
  opponentName?: string;
  homeAway?: string;
  children: { id: string; name: string }[];
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  practice: "bg-green-100 text-green-700",
  game: "bg-blue-100 text-blue-700",
  scrimmage: "bg-orange-100 text-orange-700",
  tournament: "bg-purple-100 text-purple-700",
  meeting: "bg-gray-100 text-gray-700",
  tryout: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-700",
};

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function FamilySchedulePage() {
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "list">("list");

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  useEffect(() => {
    setLoading(true);
    // Fetch 30 days of events for flexibility
    fetch("/api/family/schedule?days=30")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter events to current week
  const weekEvents = events.filter((e) => {
    const eventDate = new Date(e.startTime);
    return eventDate >= weekStart && eventDate <= new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);
  });

  // Group by day for list view
  const eventsByDay = new Map<string, FamilyEvent[]>();
  for (const event of weekEvents) {
    const dayKey = new Date(event.startTime).toDateString();
    if (!eventsByDay.has(dayKey)) eventsByDay.set(dayKey, []);
    eventsByDay.get(dayKey)!.push(event);
  }

  // All upcoming events (for list view beyond current week)
  const upcomingEvents = events.filter(
    (e) => new Date(e.startTime) >= new Date()
  );

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Schedule</h1>
          <p className="text-sm text-muted-foreground">
            All events across your children&apos;s teams
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === "week" ? (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {weekStart.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              —{" "}
              {weekEnd.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className="flex gap-2">
              {weekOffset !== 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekOffset(0)}
                >
                  Today
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const dayKey = date.toDateString();
              const dayEvents = eventsByDay.get(dayKey) || [];
              const isToday = isSameDay(date, today);

              return (
                <div key={dayKey} className="min-h-[120px]">
                  <div
                    className={`text-center text-xs font-medium py-1 rounded-t-md ${
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <div>
                      {date.toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </div>
                    <div className="text-lg font-bold">{date.getDate()}</div>
                  </div>
                  <div className="border border-t-0 rounded-b-md p-1 space-y-1">
                    {dayEvents.map((event) => (
                      <div
                        key={event._id}
                        className={`rounded p-1.5 text-[10px] ${
                          EVENT_TYPE_COLORS[event.type] ||
                          EVENT_TYPE_COLORS.other
                        }`}
                      >
                        <div className="font-medium truncate">
                          {event.title}
                        </div>
                        <div className="truncate opacity-75">
                          {new Date(event.startTime).toLocaleTimeString(
                            undefined,
                            { hour: "numeric", minute: "2-digit" }
                          )}
                        </div>
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-[10px] text-muted-foreground/40 text-center py-2">
                        —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* List view */
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h2 className="text-lg font-semibold mb-1">
                  No upcoming events
                </h2>
                <p className="text-sm text-muted-foreground">
                  Events will appear here when coaches schedule them.
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event, i) => {
              const eventDate = new Date(event.startTime);
              const prevDate =
                i > 0 ? new Date(upcomingEvents[i - 1].startTime) : null;
              const showDateHeader =
                !prevDate || !isSameDay(eventDate, prevDate);
              const isEventToday = isSameDay(eventDate, today);

              return (
                <div key={event._id}>
                  {showDateHeader && (
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <span
                        className={`text-sm font-semibold ${
                          isEventToday ? "text-primary" : ""
                        }`}
                      >
                        {isEventToday
                          ? "Today"
                          : eventDate.toLocaleDateString(undefined, {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                            })}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    {/* Time */}
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-sm font-semibold">
                        {eventDate.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {event.title}
                        </span>
                        <Badge
                          className={`text-[10px] ${
                            EVENT_TYPE_COLORS[event.type] ||
                            EVENT_TYPE_COLORS.other
                          }`}
                        >
                          {event.type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {event.teamName}
                        </span>
                        {event.location?.name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location.name}
                          </span>
                        )}
                        {event.opponentName && (
                          <span>
                            vs {event.opponentName}
                            {event.homeAway ? ` (${event.homeAway})` : ""}
                          </span>
                        )}
                      </div>
                      {event.children.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {event.children.map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {c.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
