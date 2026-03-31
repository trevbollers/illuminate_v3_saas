"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ClipboardList, Plus } from "lucide-react";

interface TryoutSession {
  _id: string;
  name: string;
  sport: string;
  status: string;
  ageGroups: string[];
  dates: string[];
}

export default function TryoutsPage() {
  const [sessions, setSessions] = useState<TryoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tryouts")
      .then((r) => r.json())
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    registration: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    decision: "bg-yellow-100 text-yellow-800",
    closed: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tryouts</h1>
          <p className="text-muted-foreground">Manage tryout sessions, evaluations, and team assignments.</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">No tryout sessions</h3>
          <p className="text-muted-foreground mt-2">
            Create a tryout program first, then start a tryout session from it.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((session) => (
            <Link
              key={session._id}
              href={`/tryouts/${session._id}`}
              className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{session.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    statusColors[session.status] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {session.sport.replace(/_/g, " ")} · {session.ageGroups.join(", ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
