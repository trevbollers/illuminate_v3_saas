"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarDays,
  MapPin,
  Medal,
  Loader2,
  Store,
  Filter,
  Trophy,
  Shield,
} from "lucide-react";

interface ProgramListing {
  _id: string;
  name: string;
  slug: string;
  programType: string;
  sport: string;
  startDate: string;
  endDate?: string;
  fee: number;
  status: string;
  location?: string;
  city?: string;
  state?: string;
  imageUrl?: string;
  ageGroups?: { label: string }[];
  tenantName: string;
  tenantSlug: string;
  tenantType: string;
  tenantLogoUrl?: string;
}

const TYPE_LABELS: Record<string, string> = {
  camp: "Camp",
  clinic: "Clinic",
  training: "Training",
  tryout: "Tryout",
  tournament: "Tournament",
  league_season: "League",
  class: "Class",
  combine: "Combine",
  showcase: "Showcase",
};

const SPORT_LABELS: Record<string, string> = {
  "7v7_football": "7v7 Football",
  basketball: "Basketball",
};

export default function ProgramsListingPage() {
  const [programs, setPrograms] = useState<ProgramListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (sportFilter) params.set("sport", sportFilter);
    if (typeFilter) params.set("type", typeFilter);
    const qs = params.toString();

    setLoading(true);
    fetch(`/api/public/programs${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => setPrograms(data.programs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sportFilter, typeFilter]);

  const statusColors: Record<string, string> = {
    registration_open: "bg-green-100 text-green-800",
    published: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-600",
    registration_closed: "bg-yellow-100 text-yellow-800",
  };

  // Split into upcoming and past
  const now = new Date();
  const upcoming = programs.filter(
    (p) => new Date(p.endDate || p.startDate) >= now || p.status === "in_progress",
  );
  const past = programs.filter(
    (p) => new Date(p.endDate || p.startDate) < now && p.status !== "in_progress",
  );

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dev-only: Quick test links */}
      {isDev && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">
              Dev Test Links
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="font-medium text-amber-800">Public Pages:</span>
              <a href="/midamerica-7v7" className="text-blue-700 underline hover:text-blue-900">MidAmerica 7v7 (league)</a>
              <a href="/kc-thunder" className="text-blue-700 underline hover:text-blue-900">KC Thunder (org)</a>
              <a href="/court-45-basketball" className="text-blue-700 underline hover:text-blue-900">Court 45 Basketball (org)</a>
              <a href="/minnesota-heat" className="text-blue-700 underline hover:text-blue-900">Minnesota Heat (org)</a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mt-1">
              <span className="font-medium text-amber-800">League Events:</span>
              <a href="http://localhost:4002/public/events" className="text-blue-700 underline hover:text-blue-900">All Events (4002)</a>
              <a href="http://localhost:4002/public/events/spring-showdown-2026" className="text-blue-700 underline hover:text-blue-900">Spring Showdown</a>
              <a href="http://localhost:4002/public/events/spring-showdown-2026/register" className="text-blue-700 underline hover:text-blue-900">Register for Spring Showdown</a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mt-1">
              <span className="font-medium text-amber-800">Admin Portals:</span>
              <a href="http://localhost:4001" className="text-blue-700 underline hover:text-blue-900">Platform Admin (4001)</a>
              <a href="http://localhost:4002" className="text-blue-700 underline hover:text-blue-900">League Admin (4002)</a>
              <a href="http://localhost:4003" className="text-blue-700 underline hover:text-blue-900">Org Dashboard (4003)</a>
              <a href="http://localhost:4004" className="text-blue-700 underline hover:text-blue-900">Storefront (4004)</a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Medal className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">Go Participate</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-4">Programs & Events</h1>
          <p className="text-gray-500 mt-1">
            Camps, clinics, tryouts, tournaments, and leagues across all organizations.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm bg-white"
            >
              <option value="">All Sports</option>
              <option value="7v7_football">7v7 Football</option>
              <option value="basketball">Basketball</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border px-3 py-1.5 text-sm bg-white"
            >
              <option value="">All Types</option>
              <option value="camp">Camps</option>
              <option value="clinic">Clinics</option>
              <option value="tryout">Tryouts</option>
              <option value="tournament">Tournaments</option>
              <option value="league_season">Leagues</option>
              <option value="training">Training</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : programs.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
            <Medal className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium">No programs found</h3>
            <p className="text-gray-500 mt-2">
              Check back soon or adjust your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4">
                  Upcoming ({upcoming.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((prog) => (
                    <ProgramCard key={`${prog.tenantSlug}-${prog._id}`} program={prog} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-gray-400">
                  Past ({past.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((prog) => (
                    <ProgramCard key={`${prog.tenantSlug}-${prog._id}`} program={prog} muted />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ProgramCard({ program: p, muted }: { program: ProgramListing; muted?: boolean }) {
  return (
    <Link
      href={`/${p.tenantSlug}`}
      className={`block rounded-lg border bg-white p-5 hover:shadow-md transition-shadow ${muted ? "opacity-60" : ""}`}
    >
      {/* Type + Status badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          {TYPE_LABELS[p.programType] || p.programType}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            p.status === "registration_open" || p.status === "published"
              ? "bg-green-100 text-green-800"
              : p.status === "in_progress"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {p.status === "registration_open" || p.status === "published" ? "Open" : p.status.replace(/_/g, " ")}
        </span>
      </div>

      <h3 className="font-semibold text-lg leading-snug">{p.name}</h3>

      {/* Org/League name */}
      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
        {p.tenantType === "league" ? (
          <Trophy className="h-3.5 w-3.5 text-blue-500" />
        ) : (
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
        )}
        <span>{p.tenantName}</span>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>
            {format(new Date(p.startDate), "MMM d, yyyy")}
            {p.endDate && p.endDate !== p.startDate && ` — ${format(new Date(p.endDate), "MMM d, yyyy")}`}
          </span>
        </div>
        {(p.location || p.city) && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {p.location}{p.city && ` · ${p.city}${p.state ? `, ${p.state}` : ""}`}
            </span>
          </div>
        )}
        {p.fee > 0 && (
          <div className="font-medium text-gray-700">
            ${(p.fee / 100).toFixed(2)}
          </div>
        )}
        {p.ageGroups && p.ageGroups.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.ageGroups.slice(0, 4).map((ag, i) => (
              <span key={i} className="rounded bg-gray-50 border px-1.5 py-0.5 text-[10px] text-gray-400">
                {ag.label}
              </span>
            ))}
            {p.ageGroups.length > 4 && (
              <span className="text-[10px] text-gray-400">+{p.ageGroups.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-300">
        {SPORT_LABELS[p.sport] || p.sport}
      </div>
    </Link>
  );
}
