"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Download,
  Filter,
  Users,
} from "lucide-react";

interface QRCodeEntry {
  playerId: string;
  playerName: string;
  teamName: string;
  jerseyNumber?: number;
  divisionId: string;
  registrationId: string;
  qrData: string;
  dataUrl?: string; // generated client-side
}

interface EventBasic {
  _id: string;
  name: string;
  divisions: { _id: string; label: string }[];
}

export default function QRCodesPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventBasic | null>(null);
  const [qrCodes, setQrCodes] = useState<QRCodeEntry[]>([]);
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [generating, setGenerating] = useState(false);

  const fetchQRCodes = useCallback(async () => {
    setLoading(true);
    try {
      const [eventRes, qrRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/qrcodes`),
      ]);
      if (eventRes.ok) {
        const ed = await eventRes.json();
        setEvent({ _id: ed._id, name: ed.name, divisions: ed.divisions || [] });
      }
      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrCodes(data.qrCodes || []);
      }
    } catch (err) {
      console.error("Failed to load QR codes:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  // Generate QR code images client-side
  useEffect(() => {
    if (qrCodes.length === 0 || qrCodes[0]?.dataUrl) return;
    setGenerating(true);

    (async () => {
      const updated = await Promise.all(
        qrCodes.map(async (qr) => {
          try {
            const dataUrl = await QRCode.toDataURL(qr.qrData, {
              width: 200,
              margin: 1,
              errorCorrectionLevel: "M",
            });
            return { ...qr, dataUrl };
          } catch {
            return qr;
          }
        }),
      );
      setQrCodes(updated);
      setGenerating(false);
    })();
  }, [qrCodes]);

  // Derived data
  const teams = [...new Set(qrCodes.map((q) => q.teamName))].sort();
  const filtered = qrCodes.filter((q) => {
    if (filterDivision !== "all" && q.divisionId !== filterDivision) return false;
    if (filterTeam !== "all" && q.teamName !== filterTeam) return false;
    return true;
  });

  // Group by team for printing
  const groupedByTeam: Record<string, QRCodeEntry[]> = {};
  for (const qr of filtered) {
    if (!groupedByTeam[qr.teamName]) groupedByTeam[qr.teamName] = [];
    groupedByTeam[qr.teamName]!.push(qr);
  }

  const handlePrint = () => window.print();

  const handleDownloadAll = async () => {
    // Create a printable HTML document and trigger download
    const html = buildPrintHTML(groupedByTeam, event?.name || "Event");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-codes-${event?.name?.replace(/\s+/g, "-").toLowerCase() || eventId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — hidden during print */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/events/${eventId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
            <p className="text-sm text-muted-foreground">{event?.name} — {qrCodes.length} players</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
            <Printer className="h-3 w-3" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadAll}>
            <Download className="h-3 w-3" /> Download HTML
          </Button>
        </div>
      </div>

      {/* Filters — hidden during print */}
      <div className="flex flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All Divisions</option>
            {(event?.divisions || []).map((d) => (
              <option key={d._id} value={d._id}>{d.label}</option>
            ))}
          </select>
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" /> {filtered.length} players
        </Badge>
      </div>

      {generating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating QR images...
        </div>
      )}

      {/* QR Cards grouped by team */}
      {Object.entries(groupedByTeam).map(([teamName, players]) => (
        <div key={teamName} className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">{teamName}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 print:grid-cols-4">
            {players.map((qr) => (
              <Card key={qr.playerId} className="break-inside-avoid">
                <CardContent className="flex flex-col items-center p-3 text-center">
                  {qr.dataUrl ? (
                    <img
                      src={qr.dataUrl}
                      alt={`QR for ${qr.playerName}`}
                      className="h-32 w-32 sm:h-36 sm:w-36 print:h-28 print:w-28"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      Loading...
                    </div>
                  )}
                  <p className="mt-1.5 text-sm font-medium leading-tight">{qr.playerName}</p>
                  {qr.jerseyNumber != null && (
                    <p className="text-xs text-muted-foreground">#{qr.jerseyNumber}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{qr.teamName}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && !loading && (
        <div className="py-12 text-center text-muted-foreground">
          No QR codes to display. Make sure there are approved registrations with rosters.
        </div>
      )}
    </div>
  );
}

function buildPrintHTML(
  grouped: Record<string, QRCodeEntry[]>,
  eventName: string,
): string {
  const teamSections = Object.entries(grouped)
    .map(
      ([teamName, players]) => `
    <h2 style="margin:24px 0 12px;font-size:18px;">${teamName}</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
      ${players
        .map(
          (p) => `
        <div style="border:1px solid #ddd;border-radius:8px;padding:8px;text-align:center;">
          ${p.dataUrl ? `<img src="${p.dataUrl}" width="140" height="140" />` : "<p>No QR</p>"}
          <p style="margin:4px 0 0;font-weight:600;font-size:13px;">${p.playerName}</p>
          ${p.jerseyNumber != null ? `<p style="margin:0;font-size:11px;color:#666;">#${p.jerseyNumber}</p>` : ""}
        </div>`,
        )
        .join("")}
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>QR Codes — ${eventName}</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:20px;}
@media print{body{padding:0;}}</style></head>
<body><h1 style="font-size:22px;">${eventName} — QR Codes</h1>${teamSections}</body></html>`;
}
