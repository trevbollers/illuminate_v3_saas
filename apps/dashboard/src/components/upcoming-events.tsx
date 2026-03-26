import { Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@goparticipate/ui";

const upcomingEvents = [
  {
    id: "evt-1",
    title: "Practice",
    team: "U14 Varsity",
    date: "Mar 25",
    time: "6:00 PM",
    type: "practice" as const,
  },
  {
    id: "evt-2",
    title: "vs. Westside Warriors",
    team: "U14 Varsity",
    date: "Mar 29",
    time: "10:00 AM",
    type: "game" as const,
  },
  {
    id: "evt-3",
    title: "Practice",
    team: "U12 Junior",
    date: "Mar 26",
    time: "5:30 PM",
    type: "practice" as const,
  },
  {
    id: "evt-4",
    title: "Spring Showcase",
    team: "KC Thunder",
    date: "Apr 5",
    time: "9:00 AM",
    type: "tournament" as const,
  },
];

const typeStyles = {
  practice: "bg-blue-100 text-blue-700",
  game: "bg-emerald-100 text-emerald-700",
  tournament: "bg-amber-100 text-amber-700",
} as const;

const typeLabels = {
  practice: "Practice",
  game: "Game",
  tournament: "Tournament",
} as const;

export function UpcomingEvents() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {event.team} &middot; {event.date} at {event.time}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeStyles[event.type]}`}
              >
                {typeLabels[event.type]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
