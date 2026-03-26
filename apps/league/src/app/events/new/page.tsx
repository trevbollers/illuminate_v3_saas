"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Textarea } from "@goparticipate/ui/src/components/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  DollarSign,
  Settings2,
  Plus,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";

const STEPS = [
  { key: "basics", label: "Basics", icon: CalendarDays },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "pricing", label: "Pricing", icon: DollarSign },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

interface LocationForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  fields: string[];
  notes: string;
}

interface DayForm {
  date: string;
  startTime: string;
  endTime: string;
  label: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("basics");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basics
  const [name, setName] = useState("");
  const [type, setType] = useState("tournament");
  const [sport, setSport] = useState("7v7_football");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 2: Locations
  const [locations, setLocations] = useState<LocationForm[]>([
    { name: "", address: "", city: "", state: "", zip: "", fields: [""], notes: "" },
  ]);

  // Step 3: Schedule
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState("");
  const [registrationClose, setRegistrationClose] = useState("");
  const [rosterLockDate, setRosterLockDate] = useState("");
  const [days, setDays] = useState<DayForm[]>([
    { date: "", startTime: "08:00", endTime: "18:00", label: "" },
  ]);

  // Step 4: Pricing
  const [priceAmount, setPriceAmount] = useState("");
  const [earlyBirdAmount, setEarlyBirdAmount] = useState("");
  const [earlyBirdDeadline, setEarlyBirdDeadline] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [multiTeamDiscounts, setMultiTeamDiscounts] = useState<{ minTeams: string; discountPercent: string }[]>([]);

