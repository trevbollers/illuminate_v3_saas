"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Shield,
  MoreVertical,
  Loader2,
  Users,
  Trash2,
  Trophy,
  Medal,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@goparticipate/ui";

interface Team {
  _id: string;
  name: string;
  divisionKey: string;
  sport: string;
  season?: string;
  playerCount: number;
  isActive: boolean;
}

interface Achievement {
  teamName: string;
  eventName: string;
  division: string;
  bracketTier?: string;
  type: "champion" | "finalist";
}

const sportOptions = ["All Sports", "7v7 Football", "Basketball"];

export default function TeamsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All Sports");
  const [teams, setTeams] = useState<Team[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
    fetchAchievements();
  }, []);

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } else {
        console.error("Teams API returned:", res.status, res.statusText);
      }
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAchievements() {
    try {
      const res = await fetch("/api/teams/achievements");
      if (res.ok) {
        const data = await res.json();
        setAchievements(Array.isArray(data) ? data : []);
      }
    } catch {}
  }

  function getTeamAchievements(teamName: string): Achievement[] {
    return achievements.filter(
      (a) => a.teamName.toLowerCase() === teamName.toLowerCase(),
    );
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("Archive this team? It can be restored later.")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (res.ok) {
        setTeams((prev) => prev.filter((t) => t._id !== teamId));
      }
    } catch (err) {
      console.error("Failed to delete team:", err);
    }
  }

  const filtered = teams.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesSport = sport === "All Sports" || t.sport === sport;
    return matchesSearch && matchesSport;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s teams.
          </p>
        </div>
        <Button asChild>
          <Link href="/teams/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sportOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((team) => (
            <Link key={team._id} href={`/teams/${team._id}`}>
              <Card className="group overflow-hidden transition-shadow hover:shadow-md cursor-pointer">
                <div className="aspect-[4/2] bg-primary/5 flex flex-col items-center justify-center gap-2">
                  <Shield className="h-12 w-12 text-primary/30" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {team.sport}
                  </span>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold leading-tight">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {team.divisionKey}
                      </p>
                    </div>
                    <Badge variant="default" className="text-[10px] shrink-0">
                      active
                    </Badge>
                  </div>
                  {/* Achievement badges */}
                  {getTeamAchievements(team.name).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {getTeamAchievements(team.name).map((a, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            a.type === "champion"
                              ? a.bracketTier === "Silver"
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : a.bracketTier === "Bronze"
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : "bg-amber-50 text-amber-700 border border-amber-300"
                              : "bg-slate-50 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {a.type === "champion" ? (
                            <Trophy className={`h-3 w-3 ${
                              a.bracketTier === "Silver" ? "text-slate-500" :
                              a.bracketTier === "Bronze" ? "text-orange-500" :
                              "text-amber-500"
                            }`} />
                          ) : (
                            <Medal className="h-3 w-3 text-slate-400" />
                          )}
                          {a.type === "champion" ? "Champion" : "Finalist"}
                          {a.bracketTier ? ` (${a.bracketTier})` : ""}
                          {a.division ? ` — ${a.division}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {team.playerCount} players
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Division</TableHead>
                <TableHead className="text-center">Players</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>
                    <Link href={`/teams/${team._id}`} className="font-medium hover:underline">
                      {team.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {team.sport}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {team.divisionKey}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{team.playerCount}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/teams/${team._id}`}>View Roster</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteTeam(team._id)}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No teams found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {teams.length === 0
              ? "Create your first team to get started."
              : "Try adjusting your search or filter criteria."}
          </p>
          {teams.length === 0 && (
            <Button asChild className="mt-4">
              <Link href="/teams/new">
                <Plus className="mr-2 h-4 w-4" /> Create Team
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
