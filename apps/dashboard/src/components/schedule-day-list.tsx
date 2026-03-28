"use client";

import { format, addDays, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  CalendarX,
  Plus,
  Swords,
} from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  type OrgEventDisplay,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  getEventsForDay,
} from "@/lib/schedule-utils";

interface ScheduleDayListProps {
  date: Date;
  events: OrgEventDisplay[];
  onDateChange: (date: Date) => void;
}

export function ScheduleDayList({
  date,
  events,
  onDateChange,
}: ScheduleDayListProps) {
  const router = useRouter();
  const dayEvents = getEventsForDay(events, date);

  return (
    <div>
      {/* Header: day nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDateChange(subDays(date, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDateChange(addDays(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {format(date, "EEEE, MMMM d, yyyy")}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Event list */}
      {dayEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarX className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-sm font-medium mb-1">No events scheduled</p>
          <p className="text-xs mb-4">Nothing on the calendar for this day.</p>
          <Button size="sm" asChild>
            <a href="/schedule/new">
              <Plus className="h-3 w-3 mr-1" /> Add Event
            </a>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((ev, i) => {
            const colors = EVENT_TYPE_COLORS[ev.type] ?? EVENT_TYPE_COLORS.other;
            const startStr = format(new Date(ev.startTime), "h:mm a");
            const endStr = format(new Date(ev.endTime), "h:mm a");

            return (
              <button
                key={`${ev._id}-${i}`}
                type="button"
                className="flex w-full items-start gap-4 rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/schedule/${ev._id}`)}
              >
                {/* Color bar */}
                <div className={`w-1 self-stretch rounded-full ${colors.dot}`} />

                {/* Time */}
                <div className="shrink-0 w-24 pt-0.5">
                  <p className="text-sm font-medium">{startStr}</p>
                  <p className="text-xs text-muted-foreground">{endStr}</p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{ev.title}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}
                    >
                      {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">{ev.teamName}</p>

                  {ev.location?.name && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {ev.location.name}
                      {ev.location.address && ` — ${ev.location.address}`}
                    </p>
                  )}

                  {/* Game-specific */}
                  {ev.type === "game" && ev.opponentName && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Swords className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">
                        vs {ev.opponentName}
                      </span>
                      {ev.homeAway && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {ev.homeAway === "home"
                            ? "Home"
                            : ev.homeAway === "away"
                              ? "Away"
                              : "Neutral"}
                        </Badge>
                      )}
                      {ev.result?.outcome && (
                        <Badge
                          variant={ev.result.outcome === "win" ? "default" : "secondary"}
                          className="text-[10px] py-0 h-4"
                        >
                          {ev.result.outcome.toUpperCase()}{" "}
                          {ev.result.ourScore != null && ev.result.theirScore != null
                            ? `${ev.result.ourScore}-${ev.result.theirScore}`
                            : ""}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
