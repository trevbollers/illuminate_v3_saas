"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from "date-fns";
import {
  CalendarDays,
  List,
  Plus,
  Loader2,
} from "lucide-react";
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@goparticipate/ui";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { ScheduleDayList } from "@/components/schedule-day-list";
import {
  type OrgEventDisplay,
  type EventType,
  expandRecurringEvents,
  ALL_EVENT_TYPES,
  EVENT_TYPE_LABELS,
} from "@/lib/schedule-utils";

interface TeamOption {
  _id: string;
  name: string;
}

export default function SchedulePage() {
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [teamFilter, setTeamFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [rawEvents, setRawEvents] = useState<OrgEventDisplay[]>([]);
  const [events, setEvents] = useState<OrgEventDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch teams once
  useEffect(() => {
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) =>
        setTeams(
          (data || []).map((t: any) => ({ _id: t._id, name: t.name })),
        ),
      )
      .catch(() => {});
  }, []);

  // Fetch events when month or filters change
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const gridStart = startOfWeek(startOfMonth(currentMonth));
      const gridEnd = endOfWeek(endOfMonth(currentMonth));

      const params = new URLSearchParams({
        start: gridStart.toISOString(),
        end: gridEnd.toISOString(),
      });
      if (teamFilter !== "all") params.set("teamId", teamFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/schedule?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRawEvents(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [currentMonth, teamFilter, typeFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Expand recurring events for display
  useEffect(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth));
    const gridEnd = endOfWeek(endOfMonth(currentMonth));
    const expanded = expandRecurringEvents(rawEvents, gridStart, gridEnd);
    setEvents(expanded);
  }, [rawEvents, currentMonth]);

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setView("list");
    // If clicked day is in a different month, navigate to it
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  }

  function handleMonthChange(date: Date) {
    setCurrentMonth(date);
  }

  function handleDateChange(date: Date) {
    setSelectedDate(date);
    // If navigating to a different month in list view, update month context
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <Button asChild>
          <Link href="/schedule/new">
            <Plus className="h-4 w-4 mr-1" /> Add Event
          </Link>
        </Button>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t._id} value={t._id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ALL_EVENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center rounded-md border">
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              view === "calendar"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="h-4 w-4" />
            Month
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
            Day
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : view === "calendar" ? (
        <ScheduleCalendar
          currentMonth={currentMonth}
          events={events}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          onMonthChange={handleMonthChange}
        />
      ) : (
        <ScheduleDayList
          date={selectedDate}
          events={events}
          onDateChange={handleDateChange}
        />
      )}
    </div>
  );
}
