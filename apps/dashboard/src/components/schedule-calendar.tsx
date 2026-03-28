"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import {
  type OrgEventDisplay,
  EVENT_TYPE_COLORS,
  getEventsForDay,
} from "@/lib/schedule-utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

interface ScheduleCalendarProps {
  currentMonth: Date;
  events: OrgEventDisplay[];
  selectedDate: Date | null;
  onDayClick: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export function ScheduleCalendar({
  currentMonth,
  events,
  selectedDate,
  onDayClick,
  onMonthChange,
}: ScheduleCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Chunk days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div>
      {/* Header: month nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMonthChange(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 border-t border-l">
        {weeks.flat().map((day, idx) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dayEvents = getEventsForDay(events, day);

          return (
            <button
              key={idx}
              type="button"
              className={`
                relative min-h-[100px] border-b border-r p-1.5 text-left transition-colors
                hover:bg-muted/50
                ${!inMonth ? "bg-muted/20" : ""}
                ${selected ? "ring-2 ring-primary ring-inset" : ""}
              `}
              onClick={() => onDayClick(day)}
            >
              {/* Day number */}
              <span
                className={`
                  inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                  ${today ? "bg-primary text-primary-foreground" : ""}
                  ${!inMonth ? "text-muted-foreground/50" : ""}
                `}
              >
                {format(day, "d")}
              </span>

              {/* Event chips */}
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, MAX_CHIPS).map((ev, i) => {
                  const colors = EVENT_TYPE_COLORS[ev.type] ?? EVENT_TYPE_COLORS.other;
                  return (
                    <div
                      key={`${ev._id}-${i}`}
                      className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium ${colors.bg} ${colors.text}`}
                    >
                      {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > MAX_CHIPS && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayEvents.length - MAX_CHIPS} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
