"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";

interface Event {
  _id: string;
  name: string;
}

interface Division {
  _id: string;
  name: string;
}

type TargetType = "all_registered" | "event" | "division";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [targetType, setTargetType] = useState<TargetType>("all_registered");
  const [targetEventId, setTargetEventId] = useState("");
  const [targetDivisionId, setTargetDivisionId] = useState("");
  const [emailDelivery, setEmailDelivery] = useState(true);

  const [events, setEvents] = useState<Event[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  useEffect(() => {
    fetch("/api/events?status=all")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch("/api/divisions")
      .then((r) => r.json())
      .then((data) => setDivisions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !body.trim()) {
      setError("Title and body are required");
      return;
    }

    if (targetType === "event" && !targetEventId) {
      setError("Please select an event");
      return;
    }
    if (targetType === "division" && !targetDivisionId) {
      setError("Please select a division");
      return;
    }

    const deliveryChannels: string[] = ["in_app"];
    if (emailDelivery) deliveryChannels.push("email");

    setSending(true);

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          priority,
          targetType,
          targetEventId: targetType === "event" ? targetEventId : undefined,
          targetDivisionId:
            targetType === "division" ? targetDivisionId : undefined,
          deliveryChannels,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }

      router.push("/announcements");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/announcements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Announcement</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Schedule change for Spring Classic"
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label>
            Message <span className="text-red-500">*</span>
          </Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your announcement..."
            rows={6}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Target */}
        <div className="space-y-2">
          <Label>Send to</Label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { key: "all_registered", label: "All Registered Orgs" },
                { key: "event", label: "Event" },
                { key: "division", label: "Division" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTargetType(t.key)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  targetType === t.key
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event selector */}
        {targetType === "event" && (
          <div className="space-y-2">
            <Label>Event</Label>
            <select
              value={targetEventId}
              onChange={(e) => setTargetEventId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select an event</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Division selector */}
        {targetType === "division" && (
          <div className="space-y-2">
            <Label>Division</Label>
            <select
              value={targetDivisionId}
              onChange={(e) => setTargetDivisionId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a division</option>
              {divisions.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={priority === "urgent"}
            onChange={(e) =>
              setPriority(e.target.checked ? "urgent" : "normal")
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium">Mark as urgent</span>
            <p className="text-xs text-muted-foreground">
              Highlighted in red for org admins
            </p>
          </div>
        </label>

        {/* Email delivery */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailDelivery}
            onChange={(e) => setEmailDelivery(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium">Send email notification</span>
            <p className="text-xs text-muted-foreground">
              Email registered org admins about this announcement
            </p>
          </div>
        </label>

        {/* Error + Submit */}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link href="/announcements">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Announcement
          </Button>
        </div>
      </form>
    </div>
  );
}
