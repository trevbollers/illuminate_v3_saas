"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Edit2,
  X,
  Save,
  Trash2,
  MapPin,
  Clock,
  Swords,
  CalendarDays,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Badge,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@goparticipate/ui";
import {
  type OrgEventDisplay,
  type EventType,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  ALL_EVENT_TYPES,
} from "@/lib/schedule-utils";

export default function ScheduleEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<OrgEventDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<EventType>("practice");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editLocationName, setEditLocationName] = useState("");
  const [editLocationAddress, setEditLocationAddress] = useState("");
  const [editOpponent, setEditOpponent] = useState("");
  const [editHomeAway, setEditHomeAway] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editOurScore, setEditOurScore] = useState("");
  const [editTheirScore, setEditTheirScore] = useState("");

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  async function fetchEvent() {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        populateEditFields(data);
      } else {
        setError("Event not found.");
      }
    } catch {
      setError("Failed to load event.");
    } finally {
      setLoading(false);
    }
  }

  function populateEditFields(ev: OrgEventDisplay) {
    setEditTitle(ev.title);
    setEditType(ev.type);
    const start = new Date(ev.startTime);
    const end = new Date(ev.endTime);
    setEditStartDate(format(start, "yyyy-MM-dd"));
    setEditStartTime(format(start, "HH:mm"));
    setEditEndDate(format(end, "yyyy-MM-dd"));
    setEditEndTime(format(end, "HH:mm"));
    setEditLocationName(ev.location?.name ?? "");
    setEditLocationAddress(ev.location?.address ?? "");
    setEditOpponent(ev.opponentName ?? "");
    setEditHomeAway(ev.homeAway ?? "");
    setEditNotes(ev.notes ?? "");
    setEditOurScore(ev.result?.ourScore?.toString() ?? "");
    setEditTheirScore(ev.result?.theirScore?.toString() ?? "");
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const startTime = new Date(`${editStartDate}T${editStartTime}`);
    const endTime = new Date(`${editEndDate}T${editEndTime}`);

    const body: any = {
      title: editTitle,
      type: editType,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: editNotes || undefined,
    };

    if (editLocationName) {
      body.location = { name: editLocationName, address: editLocationAddress || undefined };
    } else {
      body.location = undefined;
    }

    if (editType === "game") {
      body.opponentName = editOpponent || undefined;
      body.homeAway = editHomeAway || undefined;

      if (editOurScore || editTheirScore) {
        const our = parseInt(editOurScore, 10);
        const their = parseInt(editTheirScore, 10);
        body.result = {
          ourScore: isNaN(our) ? undefined : our,
          theirScore: isNaN(their) ? undefined : their,
          outcome:
            !isNaN(our) && !isNaN(their)
              ? our > their
                ? "win"
                : our < their
                  ? "loss"
                  : "tie"
              : undefined,
        };
      }
    }

    try {
      const res = await fetch(`/api/schedule/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setEvent({ ...event!, ...updated });
        setEditing(false);
        fetchEvent();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save.");
      }
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    try {
      await fetch(`/api/schedule/${eventId}`, { method: "DELETE" });
      router.push("/schedule");
    } catch {
      setError("Failed to cancel event.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/schedule">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground">{error || "Event not found."}</p>
      </div>
    );
  }

  const colors = EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other;
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/schedule">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold h-auto py-1"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {event.title}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}>
              {EVENT_TYPE_LABELS[event.type] ?? event.type}
            </span>
            <span className="text-sm text-muted-foreground">{event.teamName}</span>
            {event.isCancelled && (
              <Badge variant="destructive" className="text-[10px]">
                Cancelled
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  populateEditFields(event);
                }}
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Cancel Event
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Date & Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">
                <CalendarDays className="inline h-4 w-4 mr-1.5 text-muted-foreground" />
                {format(start, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground ml-6">
                {format(start, "h:mm a")} — {format(end, "h:mm a")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Venue Name</Label>
                <Input value={editLocationName} onChange={(e) => setEditLocationName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Address</Label>
                <Input value={editLocationAddress} onChange={(e) => setEditLocationAddress(e.target.value)} />
              </div>
            </div>
          ) : event.location?.name ? (
            <div>
              <p className="font-medium">{event.location.name}</p>
              {event.location.address && (
                <p className="text-sm text-muted-foreground">{event.location.address}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No location set</p>
          )}
        </CardContent>
      </Card>

      {/* Game Details */}
      {(event.type === "game" || editType === "game") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="h-4 w-4" /> Game Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Opponent</Label>
                  <Input value={editOpponent} onChange={(e) => setEditOpponent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Home / Away</Label>
                  <Select value={editHomeAway} onValueChange={setEditHomeAway}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                      <SelectItem value="neutral">Neutral Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Score (after game)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Us"
                      value={editOurScore}
                      onChange={(e) => setEditOurScore(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="number"
                      placeholder="Them"
                      value={editTheirScore}
                      onChange={(e) => setEditTheirScore(e.target.value)}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {event.opponentName && (
                  <p className="font-medium">
                    vs {event.opponentName}
                    {event.homeAway && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {event.homeAway === "home" ? "Home" : event.homeAway === "away" ? "Away" : "Neutral"}
                      </Badge>
                    )}
                  </p>
                )}
                {event.result?.outcome && (
                  <p className="text-sm">
                    Result:{" "}
                    <Badge
                      variant={event.result.outcome === "win" ? "default" : "secondary"}
                    >
                      {event.result.outcome.toUpperCase()}
                    </Badge>
                    {event.result.ourScore != null && event.result.theirScore != null && (
                      <span className="ml-2 font-mono">
                        {event.result.ourScore} - {event.result.theirScore}
                      </span>
                    )}
                  </p>
                )}
                {!event.opponentName && !event.result?.outcome && (
                  <p className="text-sm text-muted-foreground">No game details set</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recurrence */}
      {event.recurrence?.frequency && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4" /> Recurrence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Repeats{" "}
              <span className="font-medium">
                {event.recurrence.frequency === "biweekly"
                  ? "every 2 weeks"
                  : event.recurrence.frequency}
              </span>
              {event.recurrence.daysOfWeek && event.recurrence.daysOfWeek.length > 0 && (
                <span>
                  {" "}
                  on{" "}
                  {event.recurrence.daysOfWeek
                    .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                    .join(", ")}
                </span>
              )}
              {event.recurrence.endDate && (
                <span> until {format(new Date(event.recurrence.endDate), "MMM d, yyyy")}</span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          ) : event.notes ? (
            <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes</p>
          )}
        </CardContent>
      </Card>

      {/* RSVP Section */}
      <RsvpCard eventId={eventId} />

      {/* Cancel Event Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Event
            </DialogTitle>
            <DialogDescription>
              This will cancel "{event.title}". The event will be removed from the schedule.
              {event.recurrence?.frequency &&
                " This will cancel all occurrences of this recurring event."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Keep Event
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── RSVP Card (visible to parents) ───

function RsvpCard({ eventId }: { eventId: string }) {
  const [players, setPlayers] = useState<{ playerId: string; name: string; rsvp: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rsvp?eventId=${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setPlayers(data.players || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [eventId]);

  if (!loaded || players.length === 0) return null;

  const handleRsvp = async (playerId: string, rsvp: string) => {
    setUpdating(playerId);
    const res = await fetch("/api/rsvp", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, playerId, rsvp }),
    });
    if (res.ok) {
      setPlayers((prev) =>
        prev.map((p) => (p.playerId === playerId ? { ...p, rsvp } : p)),
      );
    }
    setUpdating(null);
  };

  const rsvpOptions = [
    { value: "yes", label: "Going", color: "bg-green-100 text-green-800 border-green-300" },
    { value: "no", label: "Not Going", color: "bg-red-100 text-red-800 border-red-300" },
    { value: "maybe", label: "Maybe", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">RSVP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {players.map((player) => (
          <div key={player.playerId} className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{player.name}</span>
            <div className="flex gap-1.5">
              {rsvpOptions.map((opt) => (
                <button
                  key={opt.value}
                  disabled={updating === player.playerId}
                  onClick={() => handleRsvp(player.playerId, opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    player.rsvp === opt.value
                      ? opt.color
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
