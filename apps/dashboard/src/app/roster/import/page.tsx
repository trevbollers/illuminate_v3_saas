"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

interface TeamOption {
  _id: string;
  name: string;
  sport: string;
}

interface ParsedRow {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  jerseyNumber?: string;
  position?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  medicalNotes?: string;
}

interface ImportResult {
  row: number;
  playerName: string;
  status: "created" | "added" | "duplicate" | "error";
  message: string;
}

const EXPECTED_HEADERS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "jerseyNumber",
  "position",
  "guardianName",
  "guardianEmail",
  "guardianPhone",
  "emergencyContactName",
  "emergencyContactPhone",
  "emergencyContactRelationship",
  "medicalNotes",
];

const TEMPLATE_CSV =
  "firstName,lastName,dateOfBirth,gender,jerseyNumber,position,guardianName,guardianEmail,guardianPhone,emergencyContactName,emergencyContactPhone,emergencyContactRelationship,medicalNotes\n" +
  "Marcus,Johnson,2013-05-15,male,7,QB,Sandra Johnson,sandra@email.com,(555) 123-4567,Mary Johnson,(555) 987-6543,Grandmother,\n" +
  "Jaylen,Williams,2014-02-20,male,12,WR,Michael Williams,mike@email.com,(555) 234-5678,,,,Carries EpiPen - peanut allergy\n";

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

export default function ImportRosterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");

  const [dragging, setDragging] = useState(false);

  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; created: number; duplicates: number; errors: number } | null>(null);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) =>
        setTeams(
          (data || []).map((t: any) => ({ _id: t._id, name: t.name, sport: t.sport })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingTeams(false));
  }, []);

  function processFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Please upload a CSV file.");
      return;
    }

    setParseError("");
    setParsedRows([]);
    setResults(null);
    setSummary(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      const missing = ["firstName", "lastName", "dateOfBirth"].filter(
        (h) => !headers.includes(h),
      );
      if (missing.length > 0) {
        setParseError(
          `Missing required columns: ${missing.join(", ")}. Download the template for the correct format.`,
        );
        return;
      }

      if (rows.length === 0) {
        setParseError("No data rows found in the file.");
        return;
      }

      if (rows.length > 100) {
        setParseError("Maximum 100 players per import. Please split your file.");
        return;
      }

      setParsedRows(rows as ParsedRow[]);
    };
    reader.readAsText(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!teamId) {
      setParseError("Please select a team.");
      return;
    }
    if (parsedRows.length === 0) return;

    setImporting(true);
    setParseError("");

    try {
      const res = await fetch("/api/roster/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, rows: parsedRows }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setSummary(data.summary);
      } else {
        const data = await res.json();
        setParseError(data.error || "Import failed.");
      }
    } catch {
      setParseError("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/roster">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Roster</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to bulk-add players to a team.
          </p>
        </div>
      </div>

      {/* Step 1: Select team */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Select Team</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTeams ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading teams...
            </div>
          ) : (
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name} ({t.sport})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload CSV */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">2. Upload CSV</CardTitle>
            <Button variant="outline" size="sm" className="gap-1" onClick={downloadTemplate}>
              <Download className="h-3 w-3" /> Download Template
            </Button>
          </div>
          <CardDescription>
            Required columns: firstName, lastName, dateOfBirth. All other columns are optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          {parsedRows.length === 0 && !results ? (
            <button
              type="button"
              className={`flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50 hover:bg-muted/50"
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className={`h-10 w-10 ${dragging ? "text-primary" : "text-muted-foreground/50"}`} />
              <p className="mt-3 text-sm font-medium">
                {dragging ? "Drop CSV file here" : "Click to upload CSV file"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                or drag and drop
              </p>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <Badge variant="secondary">{parsedRows.length} players</Badge>
              {!results && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedRows([]);
                    setFileName("");
                    setResults(null);
                    setSummary(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Change file
                </Button>
              )}
            </div>
          )}

          {parseError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {parseError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedRows.length > 0 && !results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">3. Preview & Import</CardTitle>
              <Button
                className="gap-1"
                onClick={handleImport}
                disabled={importing || !teamId}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Import {parsedRows.length} Players
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Jersey</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Guardian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell className="text-sm">{row.dateOfBirth}</TableCell>
                      <TableCell>{row.jerseyNumber || "—"}</TableCell>
                      <TableCell>
                        {row.position ? (
                          <Badge variant="outline" className="text-xs">
                            {row.position}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.guardianName || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Results</CardTitle>
            <CardDescription>
              {summary.created} created, {summary.duplicates} duplicates, {summary.errors} errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-md border p-2.5"
                >
                  {r.status === "created" || r.status === "added" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : r.status === "duplicate" ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{r.playerName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.message}</span>
                  </div>
                  <Badge
                    variant={
                      r.status === "created" || r.status === "added"
                        ? "default"
                        : r.status === "duplicate"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button asChild>
                <Link href={`/teams/${teamId}`}>View Team Roster</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/roster">View All Players</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
