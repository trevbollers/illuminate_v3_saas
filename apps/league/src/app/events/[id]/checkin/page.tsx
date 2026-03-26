"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ChevronLeft,
  RefreshCw,
  Loader2,
  ScanLine,
  UserCheck,
  UserX,
  Keyboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@goparticipate/ui/src/components/card";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Input } from "@goparticipate/ui/src/components/input";
import { Separator } from "@goparticipate/ui/src/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@goparticipate/ui/src/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@goparticipate/ui/src/components/tabs";

interface ScanResult {
  id: string;
  status: "checked_in" | "rejected" | "already_checked_in";
  reason?: string;
  message: string;
  playerName?: string;
  teamName?: string;
  jerseyNumber?: number;
  timestamp: Date;
}

interface TeamCheckInSummary {
  registrationId: string;
  teamName: string;
  divisionId: string;
  rosterCount: number;
  checkedInCount: number;
  checkedInPlayers: { playerId: string; playerName: string; jerseyNumber?: number; scannedAt: string }[];
  missingPlayers: { playerId: string; playerName: string; jerseyNumber?: number }[];
}

interface CheckInData {
  eventId: string;
  dayIndex: number;
  totalCheckIns: number;
  totalRejected: number;
  teams: TeamCheckInSummary[];
}

export default function CheckInPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [useManualMode, setUseManualMode] = useState(false);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchEvent();
    fetchCheckInData();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    fetchCheckInData();
  }, [dayIndex]);

  async function fetchEvent() {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) setEvent(await res.json());
    } catch (err) {
      console.error("Failed to fetch event:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCheckInData() {
    try {
      const res = await fetch(`/api/events/${eventId}/checkin?dayIndex=${dayIndex}`);
      if (res.ok) setCheckInData(await res.json());
    } catch (err) {
      console.error("Failed to fetch check-in data:", err);
    }
  }

  async function processQR(qrData: string) {
    if (processing) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData, dayIndex }),
      });

      const data = await res.json();
      const result: ScanResult = {
        id: crypto.randomUUID(),
        status: data.status || "rejected",
        reason: data.reason,
        message: data.message || data.error || "Unknown error",
        playerName: data.playerName,
        teamName: data.teamName,
        jerseyNumber: data.jerseyNumber,
        timestamp: new Date(),
      };

      setScanResults((prev) => [result, ...prev.slice(0, 49)]);
      fetchCheckInData();
    } catch (err) {
      setScanResults((prev) => [
        {
          id: crypto.randomUUID(),
          status: "rejected",
          message: "Network error — check your connection",
          timestamp: new Date(),
        },
        ...prev.slice(0, 49),
      ]);
    } finally {
      setProcessing(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      // Start scanning frames for QR codes using BarcodeDetector API
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || processing) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const qrValue = barcodes[0].rawValue;
              if (qrValue) {
                processQR(qrValue);
              }
            }
          } catch {
            // detection frame error — ignore
          }
        }, 500);
      } else {
        // Fallback: no BarcodeDetector — switch to manual mode
        setUseManualMode(true);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setUseManualMode(true);
    }
  }

  function stopCamera() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processQR(manualInput.trim());
    setManualInput("");
  }

  function getStatusColor(status: string) {
    if (status === "checked_in") return "bg-green-100 text-green-800 border-green-200";
    if (status === "already_checked_in") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  }

  function getStatusIcon(status: string) {
    if (status === "checked_in") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === "already_checked_in") return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/events/${eventId}`} className="flex items-center gap-1 text-sm text-muted-foreground mb-1 hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to Event
          </Link>
          <h1 className="text-xl font-bold">Event Check-In</h1>
          <p className="text-sm text-muted-foreground">{event?.name}</p>
        </div>
        <div className="text-right">
          {event?.days?.length > 1 && (
            <Select value={String(dayIndex)} onValueChange={(v) => setDayIndex(parseInt(v, 10))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {event.days.map((d: any, i: number) => (
                  <SelectItem key={i} value={String(i)}>
                    {d.label || `Day ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{checkInData?.totalCheckIns || 0}</div>
            <div className="text-xs text-muted-foreground">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {checkInData?.teams?.reduce((sum, t) => sum + t.rosterCount, 0) || 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Rostered</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{checkInData?.totalRejected || 0}</div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scanner">
        <TabsList className="w-full">
          <TabsTrigger value="scanner" className="flex-1 gap-2">
            <ScanLine className="h-4 w-4" /> Scanner
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex-1 gap-2">
            <Users className="h-4 w-4" /> Teams
          </TabsTrigger>
        </TabsList>

        {/* Scanner Tab */}
        <TabsContent value="scanner" className="space-y-4">
          {/* Camera / Manual toggle */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {!useManualMode ? (
                <>
                  {!scanning ? (
                    <Button onClick={startCamera} className="w-full gap-2">
                      <Camera className="h-4 w-4" /> Start Camera Scanner
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        {processing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none border-2 border-blue-400/50 rounded-lg">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-blue-400 rounded-lg" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={stopCamera} className="flex-1">
                          Stop Camera
                        </Button>
                        <Button variant="outline" onClick={() => { stopCamera(); setUseManualMode(true); }} className="gap-2">
                          <Keyboard className="h-4 w-4" /> Manual
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">Manual QR Code Input</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUseManualMode(false)}
                      className="gap-1 text-xs"
                    >
                      <Camera className="h-3 w-3" /> Switch to Camera
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste or type QR code data..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      autoFocus
                    />
                    <Button type="submit" disabled={!manualInput.trim() || processing}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a handheld barcode scanner that types into this field, or paste QR data manually.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Recent scan results */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Recent Scans</h3>
              <Button variant="ghost" size="sm" onClick={fetchCheckInData} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>

            {scanResults.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No scans yet. Start scanning QR codes to check in players.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {scanResults.map((result) => (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${getStatusColor(result.status)}`}
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {result.playerName && (
                          <span className="font-semibold">{result.playerName}</span>
                        )}
                        {result.jerseyNumber !== undefined && (
                          <Badge variant="outline" className="text-xs">#{result.jerseyNumber}</Badge>
                        )}
                      </div>
                      <div className="text-sm">{result.message}</div>
                      {result.teamName && (
                        <div className="text-xs opacity-75">{result.teamName}</div>
                      )}
                    </div>
                    <div className="text-xs opacity-60 whitespace-nowrap">
                      {result.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-3">
          <Button variant="outline" size="sm" onClick={fetchCheckInData} className="gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>

          {(checkInData?.teams || []).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No approved registrations with rosters for this event.
              </CardContent>
            </Card>
          ) : (
            (checkInData?.teams || []).map((team) => (
              <Card key={team.registrationId}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{team.teamName}</CardTitle>
                    <Badge
                      variant={team.checkedInCount === team.rosterCount ? "default" : "outline"}
                      className={
                        team.checkedInCount === team.rosterCount
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {team.checkedInCount}/{team.rosterCount} checked in
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Checked in players */}
                  {team.checkedInPlayers.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-green-700 mb-1">Checked In</div>
                      <div className="flex flex-wrap gap-1">
                        {team.checkedInPlayers.map((p) => (
                          <Badge key={p.playerId} className="bg-green-50 text-green-700 border-green-200 gap-1">
                            <UserCheck className="h-3 w-3" />
                            {p.playerName}
                            {p.jerseyNumber !== undefined && ` #${p.jerseyNumber}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing players */}
                  {team.missingPlayers.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-700 mb-1">Not Checked In</div>
                      <div className="flex flex-wrap gap-1">
                        {team.missingPlayers.map((p) => (
                          <Badge key={p.playerId} variant="outline" className="text-red-600 border-red-200 gap-1">
                            <UserX className="h-3 w-3" />
                            {p.playerName}
                            {p.jerseyNumber !== undefined && ` #${p.jerseyNumber}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
