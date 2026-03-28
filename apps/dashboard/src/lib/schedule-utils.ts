import {
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
  getDay,
  differenceInMilliseconds,
  isAfter,
  isBefore,
  eachDayOfInterval,
} from "date-fns";

// --- Types ---

export type EventType =
  | "practice"
  | "scrimmage"
  | "meeting"
  | "tryout"
  | "game"
  | "tournament"
  | "other";

export interface OrgEventDisplay {
  _id: string;
  teamId: string;
  teamName: string;
  title: string;
  type: EventType;
  location?: { name: string; address?: string };
  startTime: string; // ISO
  endTime: string;   // ISO
  opponentName?: string;
  homeAway?: "home" | "away" | "neutral";
  leagueEventId?: string;
  result?: { ourScore?: number; theirScore?: number; outcome?: string };
  recurrence?: {
    frequency: "daily" | "weekly" | "biweekly" | "monthly";
    daysOfWeek?: number[];
    endDate?: string;
  };
  notes?: string;
  isCancelled?: boolean;
  isRecurrenceInstance?: boolean; // virtual occurrence generated client-side
}

// --- Color Map ---

export const EVENT_TYPE_COLORS: Record<
  EventType,
  { bg: string; text: string; dot: string; badge: string }
> = {
  practice:   { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700" },
  game:       { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500",     badge: "bg-red-100 text-red-700" },
  scrimmage:  { bg: "bg-orange-100",  text: "text-orange-700",  dot: "bg-orange-500",  badge: "bg-orange-100 text-orange-700" },
  meeting:    { bg: "bg-purple-100",  text: "text-purple-700",  dot: "bg-purple-500",  badge: "bg-purple-100 text-purple-700" },
  tournament: { bg: "bg-green-100",   text: "text-green-700",   dot: "bg-green-500",   badge: "bg-green-100 text-green-700" },
  tryout:     { bg: "bg-yellow-100",  text: "text-yellow-700",  dot: "bg-yellow-500",  badge: "bg-yellow-100 text-yellow-700" },
  other:      { bg: "bg-gray-100",    text: "text-gray-700",    dot: "bg-gray-500",    badge: "bg-gray-100 text-gray-700" },
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  practice: "Practice",
  game: "Game",
  scrimmage: "Scrimmage",
  meeting: "Meeting",
  tournament: "Tournament",
  tryout: "Tryout",
  other: "Other",
};

export const ALL_EVENT_TYPES: EventType[] = [
  "practice",
  "game",
  "scrimmage",
  "meeting",
  "tournament",
  "tryout",
  "other",
];

// --- Helpers ---

export function getEventsForDay(
  events: OrgEventDisplay[],
  date: Date,
): OrgEventDisplay[] {
  return events.filter((e) => isSameDay(new Date(e.startTime), date));
}

// --- Recurrence Expansion ---

/**
 * Expand recurring events into individual virtual instances within a date range.
 * Non-recurring events pass through unchanged.
 */
export function expandRecurringEvents(
  events: OrgEventDisplay[],
  rangeStart: Date,
  rangeEnd: Date,
): OrgEventDisplay[] {
  const result: OrgEventDisplay[] = [];

  for (const event of events) {
    if (!event.recurrence?.frequency) {
      result.push(event);
      continue;
    }

    const baseStart = new Date(event.startTime);
    const baseEnd = new Date(event.endTime);
    const duration = differenceInMilliseconds(baseEnd, baseStart);
    const recEnd = event.recurrence.endDate
      ? new Date(event.recurrence.endDate)
      : rangeEnd;
    const effectiveEnd = isBefore(recEnd, rangeEnd) ? recEnd : rangeEnd;

    const { frequency, daysOfWeek } = event.recurrence;

    // For weekly with specific days, generate day-by-day and filter
    if (
      (frequency === "weekly" || frequency === "biweekly") &&
      daysOfWeek &&
      daysOfWeek.length > 0
    ) {
      const days = eachDayOfInterval({
        start: isBefore(baseStart, rangeStart) ? rangeStart : baseStart,
        end: effectiveEnd,
      });

      let weekCounter = 0;
      let lastWeekStart: Date | null = null;

      for (const day of days) {
        // Track week boundaries for biweekly
        if (frequency === "biweekly") {
          const weekStart = addDays(day, -getDay(day));
          if (!lastWeekStart || !isSameDay(weekStart, lastWeekStart)) {
            if (lastWeekStart) weekCounter++;
            lastWeekStart = weekStart;
          }
          if (weekCounter % 2 !== 0) continue;
        }

        if (!daysOfWeek.includes(getDay(day))) continue;
        if (isBefore(day, rangeStart)) continue;

        const instanceStart = new Date(day);
        instanceStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds());
        const instanceEnd = new Date(instanceStart.getTime() + duration);

        result.push({
          ...event,
          startTime: instanceStart.toISOString(),
          endTime: instanceEnd.toISOString(),
          isRecurrenceInstance: true,
        });
      }
      continue;
    }

    // Simple frequency-based recurrence (daily, weekly, biweekly, monthly)
    let current = new Date(baseStart);
    while (!isAfter(current, effectiveEnd)) {
      if (!isBefore(current, rangeStart)) {
        const instanceEnd = new Date(current.getTime() + duration);
        result.push({
          ...event,
          startTime: current.toISOString(),
          endTime: instanceEnd.toISOString(),
          isRecurrenceInstance: !isSameDay(current, baseStart),
        });
      }

      switch (frequency) {
        case "daily":
          current = addDays(current, 1);
          break;
        case "weekly":
          current = addWeeks(current, 1);
          break;
        case "biweekly":
          current = addWeeks(current, 2);
          break;
        case "monthly":
          current = addMonths(current, 1);
          break;
      }
    }
  }

  return result.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
