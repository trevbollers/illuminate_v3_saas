"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@goparticipate/ui";
import {
  Loader2,
  Plus,
  X,
  Medal,
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  Users,
} from "lucide-react";

interface Program {
  _id: string;
  name: string;
  slug: string;
  programType: string;
  sport: string;
  startDate: string;
  endDate?: string;
  fee: number;
  status: string;
  isPublic: boolean;
  isActive: boolean;
  location?: string;
  city?: string;
  state?: string;
  ageGroups?: { label: string; gender?: string; capacity?: number }[];
  capacity?: number;
}

const PROGRAM_TYPES = [
  { value: "tryout", label: "Tryout" },
  { value: "camp", label: "Camp" },
  { value: "clinic", label: "Clinic" },
  { value: "training", label: "Training" },
  { value: "tournament", label: "Tournament" },
  { value: "league_season", label: "League Season" },
  { value: "class", label: "Class / Lesson" },
  { value: "combine", label: "Combine" },
  { value: "showcase", label: "Showcase" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "registration_open", label: "Registration Open" },
  { value: "registration_closed", label: "Registration Closed" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const SPORTS = [
  { value: "7v7_football", label: "7v7 Football" },
  { value: "basketball", label: "Basketball" },
];

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    programType: "camp",
    sport: "7v7_football",
    description: "",
    startDate: "",
    endDate: "",
    fee: "",
    location: "",
    city: "",
    state: "",
    capacity: "",
    isPublic: true,
    status: "registration_open",
    ageGroupsText: "", // comma-separated: "12U Boys, 14U Boys, 16U Girls"
  });

  useEffect(() => {
    fetch("/api/programs")
      .then((r) => r.json())
      .then((data) => setPrograms(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const handleCreate = async () => {
    if (!form.name || !form.startDate) return;
    setSaving(true);

    const ageGroups = form.ageGroupsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({
        label,
        gender: label.toLowerCase().includes("girl") ? "girls" : label.toLowerCase().includes("boy") ? "boys" : "coed",
      }));

    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        programType: form.programType,
        sport: form.sport,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        fee: form.fee,
        location: form.location,
        city: form.city,
        state: form.state,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        isPublic: form.isPublic,
        isActive: true,
        status: form.status,
        ageGroups,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setPrograms((prev) => [created, ...prev]);
      setShowCreate(false);
      setForm({
        name: "", programType: "camp", sport: "7v7_football", description: "",
        startDate: "", endDate: "", fee: "", location: "", city: "", state: "",
        capacity: "", isPublic: true, status: "registration_open", ageGroupsText: "",
      });
    }
    setSaving(false);
  };

  const toggleStatus = async (id: string, newStatus: string) => {
    const res = await fetch(`/api/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPrograms((prev) => prev.map((p) => (p._id === id ? updated : p)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    registration_open: "bg-green-100 text-green-800",
    registration_closed: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-600",
    canceled: "bg-red-100 text-red-600",
  };

  const typeLabels: Record<string, string> = Object.fromEntries(
    PROGRAM_TYPES.map((t) => [t.value, t.label]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-muted-foreground">
            Camps, clinics, tryouts, tournaments, and open registrations.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Program
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Create Program</h2>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Summer Skills Camp 2026"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.programType}
                onChange={(e) => set("programType", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PROGRAM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sport</label>
              <select
                value={form.sport}
                onChange={(e) => set("sport", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fee}
                onChange={(e) => set("fee", e.target.value)}
                placeholder="0.00 = Free"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Capacity</label>
              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(e) => set("capacity", e.target.value)}
                placeholder="Unlimited"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Location</label>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Field name or facility"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">City, State</label>
              <div className="flex gap-2">
                <input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="City"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <input
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="ST"
                  maxLength={2}
                  className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Age Groups (comma-separated)</label>
              <input
                value={form.ageGroupsText}
                onChange={(e) => set("ageGroupsText", e.target.value)}
                placeholder="12U Boys, 14U Boys, 14U Girls, 16U Girls"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Program details, what to bring, etc."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => set("isPublic", e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Visible on public page</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={saving || !form.name || !form.startDate}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Program
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Programs list */}
      {programs.length === 0 && !showCreate ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Medal className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No programs yet</h3>
          <p className="text-muted-foreground mt-2">
            Create your first camp, clinic, tryout, or open registration.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((prog) => (
            <div key={prog._id} className="rounded-lg border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    {typeLabels[prog.programType] || prog.programType}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[prog.status] || "bg-gray-100 text-gray-600"}`}>
                    {prog.status.replace(/_/g, " ")}
                  </span>
                  {!prog.isPublic && (
                    <span className="rounded-full bg-gray-50 border px-2 py-0.5 text-[10px] text-gray-400">Hidden</span>
                  )}
                </div>
                <h3 className="font-semibold">{prog.name}</h3>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(new Date(prog.startDate), "MMM d, yyyy")}
                    {prog.endDate && prog.endDate !== prog.startDate && ` — ${format(new Date(prog.endDate), "MMM d, yyyy")}`}
                  </span>
                  {prog.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {prog.location}
                    </span>
                  )}
                  {prog.fee > 0 && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${(prog.fee / 100).toFixed(2)}
                    </span>
                  )}
                  {prog.ageGroups && prog.ageGroups.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {prog.ageGroups.map((a) => a.label).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {prog.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(prog._id, "registration_open")}>
                    Open Registration
                  </Button>
                )}
                {prog.status === "registration_open" && (
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(prog._id, "registration_closed")}>
                    Close Registration
                  </Button>
                )}
                {prog.programType === "tryout" && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/tryouts?program=${prog._id}`}>Manage Tryout</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
