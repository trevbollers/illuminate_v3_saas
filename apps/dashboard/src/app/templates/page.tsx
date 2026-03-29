"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@goparticipate/ui";

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
  suggestedAckOptions?: string[];
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
  "payment",
  "roster",
  "event",
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
  const [formAckOptions, setFormAckOptions] = useState<string[]>([]);

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
    setFormAckOptions([]);
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
    setFormAckOptions(t.suggestedAckOptions || []);
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
      suggestedAckOptions: formAckOptions.filter((o) => o.trim()).length
        ? formAckOptions.filter((o) => o.trim())
        : undefined,
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
          <h1 className="text-2xl font-bold">Message Templates</h1>
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
          { key: "payment", label: "Payment" },
          { key: "roster", label: "Roster" },
          { key: "event", label: "Event" },
          { key: "safety", label: "Safety" },
          { key: "general", label: "General" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create / Edit Form */}
      {(creating || editing) && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {creating ? "New Template" : "Edit Template"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={cancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Practice Cancelled"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Label>Subject line</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Pre-filled subject for the message"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Message body <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Template message text. Use [BRACKETS] for fields the user should fill in."
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Use [BRACKETS] for placeholder fields like [DATE], [LOCATION],
                [PLAYER NAME].
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Suggested priority</Label>
                <Select
                  value={formPriority || "none"}
                  onValueChange={(v) =>
                    setFormPriority(v === "none" ? "" : (v as "normal" | "urgent"))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Suggested acknowledgement options</Label>
              {formAckOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...formAckOptions];
                      next[i] = e.target.value;
                      setFormAckOptions(next);
                    }}
                    placeholder="e.g., Got it"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFormAckOptions((prev) =>
                        prev.filter((_, idx) => idx !== i)
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormAckOptions((prev) => [...prev, ""])}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add option
              </Button>
            </div>

            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                {creating ? "Create Template" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
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
            <Card
              key={t._id}
              className={`transition-colors ${
                editing === t._id ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">
                        {t.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className="text-[10px] shrink-0"
                      >
                        {CATEGORY_LABELS[t.category] || t.category}
                      </Badge>
                      {t.isSystem && (
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                        >
                          Built-in
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
                        Subject: {t.subject}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                      {t.body}
                    </p>
                    {t.suggestedAckOptions?.length ? (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {t.suggestedAckOptions.map((opt, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
