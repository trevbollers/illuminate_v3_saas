"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@goparticipate/ui/src/components/select";
import { Input } from "@goparticipate/ui/src/components/input";
import {
  Loader2,
  Trophy,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Sprout,
  Send,
  Eye,
} from "lucide-react";

// ─── Types ───

interface BracketMatch {
  matchNumber: number;
  round: number;
  roundLabel?: string;
  position: number;
  nextMatchNumber?: number;
  nextSlot?: "home" | "away";
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
  winnerName?: string;
  isBye?: boolean;
  gameId?: string;
  scheduledAt?: string;
  field?: string;
  status: "scheduled" | "in_progress" | "completed" | "canceled";
}

interface Bracket {
  _id: string;
  eventId: string;
  divisionId: string;
  name: string;
  type: string;
  matches: BracketMatch[];
  status: string;
}

interface Division {
  _id: string;
  key: string;
  label: string;
  bracketTiers?: { name: string; teamCount: number; bracketType: string }[];
}

interface EventSummary {
  _id: string;
  name: string;
  divisionIds: string[];
}

// ─── Component ───

export default function BracketsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracketId, setSelectedBracketId] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scoringMatch, setScoringMatch] = useState<BracketMatch | null>(null);
  const [scoreForm, setScoreForm] = useState({ homeScore: "", awayScore: "" });

  // Load events
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        const evts = Array.isArray(data) ? data : data.events || [];
        setEvents(evts);
        if (evts.length > 0) setSelectedEventId(evts[0]._id);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load divisions + brackets when event changes
  useEffect(() => {
    if (!selectedEventId) return;
    Promise.all([
      fetch(`/api/events/${selectedEventId}/divisions`).then((r) => r.json()),
      fetch(`/api/events/${selectedEventId}/brackets`).then((r) => r.json()),
    ]).then(([divs, bkts]) => {
      setDivisions(Array.isArray(divs) ? divs : divs.divisions || []);
      const bracketList = Array.isArray(bkts) ? bkts : [];
      setBrackets(bracketList);
      if (bracketList.length > 0) setSelectedBracketId(bracketList[0]._id);
      else setSelectedBracketId("");
    });
  }, [selectedEventId]);

  const selectedBracket = brackets.find((b) => b._id === selectedBracketId);

  // Generate brackets for all divisions
  // - Divisions with bracketTiers: one bracket per tier (pre-render shells)
  // - Divisions without tiers: one standard bracket from registered teams
  const generateBrackets = useCallback(async () => {
    if (!selectedEventId) return;
    setGenerating(true);
    const results: Bracket[] = [];
    for (const div of divisions) {
      const hasTiersDefined = div.bracketTiers && div.bracketTiers.length > 0;
      const res = await fetch(`/api/events/${selectedEventId}/brackets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divisionId: div._id,
          ...(hasTiersDefined ? { fromTiers: true } : {}),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        results.push(...(Array.isArray(data) ? data : [data]));
      }
    }
    setBrackets(results);
    if (results.length > 0) setSelectedBracketId(results[0]!._id);
    setGenerating(false);
  }, [selectedEventId, divisions]);

  // Seed brackets from pool play standings
  const seedFromStandings = useCallback(async () => {
    if (!selectedEventId || !selectedBracket) return;
    setSeeding(true);
    const res = await fetch(
      `/api/events/${selectedEventId}/brackets/seed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divisionId: selectedBracket.divisionId }),
      },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.brackets) {
        setBrackets((prev) => {
          const updated = [...prev];
          for (const b of data.brackets) {
            const idx = updated.findIndex((u) => u._id === b._id);
            if (idx >= 0) updated[idx] = b;
          }
          return updated;
        });
      }
    }
    setSeeding(false);
  }, [selectedEventId, selectedBracket]);

  // Publish/unpublish a bracket
  const togglePublish = useCallback(async () => {
    if (!selectedEventId || !selectedBracket) return;
    setPublishing(true);
    const newStatus = selectedBracket.status === "draft" ? "published" : "draft";
    const res = await fetch(
      `/api/events/${selectedEventId}/brackets/${selectedBracket._id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      },
    );
    if (res.ok) {
      const updated = await res.json();
      setBrackets((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b)),
      );
    }
    setPublishing(false);
  }, [selectedEventId, selectedBracket]);

  // Submit score
  const submitScore = useCallback(async () => {
    if (!scoringMatch || !selectedBracket) return;
    const res = await fetch(
      `/api/events/${selectedEventId}/brackets/${selectedBracket._id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchResult: {
            matchNumber: scoringMatch.matchNumber,
            homeScore: parseInt(scoreForm.homeScore) || 0,
            awayScore: parseInt(scoreForm.awayScore) || 0,
          },
        }),
      },
    );
    if (res.ok) {
      const updated = await res.json();
      setBrackets((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b)),
      );
    }
    setScoringMatch(null);
    setScoreForm({ homeScore: "", awayScore: "" });
  }, [scoringMatch, selectedBracket, selectedEventId, scoreForm]);

  const hasDivisions = divisions.length > 0;
  const hasTiers = divisions.some(
    (d) => d.bracketTiers && d.bracketTiers.length > 0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brackets</h1>
          <p className="text-muted-foreground">
            Generate and manage tournament brackets by division tier.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasDivisions && (
            <Button variant="outline" onClick={generateBrackets} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {hasTiers ? "Generate from Tiers" : "Generate Brackets"}
            </Button>
          )}

          {selectedBracket && selectedBracket.status === "draft" && (
            <>
              <Button variant="outline" onClick={seedFromStandings} disabled={seeding}>
                {seeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sprout className="mr-2 h-4 w-4" />
                )}
                Seed from Standings
              </Button>

              <Button onClick={togglePublish} disabled={publishing}>
                {publishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Publish Bracket
              </Button>
            </>
          )}

          {selectedBracket && selectedBracket.status === "published" && (
            <Button variant="outline" onClick={togglePublish} disabled={publishing}>
              {publishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Event selector */}
      {events.length > 1 && (
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e._id} value={e._id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Bracket tabs */}
      {brackets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {brackets.map((b) => (
            <button
              key={b._id}
              onClick={() => setSelectedBracketId(b._id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedBracketId === b._id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {/* Bracket visualization */}
      {selectedBracket ? (
        <BracketVisualization
          bracket={selectedBracket}
          onMatchClick={(match) => {
            if (
              match.status !== "completed" &&
              match.homeTeamName &&
              match.awayTeamName &&
              match.homeTeamName !== "BYE" &&
              match.awayTeamName !== "BYE"
            ) {
              setScoringMatch(match);
              setScoreForm({ homeScore: "", awayScore: "" });
            }
          }}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-medium">No brackets yet</h3>
            <p className="text-muted-foreground mt-2">
              {hasDivisions
                ? 'Click "Generate Brackets" to create brackets from registered teams and division tier definitions.'
                : "Create an event with divisions and registered teams first."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Score entry modal */}
      {scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-center text-lg">
                Enter Score — Game {scoringMatch.matchNumber}
              </CardTitle>
              <p className="text-muted-foreground text-center text-sm">
                {scoringMatch.roundLabel}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium truncate">
                    {scoringMatch.homeTeamName}
                  </p>
                  <Input
                    type="number"
                    min="0"
                    value={scoreForm.homeScore}
                    onChange={(e) =>
                      setScoreForm((f) => ({ ...f, homeScore: e.target.value }))
                    }
                    className="mt-2 text-center text-2xl font-bold"
                    autoFocus
                  />
                </div>
                <span className="text-muted-foreground text-lg font-bold">
                  vs
                </span>
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium truncate">
                    {scoringMatch.awayTeamName}
                  </p>
                  <Input
                    type="number"
                    min="0"
                    value={scoreForm.awayScore}
                    onChange={(e) =>
                      setScoreForm((f) => ({ ...f, awayScore: e.target.value }))
                    }
                    className="mt-2 text-center text-2xl font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setScoringMatch(null)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={submitScore}>
                  Save Score
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Bracket Visualization (CSS Grid + Pan/Zoom) ───

function BracketVisualization({
  bracket,
  onMatchClick,
}: {
  bracket: Bracket;
  onMatchClick: (match: BracketMatch) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Group matches by round
  const rounds = new Map<number, BracketMatch[]>();
  for (const match of bracket.matches) {
    if (!rounds.has(match.round)) rounds.set(match.round, []);
    rounds.get(match.round)!.push(match);
  }
  // Sort each round by position
  for (const [, matches] of rounds) {
    matches.sort((a, b) => a.position - b.position);
  }
  const sortedRounds = [...rounds.entries()].sort(([a], [b]) => a - b);

  // Zoom controls
  const zoomIn = () =>
    setTransform((t) => ({ ...t, scale: Math.min(t.scale + 0.2, 3) }));
  const zoomOut = () =>
    setTransform((t) => ({ ...t, scale: Math.max(t.scale - 0.2, 0.3) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Pan handlers (mouse + touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-match]")) return;
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setTransform((t) => ({
      ...t,
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    }));
  };
  const handlePointerUp = () => setDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.3, Math.min(3, t.scale + delta)),
    }));
  };

  const maxMatchesInRound = Math.max(
    ...sortedRounds.map(([, m]) => m.length),
    1,
  );
  const MATCH_HEIGHT = 80;
  const MATCH_GAP = 16;
  const ROUND_WIDTH = 240;
  const ROUND_GAP = 48;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">{bracket.name}</CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                bracket.status === "completed"
                  ? "default"
                  : bracket.status === "in_progress"
                    ? "secondary"
                    : "outline"
              }
            >
              {bracket.status}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {bracket.type.replace(/_/g, " ")}
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetView}
            title="Reset view"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="relative overflow-hidden cursor-grab active:cursor-grabbing"
          style={{ height: Math.max(500, maxMatchesInRound * (MATCH_HEIGHT + MATCH_GAP) + 40) }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
              position: "absolute",
              top: 20,
              left: 20,
            }}
          >
            {/* CSS Grid bracket layout */}
            <div
              className="relative"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${sortedRounds.length}, ${ROUND_WIDTH}px)`,
                gap: `0 ${ROUND_GAP}px`,
              }}
            >
              {sortedRounds.map(([roundNum, matches], roundIdx) => {
                // Each round's matches are vertically centered with increasing spacing
                const spacingMultiplier = Math.pow(2, roundIdx);
                const roundHeight =
                  maxMatchesInRound * (MATCH_HEIGHT + MATCH_GAP);

                return (
                  <div
                    key={roundNum}
                    className="relative"
                    style={{ height: roundHeight }}
                  >
                    {/* Round label */}
                    <div className="text-center text-xs font-semibold text-muted-foreground mb-2 sticky top-0">
                      {matches[0]?.roundLabel || `Round ${roundNum}`}
                    </div>

                    {/* Matches in this round */}
                    <div
                      className="flex flex-col justify-around h-full"
                      style={{ gap: `${MATCH_GAP * spacingMultiplier}px` }}
                    >
                      {matches.map((match) => (
                        <MatchCard
                          key={match.matchNumber}
                          match={match}
                          onClick={() => onMatchClick(match)}
                        />
                      ))}
                    </div>

                    {/* Connector lines to next round */}
                    {roundIdx < sortedRounds.length - 1 && (
                      <ConnectorLines
                        matches={matches}
                        allMatches={bracket.matches}
                        roundWidth={ROUND_WIDTH}
                        roundGap={ROUND_GAP}
                        matchHeight={MATCH_HEIGHT}
                        spacingMultiplier={spacingMultiplier}
                        matchGap={MATCH_GAP}
                        roundHeight={roundHeight}
                        matchCount={matches.length}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="text-muted-foreground px-4 pb-3 text-xs">
          Drag to pan. Scroll to zoom. Click a match to enter scores.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Match Card ───

function MatchCard({
  match,
  onClick,
}: {
  match: BracketMatch;
  onClick: () => void;
}) {
  const isCompleted = match.status === "completed";
  const isBye = match.isBye;
  const isPlayable =
    !isCompleted &&
    !isBye &&
    match.homeTeamName &&
    match.awayTeamName &&
    match.homeTeamName !== "BYE" &&
    match.awayTeamName !== "BYE";

  const homeWon =
    isCompleted &&
    match.homeScore !== undefined &&
    match.awayScore !== undefined &&
    match.homeScore > match.awayScore;
  const awayWon =
    isCompleted &&
    match.homeScore !== undefined &&
    match.awayScore !== undefined &&
    match.awayScore > match.homeScore;

  return (
    <div
      data-match
      onClick={isPlayable ? onClick : undefined}
      className={`
        rounded-lg border bg-card shadow-sm transition-all
        ${isPlayable ? "cursor-pointer hover:border-primary hover:shadow-md" : ""}
        ${isBye ? "opacity-50" : ""}
      `}
      style={{ width: 220, minHeight: 72 }}
    >
      {/* Game number */}
      <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/30 rounded-t-lg">
        <span className="text-[10px] text-muted-foreground font-medium">
          Game {match.matchNumber}
        </span>
        {isCompleted && (
          <Trophy className="h-3 w-3 text-yellow-500" />
        )}
        {match.status === "in_progress" && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
            LIVE
          </Badge>
        )}
      </div>

      {/* Teams */}
      <div className="divide-y">
        <TeamRow
          name={match.homeTeamName}
          score={match.homeScore}
          isWinner={homeWon}
          isCompleted={isCompleted}
        />
        <TeamRow
          name={match.awayTeamName}
          score={match.awayScore}
          isWinner={awayWon}
          isCompleted={isCompleted}
        />
      </div>
    </div>
  );
}

function TeamRow({
  name,
  score,
  isWinner,
  isCompleted,
}: {
  name?: string;
  score?: number;
  isWinner: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 ${
        isWinner ? "bg-green-50 dark:bg-green-950/30" : ""
      }`}
    >
      <span
        className={`text-sm truncate max-w-[160px] ${
          isWinner ? "font-bold" : name ? "font-medium" : "text-muted-foreground italic"
        }`}
      >
        {name || "TBD"}
      </span>
      {isCompleted && score !== undefined && (
        <span
          className={`text-sm tabular-nums ${isWinner ? "font-bold" : "text-muted-foreground"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Connector Lines (SVG overlay) ───

function ConnectorLines({
  matches,
  allMatches,
  roundWidth,
  roundGap,
  matchHeight,
  spacingMultiplier,
  matchGap,
  roundHeight,
  matchCount,
}: {
  matches: BracketMatch[];
  allMatches: BracketMatch[];
  roundWidth: number;
  roundGap: number;
  matchHeight: number;
  spacingMultiplier: number;
  matchGap: number;
  roundHeight: number;
  matchCount: number;
}) {
  // Simple bracket lines: pairs of matches connect to next round
  // We draw horizontal + vertical connectors
  const totalGap = matchGap * spacingMultiplier;
  const totalItemHeight = matchHeight + totalGap;
  const startY = (roundHeight - matchCount * totalItemHeight + totalGap) / 2;

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (let i = 0; i < matches.length; i += 2) {
    if (i + 1 >= matches.length) break;

    const y1 = startY + i * totalItemHeight + matchHeight / 2;
    const y2 = startY + (i + 1) * totalItemHeight + matchHeight / 2;
    const midY = (y1 + y2) / 2;

    // Horizontal line from match to midpoint
    lines.push({ x1: roundWidth, y1, x2: roundWidth + roundGap / 2, y2: y1 });
    lines.push({ x1: roundWidth, y1: y2, x2: roundWidth + roundGap / 2, y2: y2 });
    // Vertical connector
    lines.push({
      x1: roundWidth + roundGap / 2,
      y1,
      x2: roundWidth + roundGap / 2,
      y2: y2,
    });
    // Horizontal to next round
    lines.push({
      x1: roundWidth + roundGap / 2,
      y1: midY,
      x2: roundWidth + roundGap,
      y2: midY,
    });
  }

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: roundWidth + roundGap, height: roundHeight }}
    >
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-border"
        />
      ))}
    </svg>
  );
}
