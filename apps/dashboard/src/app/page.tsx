"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  DollarSign,
  Trophy,
  Loader2,
  MessageSquare,
  UserPlus,
  ClipboardList,
  MapPin,
  Clock,
  Shield,
} from "lucide-react";

interface DashboardData {
  stats: {
    activePlayers: number;
    teamCount: number;
    upcomingEventCount: number;
    outstandingPayments: number;
    wins: number;
    losses: number;
  };
  upcomingEvents: {
    title: string;
    type: string;
    date: string;
    location: string;
    teams: string[];
    source: string;
    leagueName?: string;
    status?: string;
  }[];
  recentActivity: {
    type: string;
    text: string;
    date: string;
  }[];
}

const TYPE_ICONS: Record<string, string> = {
  practice: "Practice",
  game: "Game",
  tournament: "Tournament",
  meeting: "Meeting",
  tryout: "Tryout",
};

const ACTIVITY_ICONS: Record<string, typeof Users> = {
  roster_add: UserPlus,
  message: MessageSquare,
  invite_accepted: UserPlus,
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data?.stats || {
    activePlayers: 0,
    teamCount: 0,
    upcomingEventCount: 0,
    outstandingPayments: 0,
    wins: 0,
    losses: 0,
  };

  const record = `${stats.wins}-${stats.losses}`;
  const hasRecord = stats.wins > 0 || stats.losses > 0;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening with your organization.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Players"
          value={stats.activePlayers.toString()}
          subtitle={`${stats.teamCount} team${stats.teamCount !== 1 ? "s" : ""}`}
          icon={Users}
          href="/roster"
        />
        <StatCard
          title="Upcoming Events"
          value={stats.upcomingEventCount.toString()}
          subtitle={stats.upcomingEventCount > 0 ? "View schedule" : "No events scheduled"}
          icon={Calendar}
          href="/schedule"
        />
        <StatCard
          title="Outstanding Payments"
          value={`$${(stats.outstandingPayments / 100).toFixed(2)}`}
          subtitle={stats.outstandingPayments > 0 ? "Pending collection" : "All caught up"}
          icon={DollarSign}
          href="/payments"
        />
        <StatCard
          title="Team Record"
          value={hasRecord ? record : "—"}
          subtitle={hasRecord ? "Combined W-L" : "No games played"}
          icon={Trophy}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming events */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-base font-semibold">Upcoming Events</h2>
              <Link href="/schedule" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y">
              {(data?.upcomingEvents || []).length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No upcoming events.{" "}
                    <Link href="/schedule" className="text-blue-600 hover:underline">
                      Create one
                    </Link>
                  </p>
                </div>
              ) : (
                (data?.upcomingEvents || []).map((ev, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      {ev.source === "league" ? (
                        <Trophy className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Calendar className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {ev.title}
                        </p>
                        {ev.source === "league" && ev.leagueName && (
                          <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                            {ev.leagueName}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(ev.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                      {ev.teams.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ev.teams.map((t, ti) => (
                            <span
                              key={ti}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">Recent Activity</h2>
            </div>
            <div className="divide-y">
              {(data?.recentActivity || []).length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No recent activity yet.
                  </p>
                </div>
              ) : (
                (data?.recentActivity || []).map((act, i) => {
                  const Icon = ACTIVITY_ICONS[act.type] || ClipboardList;
                  return (
                    <div key={i} className="flex items-start gap-3 px-5 py-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">{act.text}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(act.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-6 rounded-xl border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-base font-semibold">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { label: "Add Player", href: "/roster/new", icon: UserPlus },
                { label: "New Event", href: "/schedule", icon: Calendar },
                { label: "Send Message", href: "/communication", icon: MessageSquare },
                { label: "Manage Teams", href: "/teams", icon: Shield },
                { label: "Invite Coach", href: "/staff", icon: Users },
                { label: "View Payments", href: "/payments", icon: DollarSign },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <action.icon className="h-4 w-4 text-slate-400" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ───

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