  // Step 5: Settings
  const [gameDuration, setGameDuration] = useState("40");
  const [halfDuration, setHalfDuration] = useState("20");
  const [timeBetween, setTimeBetween] = useState("10");
  const [clockType, setClockType] = useState("running");
  const [maxRosterSize, setMaxRosterSize] = useState("15");
  const [maxTeamsPerDiv, setMaxTeamsPerDiv] = useState("");
  const [estimatedTeamsPerDiv, setEstimatedTeamsPerDiv] = useState("8");
  const [requireAgeVerification, setRequireAgeVerification] = useState(true);
  const [requireWaiver, setRequireWaiver] = useState(true);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.key);
  }
  function goPrev() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  }

  function addLocation() {
    setLocations([
      ...locations,
      { name: "", address: "", city: "", state: "", zip: "", fields: [""], notes: "" },
    ]);
  }
  function removeLocation(i: number) {
    setLocations(locations.filter((_, idx) => idx !== i));
  }
  function updateLocation(i: number, field: string, value: string) {
    const copy = [...locations];
    const loc = copy[i];
    if (loc) { (loc as any)[field] = value; setLocations(copy); }
  }
  function addField(locIdx: number) {
    const copy = [...locations];
    const loc = copy[locIdx];
    if (loc) { loc.fields.push(""); setLocations(copy); }
  }
  function updateField(locIdx: number, fieldIdx: number, value: string) {
    const copy = [...locations];
    const loc = copy[locIdx];
    if (loc) { loc.fields[fieldIdx] = value; setLocations(copy); }
  }
  function removeField(locIdx: number, fieldIdx: number) {
    const copy = [...locations];
    const loc = copy[locIdx];
    if (loc) { loc.fields = loc.fields.filter((_, i) => i !== fieldIdx); setLocations(copy); }
  }

  function addDay() {
    setDays([...days, { date: "", startTime: "08:00", endTime: "18:00", label: "" }]);
  }
  function removeDay(i: number) {
    setDays(days.filter((_, idx) => idx !== i));
  }
  function updateDay(i: number, field: keyof DayForm, value: string) {
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setStep("basics");
      setError("Event name is required");
      return;
    }
    if (!startDate || !endDate) {
      setStep("schedule");
      setError("Start and end dates are required");
      return;
    }
    if (!registrationOpen || !registrationClose) {
      setStep("schedule");
      setError("Registration dates are required");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name,
      type,
      sport,
      description,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      locations: locations
        .filter((l) => l.name.trim())
        .map((l) => ({
          ...l,
          fields: l.fields.filter((f) => f.trim()),
        })),
      startDate,
      endDate,
      registrationOpen,
      registrationClose,
      rosterLockDate: rosterLockDate || undefined,
      days: days
        .filter((d) => d.date)
        .map((d) => ({
          ...d,
          date: d.date,
        })),
      pricing: {
        amount: Math.round(parseFloat(priceAmount || "0") * 100),
        earlyBirdAmount: earlyBirdAmount
          ? Math.round(parseFloat(earlyBirdAmount) * 100)
          : undefined,
        earlyBirdDeadline: earlyBirdDeadline || undefined,
        refundPolicy: refundPolicy || undefined,
        multiTeamDiscounts: multiTeamDiscounts
          .filter((d) => d.minTeams && d.discountPercent)
          .map((d) => ({
            minTeams: parseInt(d.minTeams),
            discountPercent: parseInt(d.discountPercent),
          })),
      },
      settings: {
        gameDurationMinutes: parseInt(gameDuration) || 40,
        halfDurationMinutes: parseInt(halfDuration) || 20,
        timeBetweenGamesMinutes: parseInt(timeBetween) || 10,
        clockType,
        maxRosterSize: parseInt(maxRosterSize) || undefined,
        requireAgeVerification,
        requireWaiver,
      },
      maxTeamsPerDivision: parseInt(maxTeamsPerDiv) || undefined,
      estimatedTeamsPerDivision: parseInt(estimatedTeamsPerDiv) || undefined,
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create event");
      }

      const event = await res.json();
      router.push(`/events/${event._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Event</h1>
          <p className="text-sm text-muted-foreground">
            Set up a new tournament, season, showcase, or combine.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone = i < stepIndex;
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(s.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isDone
                    ? "bg-blue-50 text-blue-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* ── Step 1: Basics ─── */}
          {step === "basics" && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Event Details</CardTitle>
              <div className="space-y-2">
                <Label>Event Name *</Label>
                <Input
                  placeholder="Spring 7v7 Kickoff Classic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="tournament">Tournament</option>
                    <option value="league_season">League Season</option>
                    <option value="showcase">Showcase</option>
                    <option value="combine">Combine</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Sport</Label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="7v7_football">7v7 Football</option>
                    <option value="basketball">Basketball</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Tell teams about this event..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    placeholder="events@midamerica7v7.org"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Locations ─── */}
          {step === "locations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Locations</CardTitle>
                <Button variant="outline" size="sm" onClick={addLocation} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Location
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Events can span multiple venues. Add each location and its fields/courts.
              </p>

              {locations.map((loc, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Location {i + 1}
                    </span>
                    {locations.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLocation(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Venue Name *</Label>
                    <Input
                      placeholder="Swope Soccer Village"
                      value={loc.name}
                      onChange={(e) => updateLocation(i, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="6310 Lewis Rd"
                      value={loc.address}
                      onChange={(e) => updateLocation(i, "address", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input
                        placeholder="Kansas City"
                        value={loc.city}
                        onChange={(e) => updateLocation(i, "city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input
                        placeholder="MO"
                        value={loc.state}
                        onChange={(e) => updateLocation(i, "state", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ZIP</Label>
                      <Input
                        placeholder="64132"
                        value={loc.zip}
                        onChange={(e) => updateLocation(i, "zip", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Fields / Courts</Label>
                      <Button variant="ghost" size="sm" onClick={() => addField(i)} className="h-7 gap-1 text-xs">
                        <Plus className="h-3 w-3" /> Add
                      </Button>
                    </div>
                    {loc.fields.map((f, fi) => (
                      <div key={fi} className="flex gap-2">
                        <Input
                          placeholder={`Field ${fi + 1}`}
                          value={f}
                          onChange={(e) => updateField(i, fi, e.target.value)}
                          className="flex-1"
                        />
                        {loc.fields.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeField(i, fi)}>
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Parking info, gate access, etc."
                      value={loc.notes}
                      onChange={(e) => updateLocation(i, "notes", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 3: Schedule ─── */}
          {step === "schedule" && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Schedule</CardTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Event Start Date *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Event End Date *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Registration Opens *</Label>
                  <Input type="date" value={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Registration Closes *</Label>
                  <Input type="date" value={registrationClose} onChange={(e) => setRegistrationClose(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Roster Lock Date</Label>
                <Input type="date" value={rosterLockDate} onChange={(e) => setRosterLockDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">After this date, teams cannot modify their roster.</p>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Event Days</Label>
                    <p className="text-xs text-muted-foreground">Define the daily schedule for each day.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addDay} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Day
                  </Button>
                </div>
                {days.map((d, i) => (
                  <div key={i} className="mt-3 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={d.date} onChange={(e) => updateDay(i, "date", e.target.value)} />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">Start</Label>
                      <Input type="time" value={d.startTime} onChange={(e) => updateDay(i, "startTime", e.target.value)} />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label className="text-xs">End</Label>
                      <Input type="time" value={d.endTime} onChange={(e) => updateDay(i, "endTime", e.target.value)} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Label</Label>
                      <Input placeholder="Pool Play" value={d.label} onChange={(e) => updateDay(i, "label", e.target.value)} />
                    </div>
                    {days.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeDay(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: Pricing ─── */}
          {step === "pricing" && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Pricing & Registration Fees</CardTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Registration Fee (per team)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={priceAmount}
                      onChange={(e) => setPriceAmount(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Early Bird Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={earlyBirdAmount}
                      onChange={(e) => setEarlyBirdAmount(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              {earlyBirdAmount && (
                <div className="space-y-2">
                  <Label>Early Bird Deadline</Label>
                  <Input
                    type="date"
                    value={earlyBirdDeadline}
                    onChange={(e) => setEarlyBirdDeadline(e.target.value)}
                  />
                </div>
              )}
              {/* Multi-Team Discounts */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Multi-Team Discounts</Label>
                    <p className="text-xs text-muted-foreground">Offer discounts when an org registers multiple teams.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setMultiTeamDiscounts([...multiTeamDiscounts, { minTeams: "2", discountPercent: "10" }])}
                  >
                    <Plus className="h-3 w-3" /> Add Tier
                  </Button>
                </div>
                {multiTeamDiscounts.map((d, i) => (
                  <div key={i} className="mt-2 flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Min Teams</Label>
                      <Input
                        type="number"
                        value={d.minTeams}
                        onChange={(e) => {
                          const copy = [...multiTeamDiscounts];
                          copy[i] = { ...copy[i]!, minTeams: e.target.value, discountPercent: copy[i]!.discountPercent };
                          setMultiTeamDiscounts(copy);
                        }}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Discount %</Label>
                      <Input
                        type="number"
                        value={d.discountPercent}
                        onChange={(e) => {
                          const copy = [...multiTeamDiscounts];
                          copy[i] = { ...copy[i]!, minTeams: copy[i]!.minTeams, discountPercent: e.target.value };
                          setMultiTeamDiscounts(copy);
                        }}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMultiTeamDiscounts(multiTeamDiscounts.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Refund Policy</Label>
                <Textarea
                  placeholder="Full refund if canceled before registration close. No refunds after roster lock date."
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ── Step 5: Settings ─── */}
          {step === "settings" && (
            <div className="space-y-4">
              <CardTitle className="text-lg">Game & Event Settings</CardTitle>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Game Duration (min)</Label>
                  <Input type="number" value={gameDuration} onChange={(e) => setGameDuration(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Half Duration (min)</Label>
                  <Input type="number" value={halfDuration} onChange={(e) => setHalfDuration(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Time Between Games (min)</Label>
                  <Input type="number" value={timeBetween} onChange={(e) => setTimeBetween(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Clock Type</Label>
                  <select
                    value={clockType}
                    onChange={(e) => setClockType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="running">Running Clock</option>
                    <option value="stop">Stop Clock</option>
                    <option value="mixed">Mixed (Running → Stop in final 2 min)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Max Roster Size</Label>
                  <Input type="number" value={maxRosterSize} onChange={(e) => setMaxRosterSize(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Max Teams Per Division</Label>
                  <Input type="number" placeholder="No limit" value={maxTeamsPerDiv} onChange={(e) => setMaxTeamsPerDiv(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Teams Per Division</Label>
                  <Input type="number" placeholder="8" value={estimatedTeamsPerDiv} onChange={(e) => setEstimatedTeamsPerDiv(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Used by AI to pre-generate schedules before teams register.</p>
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Age Verification</Label>
                    <p className="text-xs text-muted-foreground">Players must have verified birth certificates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireAgeVerification}
                    onChange={(e) => setRequireAgeVerification(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Waiver</Label>
                    <p className="text-xs text-muted-foreground">Teams must submit signed waivers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireWaiver}
                    onChange={(e) => setRequireWaiver(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-blue-600"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {stepIndex < STEPS.length - 1 ? (
          <Button onClick={goNext} className="gap-1 bg-blue-600 hover:bg-blue-700">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="gap-1 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                Create Event <Check className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
