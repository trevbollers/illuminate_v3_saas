"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ClipboardList,
  Trophy,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// ─── Types ───

interface ScoringCategory {
  key: string;
  label: string;
  maxScore: number;
}

interface Registration {
  _id: string;
  playerId: string;
  playerName: string;
  ageGroup: string;
  tryoutNumber: number;
  paymentStatus: string;
  historicalBonus: number;
  historicalSummary: {
    seasonsWithOrg: number;
    totalGamesPlayed: number;
    attendanceRate: number;
    previousTryoutAvgScore?: number;
  };
}

interface Evaluation {
  _id: string;
  tryoutNumber: number;
  evaluatorName: string;
  sessionDay: number;
  rawTranscript: string;
  positives: string[];
  negatives: string[];
  scores: { category: string; score: number; aiSuggested?: number }[];
  overallSentiment: string;
  notes?: string;
}

interface Decision {
  _id: string;
  playerId: string;
  playerName: string;
  decision: string;
  teamName?: string;
  inviteStatus?: string;
}

interface Session {
  _id: string;
  name: string;
  sport: string;
  status: string;
  scoringCategories: ScoringCategory[];
  ageGroups: string[];
  dates: string[];
}

type Tab = "evaluate" | "players" | "decisions";

// ─── Page ───

export default function TryoutSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("evaluate");
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/tryouts/${sessionId}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([data, teamData]) => {
        setSession(data.session);
        setRegistrations(data.registrations || []);
        setEvaluations(data.evaluations || []);
        setDecisions(data.decisions || []);
        setTeams(Array.isArray(teamData) ? teamData : teamData.teams || []);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <div className="py-20 text-center text-muted-foreground">Session not found</div>;
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "evaluate", label: "Evaluate", icon: Mic },
    { key: "players", label: `Players (${registrations.length})`, icon: Users },
    { key: "decisions", label: "Decisions", icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tryouts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-sm text-muted-foreground">
            {session.status} · {session.ageGroups.join(", ")}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "evaluate" && (
        <EvaluateTab
          sessionId={sessionId}
          categories={session.scoringCategories}
          registrations={registrations}
          evaluations={evaluations}
          onNewEval={(e) => setEvaluations((prev) => [...prev, e])}
        />
      )}
      {tab === "players" && (
        <PlayersTab
          registrations={registrations}
          evaluations={evaluations}
          categories={session.scoringCategories}
        />
      )}
      {tab === "decisions" && (
        <DecisionsTab
          sessionId={sessionId}
          registrations={registrations}
          evaluations={evaluations}
          decisions={decisions}
          teams={teams}
          categories={session.scoringCategories}
          onDecision={(d) =>
            setDecisions((prev) => {
              const idx = prev.findIndex((p) => p.playerId === d.playerId);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = d;
                return updated;
              }
              return [...prev, d];
            })
          }
        />
      )}
    </div>
  );
}

// ─── Evaluate Tab (Voice + Scoring) ───

