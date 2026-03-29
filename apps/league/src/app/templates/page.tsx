"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Badge } from "@goparticipate/ui/src/components/badge";

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  body: string;
  isSystem: boolean;
  createdByName?: string;
  suggestedPriority?: "normal" | "urgent";
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  scheduling: "Scheduling",
  payment: "Payment",
  roster: "Roster",
  event: "Event",
  safety: "Safety",
  custom: "Custom",
};

const CATEGORIES = [
  "general",
  "scheduling",
  "event",
  "roster",
  "safety",
  "custom",
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  // Edit / Create state
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("custom");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formPriority, setFormPriority] = useState<"normal" | "urgent" | "">(
    ""
  );

  const fetchTemplates = useCallback(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormCategory("custom");
    setFormSubject("");
    setFormBody("");
    setFormPriority("");
    setFormError("");
  }

  function startCreate() {
    resetForm();
    setEditing(null);
    setCreating(true);
  }

  function startEdit(t: Template) {
    setFormName(t.name);
    setFormDescription(t.description);
    setFormCategory(t.category);
    setFormSubject(t.subject);
    setFormBody(t.body);
    setFormPriority(t.suggestedPriority || "");
    setFormError("");
    setCreating(false);
    setEditing(t._id);
  }

  function cancelForm() {
    resetForm();
    setCreating(false);
    setEditing(null);
  }

  async function handleSave() {
    setFormError("");
    if (!formName.trim() || !formBody.trim()) {
      setFormError("Name and body are required");
      return;
    }

    setSaving(true);
    const payload = {
      name: formName.trim(),
      description: formDescription.trim(),
      category: formCategory,
      subject: formSubject.trim(),
      body: formBody.trim(),
      suggestedPriority: formPriority || undefined,
    };

    try {
      const url = editing ? `/api/templates/${editing}` : "/api/templates";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      fetchTemplates();
      cancelForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t._id !== id));
        if (editing === id) cancelForm();
      }
    } catch {
      // silently fail
    }
  }

  const filtered =
    filter === "all"
      ? templates
      : filter === "system"
        ? templates.filter((t) => t.isSystem)
        : filter === "custom_only"
          ? templates.filter((t) => !t.isSystem)
          : templates.filter((t) => t.category === filter);

  const systemCount = templates.filter((t) => t.isSystem).length;
  const customCount = templates.filter((t) => !t.isSystem).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcement Templates</h1>
          <p className="text-sm text-muted-foreground">
            {systemCount} built-in, {customCount} custom templates
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "system", label: "Built-in" },
          { key: "custom_only", label: "Custom" },
          { key: "scheduling", label: "Scheduling" },
          { key: "event", label: "Event" },
          { key: "roster", label: "Roster" },
          { key: "safety", label: "Safety" },
          { key: "general", label: "General" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create / Edit Form */}
      {(creating || editing) && (
        <div className="rounded-lg border border-blue-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {creating ? "New Template" : "Edit Template"}
            </h2>
            <button
              onClick={cancelForm}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Registration Open"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div className="space-y-2">
            <Label>Title / Subject line</Label>
            <Input
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="Pre-filled title for the announcement"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Body <span className="text-red-500">*</span>
            </Label>
            <textarea
              value={formBody}
              onChange={(e) => setFormBody(e.target.value)}
              placeholder="Template body text. Use [BRACKETS] for fields the user should fill in."
              rows={8}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              Use [BRACKETS] for placeholder fields like [EVENT NAME], [DATE],
              [VENUE].
            </p>
          </div>

          <div className="space-y-2">
            <Label>Suggested priority</Label>
            <select
              value={formPriority || "none"}
              onChange={(e) =>
                setFormPriority(
                  e.target.value === "none"
                    ? ""
                    : (e.target.value as "normal" | "urgent")
                )
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {creating ? "Create Template" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3" />
          <p className="text-sm">No templates found</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={startCreate}
          >
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => (
            <div
              key={t._id}
              className={`rounded-lg border p-4 transition-colors ${
                editing === t._id ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </Badge>
                    {t.isSystem && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Built-in
                      </Badge>
                    )}
                    {t.suggestedPriority === "urgent" && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] shrink-0"
                      >
                        Urgent
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {t.description}
                    </p>
                  )}
                  {t.subject && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Title: {t.subject}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                    {t.body}
                  </p>
                </div>
                {!t.isSystem && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
