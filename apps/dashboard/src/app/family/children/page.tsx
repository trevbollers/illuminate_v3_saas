"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Loader2,
  Shield,
  Calendar,
  MapPin,
  Clock,
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

interface Child {
  _id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  photo?: string;
  verificationStatus: string;
  teams: {
    teamId: string;
    teamName: string;
    sport: string;
    season: string;
    jerseyNumber?: number;
    position?: string;
    rosterStatus: string;
  }[];
}

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

const VERIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  verified: { label: "Verified", color: "bg-green-100 text-green-700" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  unverified: { label: "Unverified", color: "bg-gray-100 text-gray-600" },
  expired: { label: "Expired", color: "bg-red-100 text-red-700" },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  practice: "bg-green-100 text-green-700",
  game: "bg-blue-100 text-blue-700",
  scrimmage: "bg-orange-100 text-orange-700",
  tournament: "bg-purple-100 text-purple-700",
  meeting: "bg-gray-100 text-gray-700",
  tryout: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-700",
};

export default function MyChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/family/children").then((r) => r.json()),
      fetch("/api/family/schedule?days=14").then((r) => r.json()),
    ])
      .then(([childrenData, scheduleData]) => {
        setChildren(childrenData.children || []);
        setEvents(scheduleData.events || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter events by selected child
  const filteredEvents = selectedChild
    ? events.filter((e) => e.children.some((c) => c.id === selectedChild))
    : events;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Children</h1>
        <p className="text-sm text-muted-foreground">
          {children.length} {children.length === 1 ? "child" : "children"}{" "}
          across{" "}
          {new Set(children.flatMap((c) => c.teams.map((t) => t.teamId))).size}{" "}
          teams
        </p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold mb-1">
              No children linked yet
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Your children will appear here once a coach adds them to a team
              roster and links them to your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Child filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedChild(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedChild === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {children.map((child) => (
              <button
                key={child._id}
                onClick={() => setSelectedChild(child._id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  selectedChild === child._id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {child.firstName}
              </button>
            ))}
          </div>

          {/* Children cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children
              .filter((c) => !selectedChild || c._id === selectedChild)
              .map((child) => {
                const verification =
                  VERIFICATION_LABELS[child.verificationStatus] ||
                  VERIFICATION_LABELS.unverified;

                return (
                  <Card key={child._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                          {child.firstName[0]}
                          {child.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate">
                              {child.firstName} {child.lastName}
                            </h3>
                            {child.age !== null && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                Age {child.age}
                              </span>
                            )}
                          </div>
                          <Badge
                            className={`mt-1 text-[10px] ${verification.color}`}
                          >
                            {verification.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Team assignments */}
                      {child.teams.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {child.teams.map((team) => (
                            <div
                              key={team.teamId}
                              className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
                            >
                              <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {team.teamName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {team.sport}
                                  {team.position ? ` · ${team.position}` : ""}
                                  {team.jerseyNumber
                                    ? ` · #${team.jerseyNumber}`
                                    : ""}
                                </p>
                              </div>
                              {team.rosterStatus !== "active" && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] capitalize"
                                >
                                  {team.rosterStatus}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          No active team assignment
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>

          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Upcoming Events
                  {selectedChild && (
                    <span className="ml-2 text-muted-foreground font-normal">
                      for{" "}
                      {children.find((c) => c._id === selectedChild)
                        ?.firstName || ""}
                    </span>
                  )}
                </CardTitle>
                <Link href="/family/schedule">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Full schedule
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No upcoming events in the next 2 weeks.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.slice(0, 10).map((event) => (
                    <div
                      key={event._id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex flex-col items-center justify-center w-10 shrink-0">
                        <span className="text-[10px] uppercase text-muted-foreground font-medium">
                          {new Date(event.startTime).toLocaleDateString(
                            undefined,
                            { weekday: "short" }
                          )}
                        </span>
                        <span className="text-lg font-bold">
                          {new Date(event.startTime).getDate()}
                        </span>
                      </div>
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
                            <Clock className="h-3 w-3" />
                            {new Date(event.startTime).toLocaleTimeString(
                              undefined,
                              { hour: "numeric", minute: "2-digit" }
                            )}
                          </span>
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
                        </div>
                        {event.children.length > 0 && !selectedChild && (
                          <div className="flex gap-1 mt-1">
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
