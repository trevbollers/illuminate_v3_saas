"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Layers, Plus, Sparkles, Loader2, X, Trash2 } from "lucide-react";

interface Division {
  _id: string;
  key: string;
  label: string;
  sport: string;
  minAge: number;
  maxAge: number;
  skillLevel?: string;
  skillLevelLabel?: string;
  eventFormat?: string;
  bracketType?: string;
  minPoolGamesPerTeam?: number;
  teamsAdvancingPerPool?: number;
  estimatedTeamCount?: number;
  isActive: boolean;
  sortOrder: number;
}

interface SportTemplate {
  key: string;
  label: string;
  minAge: number;
  maxAge: number;
}

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  // Seed panel
  const [showSeedPanel, setShowSeedPanel] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [sportTemplates, setSportTemplates] = useState<SportTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [seedSkillLevels, setSeedSkillLevels] = useState<string[]>(["open"]);

  // Manual add
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    label: "", key: "", minAge: "", maxAge: "", skillLevel: "open", sport: "7v7_football",
  });

  // Deleting
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDivisions = useCallback(async () => {
    const res = await fetch("/api/divisions");
    if (res.ok) {
      const data = await res.json();
      setDivisions(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDivisions();
  }, [fetchDivisions]);

  // --- Seed from sport ---

  async function openSeedPanel(sportId: string) {
    setShowSeedPanel(true);
    setSeedLoading(true);
    try {
      const res = await fetch(`/api/sports/${sportId}`);
      if (res.ok) {
        const sport = await res.json();
        setSportTemplates(sport.divisionTemplates || []);
        setSelectedTemplates((sport.divisionTemplates || []).map((t: any) => t.key));
      }
    } catch { /* ignore */ }
    setSeedLoading(false);
  }

  function toggleTemplate(key: string) {
    setSelectedTemplates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleSkillLevel(level: string) {
    setSeedSkillLevels((prev) => {
      if (level === "open") return ["open"];
      const without = prev.filter((l) => l !== "open" && l !== level);
      if (prev.includes(level)) {
        return without.length === 0 ? ["open"] : without;
      }
      return [...without, level];
    });
  }

  async function seedDivisions() {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/divisions/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportId: "7v7_football", // TODO: derive from league tenant sport
          selectedTemplates,
          skillLevels: seedSkillLevels,
        }),
      });
      if (res.ok) {
        await fetchDivisions();
        setShowSeedPanel(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to seed divisions");
      }
    } catch {
      alert("Failed to seed divisions");
    }
    setSeedLoading(false);
  }

  // --- Manual add ---

  async function createDivision() {
    const res = await fetch("/api/divisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: addForm.label,
        key: addForm.key,
        sport: addForm.sport,
        minAge: parseInt(addForm.minAge) || 5,
        maxAge: parseInt(addForm.maxAge) || 18,
        skillLevel: addForm.skillLevel !== "open" ? addForm.skillLevel : undefined,
        skillLevelLabel: addForm.skillLevel === "D1" ? "Competitive"
          : addForm.skillLevel === "D2" ? "Intermediate"
          : addForm.skillLevel === "D3" ? "Recreational" : undefined,
      }),
    });
    if (res.ok) {
      await fetchDivisions();
      setShowAddForm(false);
      setAddForm({ label: "", key: "", minAge: "", maxAge: "", skillLevel: "open", sport: "7v7_football" });
    }
  }

  // --- Delete ---

  async function deleteDivision(id: string) {
    if (!confirm("Delete this division? This won't affect event-specific copies.")) return;
    setDeleting(id);
    await fetch(`/api/divisions/${id}`, { method: "DELETE" });
    await fetchDivisions();
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Divisions</h1>
          <p className="text-muted-foreground">
            Define your league&apos;s standard age groups and skill levels. Events inherit these as a starting point.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => openSeedPanel("7v7_football")}>
            <Sparkles className="h-3 w-3" /> Seed from Sport
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3 w-3" /> Add Division
          </Button>
        </div>
      </div>

      {/* Seed Panel */}
      {showSeedPanel && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Seed from Sport Templates</h4>
              <button type="button" onClick={() => setShowSeedPanel(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select age groups to add as league-wide division templates. These become the default divisions for new events.
            </p>

            {seedLoading && sportTemplates.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              </div>
            ) : (
              <>
                {/* Age Group Selection */}
                <div>
                  <Label className="text-xs font-semibold">Age Groups</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {sportTemplates.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => toggleTemplate(t.key)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedTemplates.includes(t.key)
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-gray-300 bg-white text-gray-600 hover:border-green-400"
                        }`}
                      >
                        {t.label} ({t.minAge}-{t.maxAge})
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-2">
                    <button type="button" onClick={() => setSelectedTemplates(sportTemplates.map((t) => t.key))} className="text-[11px] text-green-700 underline">Select All</button>
                    <button type="button" onClick={() => setSelectedTemplates([])} className="text-[11px] text-gray-500 underline">Clear</button>
                  </div>
                </div>

                {/* Skill Levels */}
                <div>
                  <Label className="text-xs font-semibold">Skill Levels</Label>
                  <p className="mb-1 text-[11px] text-muted-foreground">Creates a separate division per age group per skill level (e.g. U12 D1, U12 D2)</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "open", label: "Open (one per age group)" },
                      { value: "D1", label: "D1 (Competitive)" },
                      { value: "D2", label: "D2 (Intermediate)" },
                      { value: "D3", label: "D3 (Recreational)" },
                    ].map((lvl) => (
                      <button
                        key={lvl.value}
                        type="button"
                        onClick={() => toggleSkillLevel(lvl.value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          seedSkillLevels.includes(lvl.value)
                            ? "border-green-600 bg-green-600 text-white"
                            : "border-gray-300 bg-white text-gray-600 hover:border-green-400"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-md border bg-white p-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Preview: {selectedTemplates.length * seedSkillLevels.length} division{selectedTemplates.length * seedSkillLevels.length !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedTemplates.map((key) => {
                      const tmpl = sportTemplates.find((t) => t.key === key);
                      if (!tmpl) return null;
                      return seedSkillLevels.map((lvl) => {
                        const label = lvl === "open" ? tmpl.label : `${tmpl.label} ${lvl}`;
                        return <Badge key={`${key}-${lvl}`} variant="secondary" className="text-[10px]">{label}</Badge>;
                      });
                    })}
                  </div>
                </div>

                <div className="flex gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={seedDivisions}
                    disabled={seedLoading || selectedTemplates.length === 0}
                  >
                    {seedLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    Create {selectedTemplates.length * seedSkillLevels.length} Divisions
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSeedPanel(false)}>Cancel</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Add Form */}
      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Add Division</h4>
              <button type="button" onClick={() => setShowAddForm(false)} className="rounded-full p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={addForm.label} onChange={(e) => setAddForm({ ...addForm, label: e.target.value })} placeholder="e.g. U12 D1" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Key</Label>
                <Input value={addForm.key} onChange={(e) => setAddForm({ ...addForm, key: e.target.value })} placeholder="e.g. u12_d1" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Min Age</Label>
                <Input type="number" value={addForm.minAge} onChange={(e) => setAddForm({ ...addForm, minAge: e.target.value })} placeholder="9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Age</Label>
                <Input type="number" value={addForm.maxAge} onChange={(e) => setAddForm({ ...addForm, maxAge: e.target.value })} placeholder="12" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Skill Level</Label>
                <select value={addForm.skillLevel} onChange={(e) => setAddForm({ ...addForm, skillLevel: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="open">Open</option>
                  <option value="D1">D1 (Competitive)</option>
                  <option value="D2">D2 (Intermediate)</option>
                  <option value="D3">D3 (Recreational)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sport</Label>
                <select value={addForm.sport} onChange={(e) => setAddForm({ ...addForm, sport: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="7v7_football">7v7 Football</option>
                  <option value="basketball">Basketball</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 border-t pt-3">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={createDivision}>Create Division</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Division List */}
      {divisions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-3 text-lg font-medium">No divisions configured</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up your league&apos;s standard age divisions. Events will inherit these as their starting point.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => openSeedPanel("7v7_football")}>
                <Sparkles className="h-3 w-3" /> Seed from 7v7 Football
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => openSeedPanel("basketball")}>
                <Sparkles className="h-3 w-3" /> Seed from Basketball
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">League Divisions ({divisions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {divisions.map((d) => (
                <div key={d._id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <span className="text-xs font-bold">{d.label.replace(/[^A-Z0-9]/gi, "").slice(0, 3)}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{d.label}</h4>
                      <p className="text-xs text-muted-foreground">
                        Ages {d.minAge}-{d.maxAge}
                        {d.skillLevel && ` · ${d.skillLevel}`}
                        {d.skillLevelLabel && ` (${d.skillLevelLabel})`}
                        {" · "}{d.sport === "7v7_football" ? "7v7 Football" : "Basketball"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.isActive ? "default" : "secondary"} className="text-[10px]">
                      {d.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() => deleteDivision(d._id)}
                      disabled={deleting === d._id}
                    >
                      {deleting === d._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
