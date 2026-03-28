"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
} from "@goparticipate/ui";
import { EVENT_TYPE_LABELS, ALL_EVENT_TYPES } from "@/lib/schedule-utils";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const schema = z.object({
  teamId: z.string().min(1, "Team is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum(["practice", "game", "scrimmage", "meeting", "tournament", "tryout", "other"]),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  notes: z.string().optional(),
  opponentName: z.string().optional(),
  homeAway: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TeamOption {
  _id: string;
  name: string;
  sport: string;
}

export default function NewScheduleEventPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "practice",
      isRecurring: false,
    },
  });

  const eventType = watch("type");
  const isRecurring = watch("isRecurring");
  const recurrenceFrequency = watch("recurrenceFrequency");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) =>
        setTeams(
          (data || []).map((t: any) => ({
            _id: t._id,
            name: t.name,
            sport: t.sport,
          })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingTeams(false));
  }, []);

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError("");

    const startTime = new Date(`${data.startDate}T${data.startTime}`);
    const endTime = new Date(`${data.endDate}T${data.endTime}`);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      setError("Invalid date or time.");
      setSaving(false);
      return;
    }

    const body: any = {
      teamId: data.teamId,
      title: data.title,
      type: data.type,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    if (data.locationName) {
      body.location = {
        name: data.locationName,
        address: data.locationAddress || undefined,
      };
    }

    if (data.type === "game") {
      if (data.opponentName) body.opponentName = data.opponentName;
      if (data.homeAway) body.homeAway = data.homeAway;
    }

    if (data.notes) body.notes = data.notes;

    if (data.isRecurring && data.recurrenceFrequency) {
      body.recurrence = {
        frequency: data.recurrenceFrequency,
        daysOfWeek:
          (data.recurrenceFrequency === "weekly" || data.recurrenceFrequency === "biweekly") &&
          selectedDays.length > 0
            ? selectedDays
            : undefined,
        endDate: data.recurrenceEndDate || undefined,
      };
    }

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/schedule");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create event.");
      }
    } catch {
      setError("Failed to create event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/schedule">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Event</h1>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Team <span className="text-red-500">*</span>
              </Label>
              {loadingTeams ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading teams...
                </div>
              ) : (
                <Select
                  value={watch("teamId") || ""}
                  onValueChange={(v) => setValue("teamId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name} ({t.sport})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.teamId && (
                <p className="text-xs text-red-500">{errors.teamId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Tuesday Practice, vs Westside Warriors"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={eventType}
                onValueChange={(v) => setValue("type", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {EVENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate && (
                  <p className="text-xs text-red-500">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input type="time" {...register("startTime")} />
                {errors.startTime && (
                  <p className="text-xs text-red-500">{errors.startTime.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input type="date" {...register("endDate")} />
                {errors.endDate && (
                  <p className="text-xs text-red-500">{errors.endDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input type="time" {...register("endTime")} />
                {errors.endTime && (
                  <p className="text-xs text-red-500">{errors.endTime.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Venue Name</Label>
              <Input
                placeholder="e.g. Swope Park Field 3"
                {...register("locationName")}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="e.g. 3999 E Meyer Blvd, Kansas City, MO"
                {...register("locationAddress")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Game-specific */}
        {eventType === "game" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Game Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Opponent</Label>
                <Input
                  placeholder="e.g. Westside Warriors"
                  {...register("opponentName")}
                />
              </div>
              <div className="space-y-2">
                <Label>Home / Away</Label>
                <Select
                  value={watch("homeAway") || ""}
                  onValueChange={(v) => setValue("homeAway", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="neutral">Neutral Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recurrence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recurrence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                {...register("isRecurring")}
              />
              <span className="text-sm font-medium">Repeat this event</span>
            </label>

            {isRecurring && (
              <>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={recurrenceFrequency || ""}
                    onValueChange={(v) => setValue("recurrenceFrequency", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="How often?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(recurrenceFrequency === "weekly" ||
                  recurrenceFrequency === "biweekly") && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          className={`h-9 w-9 rounded-full text-xs font-medium transition-colors ${
                            selectedDays.includes(d.value)
                              ? "bg-primary text-primary-foreground"
                              : "border hover:bg-muted"
                          }`}
                          onClick={() => toggleDay(d.value)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Repeat Until</Label>
                  <Input type="date" {...register("recurrenceEndDate")} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Additional details, instructions, or reminders..."
              rows={3}
              {...register("notes")}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Create Event
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
