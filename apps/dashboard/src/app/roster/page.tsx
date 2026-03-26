"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
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

const players = [
  {
    id: "p-1",
    name: "Marcus Johnson",
    number: "7",
    position: "QB",
    team: "U14 Varsity",
    age: 13,
    status: "active" as const,
  },
  {
    id: "p-2",
    name: "DeShawn Williams",
    number: "12",
    position: "WR",
    team: "U14 Varsity",
    age: 14,
    status: "active" as const,
  },
  {
    id: "p-3",
    name: "Tyler Brooks",
    number: "23",
    position: "RB",
    team: "U14 Varsity",
    age: 13,
    status: "active" as const,
  },
  {
    id: "p-4",
    name: "Jordan Lewis",
    number: "88",
    position: "TE",
    team: "U12 Junior",
    age: 11,
    status: "active" as const,
  },
  {
    id: "p-5",
    name: "Cameron Davis",
    number: "54",
    position: "LB",
    team: "U12 Junior",
    age: 12,
    status: "active" as const,
  },
  {
    id: "p-6",
    name: "Aiden Torres",
    number: "3",
    position: "CB",
    team: "U14 Varsity",
    age: 14,
    status: "inactive" as const,
  },
];

const teamOptions = ["All Teams", "U14 Varsity", "U12 Junior"];
const positionOptions = ["All Positions", "QB", "WR", "RB", "TE", "LB", "CB", "OL", "DL", "S"];

export default function RosterPage() {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("All Teams");
  const [position, setPosition] = useState("All Positions");

  const filtered = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = team === "All Teams" || p.team === team;
    const matchesPosition = position === "All Positions" || p.position === position;
    return matchesSearch && matchesTeam && matchesPosition;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roster</h1>
          <p className="text-muted-foreground">
            Manage your players and team rosters.
          </p>
        </div>
        <Button asChild>
          <Link href="/roster/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Player
          </Link>
        </Button>
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
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teamOptions.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={position} onValueChange={setPosition}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positionOptions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-center">Age</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((player) => (
              <TableRow key={player.id} className="cursor-pointer">
                <TableCell className="font-bold text-muted-foreground w-12">
                  {player.number}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {player.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="font-medium">{player.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {player.position}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {player.team}
                </TableCell>
                <TableCell className="text-center">
                  {player.age}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={player.status === "active" ? "default" : "secondary"}
                    className="text-[10px] capitalize"
                  >
                    {player.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No players found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
