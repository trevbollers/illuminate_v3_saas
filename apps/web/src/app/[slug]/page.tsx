"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarDays,
  MapPin,
  Trophy,
  Users,
  Store,
  Loader2,
  ExternalLink,
} from "lucide-react";

// ─── Types ───

interface TenantPublicData {
  name: string;
  slug: string;
  tenantType: "league" | "organization";
  sport?: string;
  logoUrl?: string;
  bannerUrl?: string;
  tagline?: string;
  description?: string;
  // League
  events?: LeagueEvent[];
  // Org
  teams?: OrgTeam[];
  programs?: OrgProgram[];
  products?: OrgProduct[];
  hasStore?: boolean;
}

interface LeagueEvent {
  _id: string;
  name: string;
  slug: string;
  type: string;
  sport: string;
  startDate: string;
  endDate?: string;
  status: string;
  locations?: { name: string; address?: string }[];
  bannerUrl?: string;
}

interface OrgTeam {
  _id: string;
  name: string;
  sport?: string;
  ageGroup?: string;
  logoUrl?: string;
}

interface OrgProgram {
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
  ageGroups?: { label: string; gender?: string; capacity?: number }[];
  leagueSlug?: string;
  leagueEventId?: string;
  tags?: string[];
}

interface OrgProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
  category?: string;
}

// ─── Page ───

