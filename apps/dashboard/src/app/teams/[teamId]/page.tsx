"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  UserPlus,
  Mail,
  Phone,
  Search,
  X,
  Trash2,
  Shield,
  Send,
  Clock,
  Check,
  Edit2,
  Save,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Badge,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Separator,
} from "@goparticipate/ui";

interface Team {
  _id: string;
  name: string;
  divisionKey: string;
  sport: string;
  season?: string;
}

interface RosterEntry {
  _id: string;
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
  status: string;
  joinedAt: string;
}

interface SearchedPlayer {
  _id: string;
  name: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

interface PendingInvite {
  _id: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

type AddMode = null | "existing" | "invite";

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add player state
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingPlayerId, setAddingPlayerId] = useState<string | null>(null);

  // Invite state
  const [inviteEntries, setInviteEntries] = useState<{ email: string; phone: string }[]>([
    { email: "", phone: "" },
  ]);
  const [sendingInvites, setSendingInvites] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJersey, setEditJersey] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const [teamRes, rosterRes, invitesRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`),
        fetch(`/api/teams/${teamId}/roster`),
        fetch(`/api/teams/${teamId}/invites`),
      ]);
      if (teamRes.ok) setTeam(await teamRes.json());
      if (rosterRes.ok) setRoster(await rosterRes.json());
      if (invitesRes.ok) setInvites(await invitesRes.json());
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Player search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults(await res.json());
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function addPlayerToRoster(player: SearchedPlayer) {
    setAddingPlayerId(player._id);
    setMessage(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player._id,
          playerName: player.name,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `${player.name} added to roster.` });
        setSearchQuery("");
        setSearchResults([]);
        // Refresh roster
        const rosterRes = await fetch(`/api/teams/${teamId}/roster`);
        if (rosterRes.ok) setRoster(await rosterRes.json());
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to add player." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to add player." });
    } finally {
      setAddingPlayerId(null);
    }
  }

  async function removePlayer(entry: RosterEntry) {
    if (!confirm(`Remove ${entry.playerName} from the roster?`)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/roster?rosterId=${entry._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRoster((prev) => prev.filter((r) => r._id !== entry._id));
        setMessage({ type: "success", text: `${entry.playerName} removed from roster.` });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to remove player." });
    }
  }

  async function sendInvites() {
    const valid = inviteEntries.filter((e) => e.email.trim() || e.phone.trim());
    if (valid.length === 0) return;

    setSendingInvites(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: valid.map((e) => ({
            email: e.email.trim() || undefined,
            phone: e.phone.trim() || undefined,
            role: "player",
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const sent = data.results.filter((r: any) => r.status === "sent").length;
        const smsPending = data.results.filter((r: any) => r.status === "sms_pending").length;
        const skipped = data.results.filter((r: any) => r.status === "skipped").length;

        let msg = "";
        if (sent > 0) msg += `${sent} email invite(s) sent. `;
        if (smsPending > 0) msg += `${smsPending} SMS invite(s) queued (share link manually). `;
        if (skipped > 0) msg += `${skipped} skipped (already invited). `;

        setMessage({ type: "success", text: msg.trim() || "Invites processed." });
        setInviteEntries([{ email: "", phone: "" }]);
        setAddMode(null);

        // Refresh invites
        const invitesRes = await fetch(`/api/teams/${teamId}/invites`);
        if (invitesRes.ok) setInvites(await invitesRes.json());
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to send invites." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to send invites." });
    } finally {
      setSendingInvites(false);
    }
  }

  function startEdit(entry: RosterEntry) {
    setEditingId(entry._id);
    setEditJersey(entry.jerseyNumber?.toString() || "");
    setEditPosition(entry.position || "");
  }

  async function saveEdit(entry: RosterEntry) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/roster/${entry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jerseyNumber: editJersey ? parseInt(editJersey, 10) : null,
          position: editPosition || null,
        }),
      });
      if (res.ok) {
        setRoster((prev) =>
          prev.map((r) =>
            r._id === entry._id
              ? {
                  ...r,
                  jerseyNumber: editJersey ? parseInt(editJersey, 10) : undefined,
                  position: editPosition || undefined,
                }
              : r,
          ),
        );
        setEditingId(null);
        setMessage({ type: "success", text: "Roster entry updated." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to update." });
    } finally {
      setSavingEdit(false);
    }
  }

  function addInviteRow() {
    setInviteEntries((prev) => [...prev, { email: "", phone: "" }]);
  }

  function removeInviteRow(index: number) {
    setInviteEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInviteRow(index: number, field: "email" | "phone", value: string) {
    setInviteEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Team not found.
        <br />
        <Link href="/teams" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/teams"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
            <p className="text-sm text-muted-foreground">
              {team.sport} · {team.divisionKey}
              {team.season && ` · ${team.season}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" /> {roster.length} players
          </Badge>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Player Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Roster</CardTitle>
              <CardDescription>
                Add existing players or invite new ones via email or text.
              </CardDescription>
            </div>
            {addMode === null && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setAddMode("existing")}
                >
                  <UserPlus className="h-3 w-3" /> Add Existing Player
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => setAddMode("invite")}
                >
                  <Send className="h-3 w-3" /> Invite Parent / Player
                </Button>
              </div>
            )}
            {addMode !== null && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAddMode(null);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Search existing players panel */}
        {addMode === "existing" && (
          <CardContent className="border-t pt-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search players by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  {searchResults.map((player) => {
                    const alreadyOnRoster = roster.some((r) => r.playerId === player._id);
                    const age = player.dateOfBirth
                      ? Math.floor(
                          (Date.now() - new Date(player.dateOfBirth).getTime()) /
                            (365.25 * 24 * 60 * 60 * 1000),
                        )
                      : null;
                    return (
                      <div
                        key={player._id}
                        className="flex items-center justify-between border-b p-3 last:border-b-0"
                      >
                        <div>
                          <span className="text-sm font-medium">{player.name}</span>
                          {age !== null && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              Age {age}
                            </span>
                          )}
                        </div>
                        {alreadyOnRoster ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Check className="h-3 w-3" /> On Roster
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={addingPlayerId === player._id}
                            onClick={() => addPlayerToRoster(player)}
                          >
                            {addingPlayerId === player._id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                <p className="text-sm text-muted-foreground">
                  No players found. Try a different name or{" "}
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => setAddMode("invite")}
                  >
                    invite them instead
                  </button>
                  .
                </p>
              )}
            </div>
          </CardContent>
        )}

        {/* Invite panel */}
        {addMode === "invite" && (
          <CardContent className="border-t pt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send an invite via email or provide a phone number. The parent will receive a link to
                create an account and add their player to this team.
              </p>

              {inviteEntries.map((entry, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">
                      <Mail className="mr-1 inline h-3 w-3" /> Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="parent@example.com"
                      value={entry.email}
                      onChange={(e) => updateInviteRow(i, "email", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">
                      <Phone className="mr-1 inline h-3 w-3" /> Phone (optional)
                    </Label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={entry.phone}
                      onChange={(e) => updateInviteRow(i, "phone", e.target.value)}
                    />
                  </div>
                  {inviteEntries.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => removeInviteRow(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={addInviteRow}>
                  + Add Another
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={sendInvites}
                  disabled={
                    sendingInvites ||
                    inviteEntries.every((e) => !e.email.trim() && !e.phone.trim())
                  }
                >
                  {sendingInvites ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Send {inviteEntries.filter((e) => e.email.trim() || e.phone.trim()).length} Invite(s)
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        {/* Roster table */}
        <CardContent className={addMode !== null ? "border-t pt-4" : ""}>
          {roster.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Jersey</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((entry) =>
                  editingId === entry._id ? (
                    <TableRow key={entry._id} className="bg-muted/50">
                      <TableCell className="font-medium">{entry.playerName}</TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-16 text-center"
                          value={editJersey}
                          onChange={(e) => setEditJersey(e.target.value)}
                          placeholder="#"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 w-24"
                          value={editPosition}
                          onChange={(e) => setEditPosition(e.target.value)}
                          placeholder="Pos"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(entry.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600"
                            disabled={savingEdit}
                            onClick={() => saveEdit(entry)}
                          >
                            {savingEdit ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={entry._id}>
                      <TableCell className="font-medium">{entry.playerName}</TableCell>
                      <TableCell className="text-center">
                        {entry.jerseyNumber != null ? `#${entry.jerseyNumber}` : "—"}
                      </TableCell>
                      <TableCell>
                        {entry.position ? (
                          <Badge variant="outline" className="text-xs">
                            {entry.position}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(entry.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => startEdit(entry)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removePlayer(entry)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No players on this roster yet. Add existing players or send invites to parents.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invites</CardTitle>
            <CardDescription>
              Invitations waiting to be accepted. Invites expire after 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {inv.email ? (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {inv.email || inv.phone}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {inv.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
