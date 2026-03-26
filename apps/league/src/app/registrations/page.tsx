"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Button } from "@goparticipate/ui/src/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { ClipboardList, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface EventWithRegistrations {
  _id: string;
  name: string;
  status: string;
  registrations: Registration[];
}

interface Registration {
  _id: string;
  eventId: string;
  divisionId: string;
  teamName: string;
  status: "pending" | "approved" | "rejected" | "waitlisted" | "withdrawn";
  paymentStatus: string;
  roster: { playerId: string; playerName: string }[];
  createdAt: string;
}

export default function RegistrationsPage() {
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const eventsRes = await fetch("/api/events");
    const eventsData = await eventsRes.json();
    const eventsList = Array.isArray(eventsData) ? eventsData : [];

    const withRegs: EventWithRegistrations[] = [];
    for (const ev of eventsList) {
      const regRes = await fetch(`/api/events/${ev._id}/registrations`);
      const regs = await regRes.json();
      if (Array.isArray(regs) && regs.length > 0) {
        withRegs.push({ _id: ev._id, name: ev.name, status: ev.status, registrations: regs });
      }
    }
    setEvents(withRegs);
    setLoading(false);
  }

  async function updateStatus(eventId: string, regId: string, status: string) {
    await fetch(`/api/events/${eventId}/registrations/${regId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchData();
  }

  const allRegs = events.flatMap((ev) =>
    ev.registrations.map((r) => ({ ...r, eventName: ev.name, eventId: ev._id }))
  );
  const filtered = filter === "all" ? allRegs : allRegs.filter((r) => r.status === filter);
  const pendingCount = allRegs.filter((r) => r.status === "pending").length;

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
          <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
          <p className="text-muted-foreground">
            View and manage team registrations across all events.
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="default" className="bg-amber-500">{pendingCount} pending</Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => {
          const count = s === "all" ? allRegs.length : allRegs.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-medium">No registrations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "all"
                ? "Registrations will appear here once teams sign up for your events."
                : `No ${filter} registrations found.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((reg) => (
            <Card key={reg._id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{reg.teamName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link href={`/events/${reg.eventId}`} className="text-blue-600 hover:underline">
                      {reg.eventName}
                    </Link>
                    <span>·</span>
                    <span>{reg.roster.length} players</span>
                    <span>·</span>
                    <span>{format(new Date(reg.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    reg.paymentStatus === "paid" ? "default" :
                    reg.paymentStatus === "partial" ? "outline" : "secondary"
                  }>
                    {reg.paymentStatus}
                  </Badge>
                  <Badge variant={
                    reg.status === "approved" ? "default" :
                    reg.status === "pending" ? "outline" :
                    reg.status === "rejected" ? "destructive" : "secondary"
                  }>
                    {reg.status}
                  </Badge>
                  {reg.status === "pending" && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                        onClick={() => updateStatus(reg.eventId, reg._id, "approved")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => updateStatus(reg.eventId, reg._id, "rejected")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
