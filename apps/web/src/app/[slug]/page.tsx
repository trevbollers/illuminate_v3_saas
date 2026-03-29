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
  ShoppingBag,
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
  upcomingEvents?: OrgScheduleItem[];
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

interface OrgScheduleItem {
  _id: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string;
  location?: string;
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
          <OrgContent data={data} />
        )}
      </main>

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

function OrgContent({ data }: { data: TenantPublicData }) {
  const teams = data.teams || [];
  const schedule = data.upcomingEvents || [];
  const products = data.products || [];

  const hasContent = teams.length > 0 || schedule.length > 0 || products.length > 0;

  if (!hasContent) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="Coming soon"
        message="This organization's public page is being set up."
      />
    );
  }

  const dashboardUrl =
    process.env.NEXT_PUBLIC_DASHBOARD_URL ||
    `https://${data.slug}.goparticipate.com`;
  const storefrontUrl =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    `https://${data.slug}.goparticipate.com/store`;

  return (
    <div className="space-y-8">
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

      {/* Upcoming Schedule */}
      {schedule.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Upcoming Schedule</h2>
          <div className="space-y-2">
            {schedule.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(item.startDate), "MMM d, yyyy · h:mm a")}
                    {item.location && ` · ${item.location}`}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Store Preview */}
      {products.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Store</h2>
            <a
              href={storefrontUrl}
              className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              View Store <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {products.map((product) => (
              <a
                key={product._id}
                href={`${storefrontUrl}/products/${product.slug}`}
                className="rounded-lg border bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    ${(product.price / 100).toFixed(2)}
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
