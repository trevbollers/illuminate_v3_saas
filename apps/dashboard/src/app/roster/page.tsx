"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Upload,
  Edit2,
  ChevronDown,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@goparticipate/ui";

interface RosterPlayer {
  _id: string;
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
  status: string;
  joinedAt: string;
  teamId: string;
  teamName: string;
  teamSport?: string;
  teamDivision?: string;
  age: number | null;
  dateOfBirth?: string;
  gender?: string;
  hasEmergencyContact: boolean;
  hasMedicalNotes: boolean;
  verificationStatus: string;
}

interface TeamOption {
  _id: string;
  name: string;
  sport: string;
  divisionKey: string;
}

export default function RosterPage() {
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editJersey, setEditJersey] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/roster?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setRoster(data.roster);
        setTeams(data.teams);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchRoster();
  }, [fetchRoster]);

  const filtered = roster.filter((p) => {
    const matchesSearch =
      search === "" || p.playerName.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = teamFilter === "all" || p.teamId === teamFilter;
    return matchesSearch && matchesTeam;
  });

  // Get unique positions from the data
  const positions = [...new Set(roster.map((r) => r.position).filter(Boolean))].sort();

  async function saveEdit(entry: RosterPlayer) {
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${entry.teamId}/roster/${entry._id}`, {
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
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: RosterPlayer) {
    setEditingId(entry._id);
    setEditJersey(entry.jerseyNumber?.toString() || "");
    setEditPosition(entry.position || "");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roster</h1>
          <p className="text-muted-foreground">
            {roster.length} player{roster.length !== 1 ? "s" : ""} across{" "}
            {teams.length} team{teams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/roster/import">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/roster/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Player
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t._id} value={t._id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="injured">Injured</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">Age</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Info</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((player) =>
              editingId === player._id ? (
                <TableRow key={player._id} className="bg-muted/50">
                  <TableCell>
                    <Input
                      className="h-8 w-16 text-center"
                      value={editJersey}
                      onChange={(e) => setEditJersey(e.target.value)}
                      placeholder="#"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{player.playerName}</TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-24"
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      placeholder="Position"
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {player.teamName}
                  </TableCell>
                  <TableCell className="text-center">{player.age ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={player.status === "active" ? "default" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {player.status}
                    </Badge>
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={saving}
                        onClick={() => saveEdit(player)}
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={player._id} className="cursor-pointer">
                  <TableCell className="font-bold text-muted-foreground">
                    {player.jerseyNumber != null ? player.jerseyNumber : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {player.playerName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="font-medium">{player.playerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {player.position ? (
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {player.position}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {player.teamName}
                  </TableCell>
                  <TableCell className="text-center">{player.age ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        player.status === "active"
                          ? "default"
                          : player.status === "injured"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-[10px] capitalize"
                    >
                      {player.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {player.hasMedicalNotes && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" title="Has medical notes" />
                      )}
                      {player.verificationStatus === "verified" && (
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600" title="Verified" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => startEdit(player)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </Card>

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No players found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {roster.length === 0
              ? "Add players to your teams to see them here."
              : "Try adjusting your search or filter criteria."}
          </p>
          {roster.length === 0 && (
            <Button className="mt-4" asChild>
              <Link href="/roster/new">
                <Plus className="mr-2 h-4 w-4" /> Add Your First Player
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
