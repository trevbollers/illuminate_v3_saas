"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Users } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@goparticipate/ui";

interface Team {
  _id: string;
  name: string;
}

interface OrgEvent {
  _id: string;
  title: string;
  type: string;
  startTime: string;
  teamId: string;
}

interface AttendanceRecord {
  _id: string;
  playerId: string;
  playerName: string;
  status: "present" | "absent" | "late" | "excused";
  rsvp: "yes" | "no" | "maybe" | "no_response";
  checkedInAt?: string;
  notes?: string;
}

type Status = AttendanceRecord["status"];

const STATUS_CONFIG: Record<Status, { icon: typeof CheckCircle2; color: string; label: string }> = {
  present: { icon: CheckCircle2, color: "text-green-600", label: "Present" },
  late: { icon: Clock, color: "text-yellow-600", label: "Late" },
  excused: { icon: AlertCircle, color: "text-blue-600", label: "Excused" },
  absent: { icon: XCircle, color: "text-red-500", label: "Absent" },
};

export default function AttendancePage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [eventInfo, setEventInfo] = useState<{ title: string; teamName?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch teams on mount
  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams || []))
      .catch(() => {});
  }, []);

  // Fetch upcoming events
  useEffect(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7); // include recent past events
    const end = new Date(now);
    end.setDate(end.getDate() + 30);

    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });
    if (teamFilter !== "all") params.set("teamId", teamFilter);

    fetch(`/api/schedule?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data.events || []).sort(
          (a: OrgEvent, b: OrgEvent) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setEvents(sorted);
        setSelectedEventId("");
        setAttendance([]);
        setEventInfo(null);
        setInitialized(false);
      })
      .catch(() => {});
  }, [teamFilter]);

  // Fetch attendance when event selected
  const fetchAttendance = useCallback(async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance || []);
        setEventInfo(data.event);
        setInitialized(data.attendance.length > 0);
      }
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) fetchAttendance(selectedEventId);
  }, [selectedEventId, fetchAttendance]);

  // Initialize attendance from roster
  async function handleInitialize() {
    if (!selectedEventId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance || []);
        setInitialized(true);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  // Update a single player's status
  async function handleStatusChange(playerId: string, status: Status) {
    // Optimistic update
    setAttendance((prev) =>
      prev.map((r) => (r.playerId === playerId ? { ...r, status } : r))
    );

    try {
      await fetch(`/api/attendance/${selectedEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [{ playerId, status }] }),
      });
    } catch {
      // Revert on failure
      fetchAttendance(selectedEventId);
    }
  }

  // Mark all present
  async function handleMarkAllPresent() {
    setSaving(true);
    const updates = attendance.map((r) => ({
      playerId: r.playerId,
      status: "present",
    }));

    setAttendance((prev) => prev.map((r) => ({ ...r, status: "present" as const })));

    try {
      await fetch(`/api/attendance/${selectedEventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
    } catch {
      fetchAttendance(selectedEventId);
    } finally {
      setSaving(false);
    }
  }

  const presentCount = attendance.filter((r) => r.status === "present").length;
  const lateCount = attendance.filter((r) => r.status === "late").length;
  const absentCount = attendance.filter((r) => r.status === "absent").length;
  const excusedCount = attendance.filter((r) => r.status === "excused").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
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

        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent>
            {events.length === 0 ? (
              <SelectItem value="_none" disabled>
                No upcoming events
              </SelectItem>
            ) : (
              events.map((e) => (
                <SelectItem key={e._id} value={e._id}>
                  {new Date(e.startTime).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  — {e.title} ({e.type})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {!selectedEventId ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mb-3" />
          <p className="text-sm">Select an event to take attendance</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !initialized ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Attendance hasn't been started for this event yet.
            </p>
            <Button onClick={handleInitialize} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Attendance
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{presentCount} Present</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">{lateCount} Late</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">{absentCount} Absent</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{excusedCount} Excused</span>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {eventInfo?.title} — {eventInfo?.teamName}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllPresent}
              disabled={saving}
            >
              Mark All Present
            </Button>
          </div>

          {/* Roster checklist */}
          <Card>
            <CardContent className="divide-y p-0">
              {attendance.map((record) => {
                const config = STATUS_CONFIG[record.status];
                const Icon = config.icon;

                return (
                  <div
                    key={record._id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
                    <span className="flex-1 text-sm font-medium min-w-0 truncate">
                      {record.playerName}
                    </span>

                    {/* Status buttons — large touch targets for mobile */}
                    <div className="flex gap-1">
                      {(["present", "late", "excused", "absent"] as Status[]).map(
                        (s) => {
                          const sc = STATUS_CONFIG[s];
                          const isActive = record.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() =>
                                handleStatusChange(record.playerId, s)
                              }
                              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors min-w-[44px] ${
                                isActive
                                  ? s === "present"
                                    ? "bg-green-100 text-green-700"
                                    : s === "late"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : s === "excused"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-red-100 text-red-700"
                                  : "bg-muted text-muted-foreground hover:bg-accent"
                              }`}
                            >
                              <span className="hidden sm:inline">{sc.label}</span>
                              <span className="sm:hidden">{sc.label[0]}</span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
