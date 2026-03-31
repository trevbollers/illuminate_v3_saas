"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import { ArrowLeft, Loader2, Sparkles, CheckCircle2, FileSpreadsheet } from "lucide-react";

interface Team { _id: string; name: string; sport: string }
interface MappedPlayer {
  firstName: string; lastName: string; jerseyNumber?: string; position?: string;
  dateOfBirth?: string; parentEmail?: string; parentPhone?: string; parentName?: string;
  gender?: string; topSize?: string; bottomSize?: string; shoeSize?: string;
}

const TARGET_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "playerName", label: "Full Name (auto-splits)" },
  { key: "jerseyNumber", label: "Jersey #" },
  { key: "position", label: "Position" },
  { key: "dateOfBirth", label: "Date of Birth" },
  { key: "parentName", label: "Parent Name" },
  { key: "parentEmail", label: "Parent Email" },
  { key: "parentPhone", label: "Parent Phone" },
  { key: "gender", label: "Gender" },
  { key: "topSize", label: "Top Size" },
  { key: "bottomSize", label: "Bottom Size" },
  { key: "shoeSize", label: "Shoe Size" },
];

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export default function RosterImportPage() {
  const searchParams = useSearchParams();
  const teamIdParam = searchParams.get("teamId");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(teamIdParam || "");
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [aiMapping, setAiMapping] = useState(false);
  const [mappedPlayers, setMappedPlayers] = useState<MappedPlayer[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((data) => {
        const t = Array.isArray(data) ? data : data?.teams || [];
        setTeams(t);
        if (!selectedTeamId && t.length > 0) setSelectedTeamId(t[0]._id);
      })
      .catch(() => {});
  }, []);

  // Client-side parse
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]!]!;
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
        if (rows.length === 0) { alert("File is empty"); return; }
        setFileName(file.name);
        setFileHeaders(Object.keys(rows[0]!));
        setSampleRows(rows.slice(0, 5));
        setAllRows(rows);
        setStep("mapping");
        heuristicMap(Object.keys(rows[0]!));
      } catch { alert("Failed to parse file."); }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  function heuristicMap(headers: string[]) {
    const m: Record<string, string> = {};
    const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const patterns: [string, RegExp[]][] = [
      ["firstName", [/^first/, /^fname/]], ["lastName", [/^last/, /^lname/]],
      ["playerName", [/^name$/, /^playername/, /^player$/, /^fullname/]],
      ["jerseyNumber", [/jersey/, /number/, /^no$/, /^num$/]],
      ["position", [/^pos/, /position/]],
      ["dateOfBirth", [/^dob/, /birth/, /^bday/, /^date/]],
      ["parentName", [/parent.*name/, /guardian/]], ["parentEmail", [/email/]],
      ["parentPhone", [/phone/, /cell/, /mobile/]], ["gender", [/^gender/, /^sex$/]],
      ["topSize", [/^top/, /jersey.*size/, /shirt/]], ["bottomSize", [/^bottom/, /short/, /pant/]],
      ["shoeSize", [/^shoe/]],
    ];
    for (const [field, regexes] of patterns) {
      for (let i = 0; i < lower.length; i++) {
        if (regexes.some((r) => r.test(lower[i]!)) && !Object.values(m).includes(headers[i]!)) {
          m[field] = headers[i]!; break;
        }
      }
    }
    setMapping(m);
  }

  async function runAiMapping() {
    setAiMapping(true);
    try {
      const res = await fetch("/api/roster/import/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: fileHeaders, sampleRows }),
      });
      if (res.ok) { const data = await res.json(); setMapping(data.mapping); }
    } catch {}
    setAiMapping(false);
  }

  function buildPreview() {
    const players: MappedPlayer[] = [];
    for (const row of allRows) {
      let firstName = mapping.firstName ? row[mapping.firstName] || "" : "";
      let lastName = mapping.lastName ? row[mapping.lastName] || "" : "";
      if (!firstName && !lastName && mapping.playerName) {
        const parts = (row[mapping.playerName] || "").trim().split(/\s+/);
        firstName = parts[0] || ""; lastName = parts.slice(1).join(" ") || "";
      }
      if (!firstName && !lastName) continue;
      players.push({ firstName, lastName,
        jerseyNumber: mapping.jerseyNumber ? row[mapping.jerseyNumber] : undefined,
        position: mapping.position ? row[mapping.position] : undefined,
        dateOfBirth: mapping.dateOfBirth ? row[mapping.dateOfBirth] : undefined,
        parentEmail: mapping.parentEmail ? row[mapping.parentEmail] : undefined,
        parentPhone: mapping.parentPhone ? row[mapping.parentPhone] : undefined,
        parentName: mapping.parentName ? row[mapping.parentName] : undefined,
        gender: mapping.gender ? row[mapping.gender] : undefined,
        topSize: mapping.topSize ? row[mapping.topSize] : undefined,
        bottomSize: mapping.bottomSize ? row[mapping.bottomSize] : undefined,
        shoeSize: mapping.shoeSize ? row[mapping.shoeSize] : undefined,
      });
    }
    setMappedPlayers(players);
    setStep("preview");
  }

  async function doImport() {
    if (!selectedTeamId || mappedPlayers.length === 0) return;
    setStep("importing");
    const res = await fetch("/api/roster/import-players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeamId, players: mappedPlayers }),
    });
    setImportResult(await res.json());
    setStep("done");
  }

  const selectedTeam = teams.find((t) => t._id === selectedTeamId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/roster" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Import Roster</h1>
          <p className="text-sm text-muted-foreground">Upload CSV or Excel — any column layout works.</p>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Import to team</label>
        <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}
          className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm">
          {teams.map((t) => (<option key={t._id} value={t._id}>{t.name}</option>))}
        </select>
      </div>

      {/* Upload */}
      {step === "upload" && (
        <div onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => document.getElementById("fi")?.click()}
          className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-sm font-medium">Drop your spreadsheet here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">CSV, XLS, or XLSX</p>
          <input id="fi" type="file" accept=".csv,.xls,.xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {/* Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{fileName} — {allRows.length} rows</p>
            <button onClick={runAiMapping} disabled={aiMapping}
              className="flex items-center gap-2 rounded-md bg-purple-100 text-purple-700 px-3 py-1.5 text-sm font-medium hover:bg-purple-200">
              {aiMapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiMapping ? "Mapping..." : "AI Map Columns"}
            </button>
          </div>
          <div className="rounded-lg border bg-card divide-y">
            {TARGET_FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-4 px-4 py-2.5">
                <span className="text-sm font-medium w-36 shrink-0">{f.label}</span>
                <span className="text-muted-foreground">→</span>
                <select value={mapping[f.key] || ""}
                  onChange={(e) => setMapping((m) => { const n = { ...m }; if (e.target.value) n[f.key] = e.target.value; else delete n[f.key]; return n; })}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                  <option value="">— skip —</option>
                  {fileHeaders.map((h) => (<option key={h} value={h}>{h}</option>))}
                </select>
              </div>
            ))}
          </div>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{fileHeaders.map((h) => (<th key={h} className="px-3 py-2 text-left font-medium text-xs whitespace-nowrap">{h}</th>))}</tr></thead>
              <tbody className="divide-y">
                {sampleRows.slice(0, 3).map((row, i) => (
                  <tr key={i}>{fileHeaders.map((h) => (<td key={h} className="px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground">{row[h]}</td>))}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={buildPreview} disabled={!mapping.firstName && !mapping.lastName && !mapping.playerName}
              className="rounded-md bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              Preview ({allRows.length} rows)
            </button>
            <button onClick={() => { setStep("upload"); setAllRows([]); }} className="rounded-md border px-4 py-2.5 text-sm">Start Over</button>
          </div>
        </div>
      )}

      {/* Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{mappedPlayers.length} players → {selectedTeam?.name}</h2>
          <div className="rounded-lg border overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0"><tr>
                <th className="px-3 py-2 text-left text-xs">#</th>
                <th className="px-3 py-2 text-left text-xs">Name</th>
                <th className="px-3 py-2 text-left text-xs">Jersey</th>
                <th className="px-3 py-2 text-left text-xs">Pos</th>
                <th className="px-3 py-2 text-left text-xs">DOB</th>
                <th className="px-3 py-2 text-left text-xs">Parent Email</th>
              </tr></thead>
              <tbody className="divide-y">
                {mappedPlayers.map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-1.5 text-xs font-medium">{p.firstName} {p.lastName}</td>
                    <td className="px-3 py-1.5 text-xs">{p.jerseyNumber || "—"}</td>
                    <td className="px-3 py-1.5 text-xs">{p.position || "—"}</td>
                    <td className="px-3 py-1.5 text-xs">{p.dateOfBirth || "—"}</td>
                    <td className="px-3 py-1.5 text-xs">{p.parentEmail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={doImport} className="rounded-md bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90">
              Import {mappedPlayers.length} Players
            </button>
            <button onClick={() => setStep("mapping")} className="rounded-md border px-4 py-2.5 text-sm">Back</button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Importing {mappedPlayers.length} players...</p>
        </div>
      )}

      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-xl font-bold">Import Complete</h2>
            <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm">
              {importResult.created > 0 && (
                <div><p className="text-2xl font-bold text-green-600">{importResult.created}</p><p className="text-muted-foreground">New Players</p></div>
              )}
              {importResult.linked > 0 && (
                <div><p className="text-2xl font-bold text-blue-600">{importResult.linked}</p><p className="text-muted-foreground">Existing Linked</p></div>
              )}
              {importResult.invited > 0 && (
                <div><p className="text-2xl font-bold text-purple-600">{importResult.invited}</p><p className="text-muted-foreground">Invites Sent</p></div>
              )}
              {importResult.alreadyOnRoster > 0 && (
                <div><p className="text-2xl font-bold text-yellow-600">{importResult.alreadyOnRoster}</p><p className="text-muted-foreground">Already on Roster</p></div>
              )}
              {importResult.errors > 0 && (
                <div><p className="text-2xl font-bold text-red-600">{importResult.errors}</p><p className="text-muted-foreground">Errors</p></div>
              )}
            </div>
          </div>

          {/* Full results list */}
          {importResult.results && importResult.results.length > 0 && (
            <div className="rounded-lg border overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs">Player</th>
                    <th className="px-3 py-2 text-left text-xs">Status</th>
                    <th className="px-3 py-2 text-left text-xs">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {importResult.results.map((r: any, i: number) => (
                    <tr key={i} className={r.status === "error" ? "bg-red-50" : r.status === "already_on_roster" ? "bg-yellow-50" : ""}>
                      <td className="px-3 py-1.5 text-xs font-medium">{r.name}</td>
                      <td className="px-3 py-1.5 text-xs">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          r.status === "created" ? "bg-green-100 text-green-700" :
                          r.status === "linked_existing" ? "bg-blue-100 text-blue-700" :
                          r.status === "already_on_roster" ? "bg-yellow-100 text-yellow-700" :
                          r.status === "error" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                        {r.invited && <span className="ml-1 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-medium">invited</span>}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-red-600">{r.error || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <Link href="/roster" className="rounded-md bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90">View Roster</Link>
            <button onClick={() => { setStep("upload"); setAllRows([]); setMappedPlayers([]); setImportResult(null); setMapping({}); }}
              className="rounded-md border px-4 py-2.5 text-sm">Import Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
