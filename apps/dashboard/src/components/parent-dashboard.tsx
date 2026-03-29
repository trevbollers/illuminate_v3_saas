"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Shield,
  Calendar,
  MessageSquare,
  Loader2,
  MapPin,
  Clock,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@goparticipate/ui";

interface Summary {
  childCount: number;
  teamCount: number;
  upcomingEventCount: number;
  unreadMessageCount: number;
}

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
  }[];
}

interface FamilyEvent {
  _id: string;
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

export function ParentDashboard({ userName }: { userName: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/family/summary").then((r) => r.json()),
      fetch("/api/family/children").then((r) => r.json()),
      fetch("/api/family/schedule?days=7").then((r) => r.json()),
    ])
      .then(([summaryData, childrenData, scheduleData]) => {
        setSummary(summaryData);
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

  const hasChildren = children.length > 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening with your family this week.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary?.childCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Children</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary?.teamCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary?.upcomingEventCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary?.unreadMessageCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No children state */}
      {!hasChildren && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold mb-1">No children linked yet</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Your children will appear here once a coach adds them to a team
              roster and links them to your account.
            </p>
          </CardContent>
        </Card>
      )}

      {hasChildren && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Upcoming schedule */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Upcoming Schedule
                  </CardTitle>
                  <Link href="/family/schedule">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View all
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No events scheduled this week.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {events.slice(0, 8).map((event) => (
                      <div
                        key={event._id}
                        className="flex items-start gap-3 rounded-lg border p-3"
                      >
                        {/* Date block */}
                        <div className="flex flex-col items-center justify-center w-12 shrink-0">
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
                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium truncate">
                              {event.title}
                            </span>
                            <Badge
                              className={`text-[10px] ${
                                EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.other
                              }`}
                            >
                              {event.type}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                            {event.opponentName && (
                              <span>
                                vs {event.opponentName}
                                {event.homeAway
                                  ? ` (${event.homeAway})`
                                  : ""}
                              </span>
                            )}
                          </div>
                          {event.children.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {event.children.map((child) => (
                                <Badge
                                  key={child.id}
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {child.name}
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
          </div>

          {/* Right: My Children */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">My Children</CardTitle>
                  <Link href="/family/children">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View all
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {children.map((child) => (
                  <Link
                    key={child._id}
                    href={`/family/children`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {child.firstName[0]}
                      {child.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {child.firstName} {child.lastName}
                      </p>
                      {child.teams.length > 0 ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {child.teams.map((t) => t.teamName).join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No team assignment
                        </p>
                      )}
                    </div>
                    {child.age !== null && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        Age {child.age}
                      </span>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/communication" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Messages
                    {(summary?.unreadMessageCount ?? 0) > 0 && (
                      <Badge className="ml-auto bg-blue-500 text-white text-[10px]">
                        {summary!.unreadMessageCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/family/schedule" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <Calendar className="h-4 w-4" />
                    Full Schedule
                  </Button>
                </Link>
                <Link href="/roster" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    size="sm"
                  >
                    <Users className="h-4 w-4" />
                    Team Roster
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
