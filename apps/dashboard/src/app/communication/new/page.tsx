"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, X, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  Button,
  Input,
  Label,
  Textarea,
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

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  body: string;
  isSystem: boolean;
  suggestedPriority?: "normal" | "urgent";
  suggestedAckOptions?: string[];
}

type Channel = "team" | "parents" | "coaches" | "org";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  scheduling: "Scheduling",
  payment: "Payment",
  roster: "Roster",
  event: "Event",
  safety: "Safety",
  custom: "Custom",
};

export default function ComposeMessagePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  // Form state
  const [channel, setChannel] = useState<Channel>("parents");
  const [teamId, setTeamId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [requiresAck, setRequiresAck] = useState(false);
  const [ackOptions, setAckOptions] = useState<string[]>([
    "Got it",
    "Can't make it",
  ]);
  const [emailDelivery, setEmailDelivery] = useState(true);
  const [smsDelivery, setSmsDelivery] = useState(false);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        setTeams(data.teams || []);
        if (data.teams?.length === 1) {
          setTeamId(data.teams[0]._id);
        }
      })
      .catch(() => {});

    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  function applyTemplate(template: Template) {
    setSubject(template.subject);
    setBody(template.body);
    if (template.suggestedPriority) {
      setPriority(template.suggestedPriority);
    }
    if (template.suggestedAckOptions?.length) {
      setRequiresAck(true);
      setAckOptions(template.suggestedAckOptions);
    }
    setShowTemplatePicker(false);
  }

  function startBlank() {
    setSubject("");
    setBody("");
    setPriority("normal");
    setRequiresAck(false);
    setAckOptions(["Got it", "Can't make it"]);
    setShowTemplatePicker(false);
  }

  const filteredTemplates =
    templateFilter === "all"
      ? templates
      : templates.filter((t) => t.category === templateFilter);

  const addAckOption = useCallback(() => {
    setAckOptions((prev) => [...prev, ""]);
  }, []);

  const removeAckOption = useCallback((index: number) => {
    setAckOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAckOption = useCallback((index: number, value: string) => {
    setAckOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!body.trim()) {
      setError("Message body is required");
      return;
    }

    if (channel !== "org" && !teamId) {
      setError("Please select a team");
      return;
    }

    if (requiresAck) {
      const validOptions = ackOptions.filter((o) => o.trim());
      if (validOptions.length === 0) {
        setError("Add at least one response option");
        return;
      }
    }

    const deliveryChannels: string[] = ["in_app"];
    if (emailDelivery) deliveryChannels.push("email");
    if (smsDelivery) deliveryChannels.push("sms");

    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: channel !== "org" ? teamId : undefined,
          channel,
          subject: subject.trim() || undefined,
          body: body.trim(),
          priority,
          requiresAck,
          ackOptions: requiresAck
            ? ackOptions.filter((o) => o.trim())
            : [],
          deliveryChannels,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      const data = await res.json();
      router.push(`/communication/${data.message._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setSending(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/communication">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Message</h1>
        {!showTemplatePicker && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setShowTemplatePicker(true)}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Templates
          </Button>
        )}
      </div>

      {/* Template Picker */}
      {showTemplatePicker && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Start with a template
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Choose a template to pre-fill your message, or start from scratch.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Category filter */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "all", label: "All" },
                { key: "scheduling", label: "Scheduling" },
                { key: "payment", label: "Payment" },
                { key: "roster", label: "Roster" },
                { key: "event", label: "Event" },
                { key: "safety", label: "Safety" },
                { key: "general", label: "General" },
                { key: "custom", label: "Custom" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTemplateFilter(f.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    templateFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Blank option */}
            <button
              type="button"
              onClick={startBlank}
              className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Blank Message</p>
                <p className="text-xs text-muted-foreground">
                  Start from scratch
                </p>
              </div>
            </button>

            {/* Template list */}
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-2 max-h-72 overflow-y-auto">
                {filteredTemplates.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {t.name}
                        </p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </Badge>
                        {t.suggestedPriority === "urgent" && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {t.description || t.body.slice(0, 80)}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredTemplates.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No templates in this category
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Channel + Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Channel selector */}
            <div className="space-y-2">
              <Label>Send to</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { key: "parents", label: "Parents" },
                    { key: "coaches", label: "Coaches" },
                    { key: "team", label: "Full Team" },
                    { key: "org", label: "Org-wide" },
                  ] as const
                ).map((ch) => (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => setChannel(ch.key)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      channel === ch.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Team selector — hidden for org-wide */}
            {channel !== "org" && (
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Practice cancelled Thursday"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message..."
                rows={6}
              />
            </div>

            {/* Priority toggle */}
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
                  Highlighted in red. SMS delivery available for urgent
                  messages.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Acknowledgement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acknowledgement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">
                  Require acknowledgement
                </span>
                <p className="text-xs text-muted-foreground">
                  Recipients must tap a response. You'll see who responded.
                </p>
              </div>
            </label>

            {requiresAck && (
              <div className="space-y-2 pl-7">
                <Label>Response options</Label>
                {ackOptions.map((option, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateAckOption(i, e.target.value)}
                      placeholder="e.g., Got it"
                    />
                    {ackOptions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAckOption(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAckOption}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add option
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-3 opacity-50 cursor-not-allowed">
              <input
                type="checkbox"
                checked
                disabled
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">In-app (always)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailDelivery}
                onChange={(e) => setEmailDelivery(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Email</span>
            </label>

            {priority === "urgent" && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsDelivery}
                  onChange={(e) => setSmsDelivery(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm">SMS</span>
                  <p className="text-xs text-muted-foreground">
                    Only sent to recipients who opted in to SMS
                  </p>
                </div>
              </label>
            )}
          </CardContent>
        </Card>

        {/* Error + Submit */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/communication">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Message
          </Button>
        </div>
      </form>
    </div>
  );
}