export default function TenantPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<TenantPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [registerProgram, setRegisterProgram] = useState<OrgProgram | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-gray-500 mt-2">
          No league or organization found at this address.
        </p>
        <Link
          href="/"
          className="mt-4 text-sm font-medium text-blue-600 hover:underline"
        >
          Go to Go Participate
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / Header */}
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center gap-4">
            {data.logoUrl && (
              <img
                src={data.logoUrl}
                alt={data.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {data.name}
              </h1>
              {data.tagline && (
                <p className="text-gray-500 mt-1">{data.tagline}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                <span className="capitalize">
                  {data.tenantType === "league" ? "League" : "Organization"}
                </span>
                {data.sport && (
                  <>
                    <span>·</span>
                    <span>{data.sport.replace(/_/g, " ")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {data.description && (
            <p className="text-gray-600 mt-4 max-w-2xl">{data.description}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {data.tenantType === "league" ? (
          <LeagueContent data={data} />
        ) : (
          <OrgContent data={data} onRegister={setRegisterProgram} />
        )}
      </main>

      {/* Tryout Registration Modal */}
      {registerProgram && (
        <TryoutRegistrationModal
          slug={slug}
          program={registerProgram}
          onClose={() => setRegisterProgram(null)}
        />
      )}

      <footer className="border-t bg-white py-6 text-center text-sm text-gray-400">
        Powered by{" "}
        <Link href="/" className="font-medium text-gray-600 hover:underline">
          Go Participate
        </Link>
      </footer>
    </div>
  );
}

// ─── League Content ───

function LeagueContent({ data }: { data: TenantPublicData }) {
  const events = data.events || [];
  const now = new Date();
  const upcoming = events.filter(
    (e) =>
      new Date(e.endDate || e.startDate) >= now || e.status === "in_progress",
  );
  const past = events.filter(
    (e) =>
      new Date(e.endDate || e.startDate) < now && e.status !== "in_progress",
  );

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-12 w-12" />}
        title="No events yet"
        message="Check back soon for upcoming tournaments and events."
      />
    );
  }

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((event) => (
              <EventCard key={event._id} event={event} slug={data.slug} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-400 mb-4">
            Past Events
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                slug={data.slug}
                muted
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({
  event,
  slug,
  muted,
}: {
  event: LeagueEvent;
  slug: string;
  muted?: boolean;
}) {
  const location = event.locations?.[0];
  const leagueUrl =
    process.env.NEXT_PUBLIC_LEAGUE_URL || `https://${slug}.goparticipate.com`;

  const statusColors: Record<string, string> = {
    registration_open:
      "bg-green-100 text-green-800",
    in_progress:
      "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-600",
  };
  const statusLabels: Record<string, string> = {
    published: "Coming Soon",
    registration_open: "Registration Open",
    registration_closed: "Registration Closed",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <a
      href={`${leagueUrl}/public/events/${event.slug}`}
      className={`block rounded-lg border bg-white p-5 transition-shadow hover:shadow-md ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lg leading-snug">{event.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            statusColors[event.status] || "bg-gray-100 text-gray-500"
          }`}
        >
          {statusLabels[event.status] || event.status}
        </span>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>
            {format(new Date(event.startDate), "MMM d, yyyy")}
            {event.endDate &&
              event.endDate !== event.startDate &&
              ` — ${format(new Date(event.endDate), "MMM d, yyyy")}`}
          </span>
        </div>
        {location && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{location.name}</span>
          </div>
        )}
      </div>
    </a>
  );
}

// ─── Org Content ───

function OrgContent({ data, onRegister }: { data: TenantPublicData; onRegister?: (p: OrgProgram) => void }) {
  const teams = data.teams || [];
  const programs = data.programs || [];
  const products = data.products || [];

  const hasContent = teams.length > 0 || programs.length > 0 || products.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Coming soon"
        message="This organization's public page is being set up."
      />
    );
  }

  const storefrontUrl =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    `https://${data.slug}.goparticipate.com/store`;

  const programTypeLabels: Record<string, string> = {
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

  const statusColors: Record<string, string> = {
    registration_open: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-600",
    registration_closed: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="space-y-8">
      {/* Programs */}
      {programs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Programs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {programs.map((prog) => (
              <div
                key={prog._id}
                className="rounded-lg border bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                        {programTypeLabels[prog.programType] || prog.programType}
                      </span>
                      {prog.tags?.includes("elite") && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 uppercase tracking-wide">
                          Elite
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg leading-snug">{prog.name}</h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[prog.status] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {prog.status === "registration_open" ? "Open" : prog.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {format(new Date(prog.startDate), "MMM d, yyyy")}
                      {prog.endDate &&
                        prog.endDate !== prog.startDate &&
                        ` — ${format(new Date(prog.endDate), "MMM d, yyyy")}`}
                    </span>
                  </div>
                  {(prog.location || prog.city) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {prog.location}
                        {prog.city && ` · ${prog.city}${prog.state ? `, ${prog.state}` : ""}`}
                      </span>
                    </div>
                  )}
                  {prog.fee > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        ${(prog.fee / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {prog.ageGroups && prog.ageGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prog.ageGroups.map((ag, i) => (
                        <span
                          key={i}
                          className="rounded bg-gray-50 border px-1.5 py-0.5 text-[11px] text-gray-500"
                        >
                          {ag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link to league event if tournament */}
                {prog.leagueSlug && prog.leagueEventId && (
                  <a
                    href={`/${prog.leagueSlug}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    View on {prog.leagueSlug} <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Register button for open-registration programs */}
                {prog.status === "registration_open" && onRegister && (
                  <button
                    onClick={() => onRegister(prog)}
                    className="mt-3 w-full rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Register Now{prog.fee > 0 ? ` — $${(prog.fee / 100).toFixed(2)}` : ""}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Teams */}
      {teams.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Teams</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team._id}
                className="flex items-center gap-3 rounded-lg border bg-white p-4"
              >
                {team.logoUrl ? (
                  <img
                    src={team.logoUrl}
                    alt={team.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                    {team.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{team.name}</p>
                  {team.ageGroup && (
                    <p className="text-xs text-gray-400">{team.ageGroup}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shop Preview */}
      {products.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Shop</h2>
            <a
              href={storefrontUrl}
              className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              View Shop <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {products.map((product) => (
              <a
                key={product._id}
                href={`${storefrontUrl}/products/${product.slug}`}
                className="rounded-lg border bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                    <Store className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    ${(product.pricing?.amount ? product.pricing.amount / 100 : 0).toFixed(2)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Tryout Registration Modal ───

function TryoutRegistrationModal({
  slug,
  program,
  onClose,
}: {
  slug: string;
  program: OrgProgram;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    parentEmail: "",
    parentName: "",
    parentPhone: "",
    playerFirstName: "",
    playerLastName: "",
    playerDob: "",
    ageGroup: program.ageGroups?.[0]?.label || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ tryoutNumber?: number; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/public/${slug}/programs/${program.slug}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setResult({ tryoutNumber: data.tryoutNumber, message: data.message });
    } else {
      setResult({ error: data.error || "Registration failed" });
    }
    setSubmitting(false);
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Register for {program.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>

          {result?.tryoutNumber ? (
            <div className="text-center py-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-green-700">#{result.tryoutNumber}</span>
              </div>
              <p className="font-medium text-lg">You're registered!</p>
              <p className="text-gray-500 mt-1">{result.message}</p>
              <p className="text-sm text-gray-400 mt-3">
                Your tryout number is <strong>#{result.tryoutNumber}</strong>. Please wear this number on your bib.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-md bg-gray-900 text-white px-6 py-2 text-sm font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">
                {program.fee > 0 && `Fee: $${(program.fee / 100).toFixed(2)} · `}
                {program.location && `${program.location} · `}
                {format(new Date(program.startDate), "MMM d, yyyy")}
              </p>

              <div className="space-y-1">
                <label className="text-sm font-medium">Parent/Guardian Email *</label>
                <input
                  type="email"
                  required
                  value={form.parentEmail}
                  onChange={(e) => set("parentEmail", e.target.value)}
                  className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Parent Name</label>
                  <input
                    value={form.parentName}
                    onChange={(e) => set("parentName", e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    value={form.parentPhone}
                    onChange={(e) => set("parentPhone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Player First Name *</label>
                  <input
                    required
                    value={form.playerFirstName}
                    onChange={(e) => set("playerFirstName", e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Player Last Name *</label>
                  <input
                    required
                    value={form.playerLastName}
                    onChange={(e) => set("playerLastName", e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <input
                    type="date"
                    value={form.playerDob}
                    onChange={(e) => set("playerDob", e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Age Group *</label>
                  <select
                    required
                    value={form.ageGroup}
                    onChange={(e) => set("ageGroup", e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    {program.ageGroups?.map((ag, i) => (
                      <option key={i} value={ag.label}>{ag.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {result?.error && (
                <p className="text-sm text-red-600">{result.error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Registering..." : "Register"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ───

function EmptyState({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-12 text-center">
      <div className="mx-auto text-gray-300">{icon}</div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="text-gray-500 mt-2">{message}</p>
    </div>
  );
}