function EvaluateTab({
  sessionId,
  categories,
  registrations,
  evaluations,
  onNewEval,
}: {
  sessionId: string;
  categories: ScoringCategory[];
  registrations: Registration[];
  evaluations: Evaluation[];
  onNewEval: (e: Evaluation) => void;
}) {
  const [tryoutNumber, setTryoutNumber] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [positives, setPositives] = useState<string[]>([]);
  const [negatives, setNegatives] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState("neutral");
  const recognitionRef = useRef<any>(null);

  const player = registrations.find((r) => r.tryoutNumber === parseInt(tryoutNumber));
  const prevEvals = evaluations.filter((e) => e.tryoutNumber === parseInt(tryoutNumber));

  // Web Speech API
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final + interim);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }, [isListening]);

  // AI extraction
  const extractWithAI = async () => {
    if (!transcript.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch(`/api/tryouts/${sessionId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawTranscript: transcript,
          tryoutNumber: tryoutNumber ? parseInt(tryoutNumber) : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tryoutNumber && !tryoutNumber) {
          setTryoutNumber(data.tryoutNumber.toString());
        }
        if (data.positives) setPositives(data.positives);
        if (data.negatives) setNegatives(data.negatives);
        if (data.overallSentiment) setSentiment(data.overallSentiment);
        if (data.scores) {
          const scoreMap: Record<string, number> = {};
          for (const s of data.scores) scoreMap[s.category] = s.score;
          setScores(scoreMap);
        }
      }
    } catch {}
    setExtracting(false);
  };

  // Submit evaluation
  const submit = async () => {
    if (!tryoutNumber) return;
    setSubmitting(true);
    const res = await fetch(`/api/tryouts/${sessionId}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tryoutNumber: parseInt(tryoutNumber),
        sessionDay: 1,
        rawTranscript: transcript,
        scores: categories.map((c) => ({
          category: c.key,
          score: scores[c.key] || 0,
        })),
        positives,
        negatives,
        overallSentiment: sentiment,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onNewEval(data);
      // Reset form
      setTranscript("");
      setScores({});
      setPositives([]);
      setNegatives([]);
      setSentiment("neutral");
      setTryoutNumber("");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Player number input */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 flex-1">
          <label className="text-sm font-medium">Tryout #</label>
          <input
            type="number"
            min="1"
            value={tryoutNumber}
            onChange={(e) => setTryoutNumber(e.target.value)}
            placeholder="Enter bib number"
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-bold text-center"
          />
        </div>
        {player && (
          <div className="pb-2">
            <p className="font-medium">{player.playerName}</p>
            <p className="text-xs text-muted-foreground">
              {player.ageGroup}
              {player.historicalSummary.seasonsWithOrg > 0 &&
                ` · ${player.historicalSummary.seasonsWithOrg} season${player.historicalSummary.seasonsWithOrg > 1 ? "s" : ""}`}
            </p>
          </div>
        )}
      </div>

      {/* Previous evaluations for this player */}
      {prevEvals.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Previous evaluations ({prevEvals.length})
          </p>
          {prevEvals.map((ev) => (
            <div key={ev._id} className="text-xs mb-1">
              <span className="font-medium">{ev.evaluatorName}</span>
              <span className="text-muted-foreground"> — Day {ev.sessionDay}: </span>
              {ev.positives.length > 0 && (
                <span className="text-green-600">{ev.positives.join(", ")}</span>
              )}
              {ev.negatives.length > 0 && (
                <span className="text-red-600"> | {ev.negatives.join(", ")}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Voice capture */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Voice Notes</label>
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isListening
                ? "bg-red-100 text-red-700 animate-pulse"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? "Stop" : "Record"}
          </button>
        </div>
        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={isListening ? "Listening..." : "Tap Record or type notes here..."}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {transcript.trim() && (
          <button
            onClick={extractWithAI}
            disabled={extracting}
            className="flex items-center gap-2 rounded-md bg-purple-100 text-purple-700 px-3 py-1.5 text-sm font-medium hover:bg-purple-200 transition-colors"
          >
            {extracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {extracting ? "Extracting..." : "AI Extract Scores"}
          </button>
        )}
      </div>

      {/* Extracted positives / negatives */}
      {(positives.length > 0 || negatives.length > 0) && (
        <div className="flex gap-3">
          {positives.length > 0 && (
            <div className="flex-1 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
              {positives.map((p, i) => (
                <span key={i} className="inline-block rounded bg-green-100 text-green-800 px-2 py-0.5 text-xs mr-1 mb-1">
                  {p}
                </span>
              ))}
            </div>
          )}
          {negatives.length > 0 && (
            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Growth Areas</p>
              {negatives.map((n, i) => (
                <span key={i} className="inline-block rounded bg-red-100 text-red-800 px-2 py-0.5 text-xs mr-1 mb-1">
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scoring sliders */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Scores</p>
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-3">
            <span className="text-sm w-28 shrink-0">{cat.label}</span>
            <input
              type="range"
              min="0"
              max={cat.maxScore}
              value={scores[cat.key] || 0}
              onChange={(e) =>
                setScores((prev) => ({ ...prev, [cat.key]: parseInt(e.target.value) }))
              }
              className="flex-1"
            />
            <span className="text-sm font-bold w-8 text-center tabular-nums">
              {scores[cat.key] || 0}
            </span>
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={submit}
        disabled={!tryoutNumber || submitting}
        className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 w-full justify-center"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Save Evaluation
      </button>
    </div>
  );
}

// ─── Players Tab ───

function PlayersTab({
  registrations,
  evaluations,
  categories,
}: {
  registrations: Registration[];
  evaluations: Evaluation[];
  categories: ScoringCategory[];
}) {
  return (
    <div className="space-y-2">
      {registrations.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No players registered yet</p>
      ) : (
        registrations.map((reg) => {
          const evals = evaluations.filter((e) => e.tryoutNumber === reg.tryoutNumber);
          const avgScores: Record<string, number> = {};
          if (evals.length > 0) {
            for (const cat of categories) {
              const scores = evals.flatMap((e) => e.scores.filter((s) => s.category === cat.key).map((s) => s.score));
              avgScores[cat.key] = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
            }
          }
          const totalAvg = Object.values(avgScores).length > 0
            ? Math.round((Object.values(avgScores).reduce((a, b) => a + b, 0) / Object.values(avgScores).length) * 10) / 10
            : 0;

          return (
            <div key={reg._id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {reg.tryoutNumber}
                </div>
                <div>
                  <p className="font-medium">{reg.playerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {reg.ageGroup}
                    {reg.historicalSummary.seasonsWithOrg > 0 && ` · ${reg.historicalSummary.seasonsWithOrg}yr`}
                    {reg.historicalSummary.attendanceRate > 0 && ` · ${Math.round(reg.historicalSummary.attendanceRate * 100)}% att`}
                    {` · ${evals.length} eval${evals.length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {totalAvg > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{totalAvg}</p>
                    <p className="text-[10px] text-muted-foreground">avg score</p>
                  </div>
                )}
                {reg.historicalBonus > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-medium">
                    +{reg.historicalBonus} bonus
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Decisions Tab ───

function DecisionsTab({
  sessionId,
  registrations,
  evaluations,
  decisions,
  teams,
  categories,
  onDecision,
}: {
  sessionId: string;
  registrations: Registration[];
  evaluations: Evaluation[];
  decisions: Decision[];
  teams: { _id: string; name: string }[];
  categories: ScoringCategory[];
  onDecision: (d: Decision) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  const decide = async (reg: Registration, decision: string, teamId?: string) => {
    setSaving(reg._id);
    const res = await fetch(`/api/tryouts/${sessionId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registrationId: reg._id,
        decision,
        teamId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onDecision(data);
    }
    setSaving(null);
  };

  // Sort by avg score descending
  const sorted = [...registrations].sort((a, b) => {
    const aEvals = evaluations.filter((e) => e.tryoutNumber === a.tryoutNumber);
    const bEvals = evaluations.filter((e) => e.tryoutNumber === b.tryoutNumber);
    const aAvg = avgScore(aEvals, categories) + a.historicalBonus;
    const bAvg = avgScore(bEvals, categories) + b.historicalBonus;
    return bAvg - aAvg;
  });

  return (
    <div className="space-y-2">
      {sorted.map((reg, rank) => {
        const evals = evaluations.filter((e) => e.tryoutNumber === reg.tryoutNumber);
        const avg = avgScore(evals, categories);
        const total = avg + reg.historicalBonus;
        const existing = decisions.find((d) => d.playerId === reg.playerId);

        return (
          <div key={reg._id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">#{rank + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {reg.tryoutNumber}
                </div>
                <div>
                  <p className="font-medium">{reg.playerName}</p>
                  <p className="text-xs text-muted-foreground">{reg.ageGroup}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums">{total.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {avg.toFixed(1)} + {reg.historicalBonus} bonus
                </p>
              </div>
            </div>

            {/* Decision buttons */}
            {existing ? (
              <div className="flex items-center gap-2 mt-2">
                {existing.decision === "invited" ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Invited → {existing.teamName}
                    {existing.inviteStatus && (
                      <span className="text-xs text-muted-foreground ml-1">({existing.inviteStatus})</span>
                    )}
                  </span>
                ) : existing.decision === "waitlist" ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-yellow-700">
                    <Clock className="h-4 w-4" />
                    Waitlisted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-medium text-red-700">
                    <XCircle className="h-4 w-4" />
                    Not Invited
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {teams.map((team) => (
                  <button
                    key={team._id}
                    disabled={saving === reg._id}
                    onClick={() => decide(reg, "invited", team._id)}
                    className="rounded-full border bg-green-50 text-green-700 px-3 py-1 text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    → {team.name}
                  </button>
                ))}
                <button
                  disabled={saving === reg._id}
                  onClick={() => decide(reg, "waitlist")}
                  className="rounded-full border bg-yellow-50 text-yellow-700 px-3 py-1 text-xs font-medium hover:bg-yellow-100"
                >
                  Waitlist
                </button>
                <button
                  disabled={saving === reg._id}
                  onClick={() => decide(reg, "not_invited")}
                  className="rounded-full border bg-red-50 text-red-700 px-3 py-1 text-xs font-medium hover:bg-red-100"
                >
                  Not Invited
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function avgScore(evals: Evaluation[], categories: ScoringCategory[]): number {
  if (evals.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const cat of categories) {
    const scores = evals.flatMap((e) =>
      e.scores.filter((s) => s.category === cat.key).map((s) => s.score),
    );
    if (scores.length > 0) {
      total += scores.reduce((a, b) => a + b, 0) / scores.length;
      count++;
    }
  }
  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}
