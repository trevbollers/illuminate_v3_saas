"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  Trophy,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ClipboardList,
  Check,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@goparticipate/ui/src/components/card";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";
import { Separator } from "@goparticipate/ui/src/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@goparticipate/ui/src/components/select";

interface LeagueEvent {
  _id: string;
  name: string;
  type: string;
  sport: string;
  description?: string;
  posterUrl?: string;
  startDate: string;
  endDate: string;
  registrationOpen: string;
  registrationClose: string;
  status: string;
  pricing: {
    amount: number;
    earlyBirdAmount?: number;
    earlyBirdDeadline?: string;
  };
  locations: { name: string; city?: string; state?: string }[];
  days: { date: string; label?: string }[];
  _leagueName: string;
  _leagueSlug: string;
  _isAffiliated: boolean;
  _divisions: {
    _id: string;
    label: string;
    eventFormat: string;
    estimatedTeamCount?: number;
    maxTeams?: number;
    _registeredCount: number;
    _spotsRemaining: number | null;
    skillLevel?: string;
  }[];
  _orgRegistrations: {
    _id: string;
    teamName: string;
    divisionId: string;
    status: string;
    teamId?: string;
    roster?: RosterPlayer[];
  }[];
}

interface RosterPlayer {
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
  eligibilityStatus?: string;
}

interface TeamRosterPlayer {
  _id: string;
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  position?: string;
  status: string;
}

export default function LeagueEventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<LeagueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regForm, setRegForm] = useState<{
    eventId: string;
    leagueSlug: string;
    divisionId: string;
    teamId: string;
  } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Roster management state
  const [rosterModal, setRosterModal] = useState<{
    registrationId: string;
    teamId: string;
    teamName: string;
    leagueSlug: string;
  } | null>(null);
  const [teamRoster, setTeamRoster] = useState<TeamRosterPlayer[]>([]);
  const [submittedRoster, setSubmittedRoster] = useState<RosterPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSaving, setRosterSaving] = useState(false);

  // Check for return from checkout
  useEffect(() => {
    const regStatus = searchParams.get("registration");
    if (regStatus === "success") {
      setMessage({ type: "success", text: "Registration confirmed! Your teams are registered." });
    } else if (regStatus === "canceled") {
      setMessage({ type: "error", text: "Checkout was canceled. Items are still in your cart." });
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEvents();
    fetchTeams();
    fetchCartCount();
  }, []);

  async function fetchCartCount() {
    try {
      const res = await fetch("/api/registration-cart");
      if (res.ok) {
        const data = await res.json();
        setCartItemCount(data.itemCount || 0);
      }
    } catch {}
  }

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events/league");
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      if (res.ok) {
        setTeams(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch teams:", err);
    }
  }

  async function handleAddToCart() {
    if (!regForm) return;
    setRegistering(true);
    setMessage(null);

    if (!regForm.teamId) {
      setMessage({ type: "error", text: "Please select a team." });
      setRegistering(false);
      return;
    }

    try {
      const res = await fetch("/api/registration-cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueSlug: regForm.leagueSlug,
          eventId: regForm.eventId,
          divisionId: regForm.divisionId,
          teamId: regForm.teamId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to add to cart." });
        setRegistering(false);
        return;
      }

      setMessage({
        type: "success",
        text: `${data.message} (${data.itemCount} item${data.itemCount === 1 ? "" : "s"} in cart)`,
      });
      setCartItemCount(data.itemCount);
      setRegForm(null);
    } catch {
      setMessage({ type: "error", text: "Failed to add to cart. Please try again." });
    } finally {
      setRegistering(false);
    }
  }

  // Roster management functions
  async function openRosterManager(reg: {
    _id: string;
    teamId?: string;
    teamName: string;
  }, leagueSlug: string) {
    if (!reg.teamId) return;
    setRosterModal({
      registrationId: reg._id,
      teamId: reg.teamId,
      teamName: reg.teamName,
      leagueSlug,
    });
    setRosterLoading(true);

    try {
      // Fetch team's full roster and currently submitted event roster in parallel
      const [teamRes, eventRosterRes] = await Promise.all([
        fetch(`/api/teams/${reg.teamId}/roster`),
        fetch(`/api/events/league/${reg._id}/roster?leagueSlug=${leagueSlug}`),
      ]);

      if (teamRes.ok) {
        setTeamRoster(await teamRes.json());
      }

      if (eventRosterRes.ok) {
        const data = await eventRosterRes.json();
        const submitted: RosterPlayer[] = data.roster || [];
        setSubmittedRoster(submitted);
        setSelectedPlayerIds(new Set(submitted.map((p) => p.playerId)));
      } else {
        setSubmittedRoster([]);
        setSelectedPlayerIds(new Set());
      }
    } catch (err) {
      console.error("Failed to load roster data:", err);
    } finally {
      setRosterLoading(false);
    }
  }

  function togglePlayer(playerId: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedPlayerIds(new Set(teamRoster.map((p) => p.playerId)));
  }

  function deselectAll() {
    setSelectedPlayerIds(new Set());
  }

  async function saveRoster() {
    if (!rosterModal) return;
    setRosterSaving(true);

    const roster = teamRoster
      .filter((p) => selectedPlayerIds.has(p.playerId))
      .map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
      }));

    try {
      const res = await fetch(`/api/events/league/${rosterModal.registrationId}/roster`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueSlug: rosterModal.leagueSlug,
          roster,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `Roster updated: ${roster.length} players submitted for ${rosterModal.teamName}.` });
        setRosterModal(null);
        fetchEvents(); // Refresh to show updated roster counts
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save roster." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save roster. Please try again." });
    } finally {
      setRosterSaving(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function isRegOpen(event: LeagueEvent) {
    return event.status === "registration_open";
  }

  function getEarlyBirdActive(event: LeagueEvent) {
    if (!event.pricing.earlyBirdAmount || !event.pricing.earlyBirdDeadline) return false;
    return new Date() < new Date(event.pricing.earlyBirdDeadline);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">League Events</h1>
          <p className="text-muted-foreground">
            Browse and register your teams for upcoming league events and tournaments.
          </p>
        </div>
        {cartItemCount > 0 && (
          <Button asChild>
            <Link href="/registration-cart">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart ({cartItemCount})
            </Link>
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-4 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No Events Found</h3>
            <p className="text-sm text-muted-foreground">
              No league events are currently available. Check back soon or contact your league.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isExpanded = expandedEvent === event._id;
            const earlyBird = getEarlyBirdActive(event);
            const displayPrice = earlyBird
              ? event.pricing.earlyBirdAmount!
              : event.pricing.amount;
            const location = event.locations[0];
            const orgRegs = event._orgRegistrations || [];

            return (
              <Card key={event._id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedEvent(isExpanded ? null : event._id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        {event._isAffiliated && (
                          <Badge variant="secondary" className="text-xs">Affiliated</Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5" />
                          {event._leagueName}
                        </span>
                        {location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {location.city}, {location.state}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(event.startDate)}
                          {event.startDate !== event.endDate && ` — ${formatDate(event.endDate)}`}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {displayPrice === 0 ? "Free" : formatPrice(displayPrice)}
                        </div>
                        {earlyBird && (
                          <span className="text-xs text-green-600 font-medium">Early bird pricing</span>
                        )}
                        <div className="mt-1">
                          {isRegOpen(event) ? (
                            <Badge className="bg-green-100 text-green-700">Registration Open</Badge>
                          ) : (
                            <Badge variant="outline">{event.status.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}

                    {/* Your registrations */}
                    {orgRegs.length > 0 && (
                      <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2">Your Registered Teams</h4>
                        <div className="space-y-2">
                          {orgRegs.map((r) => {
                            const div = event._divisions.find((d) => d._id === r.divisionId);
                            const rosterCount = r.roster?.length || 0;
                            return (
                              <div key={r._id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-700">
                                    {r.teamName} — {div?.label || "Division"}
                                  </span>
                                  {rosterCount > 0 && (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Users className="h-3 w-3" /> {rosterCount} players
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={r.status === "approved" ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {r.status}
                                  </Badge>
                                  {r.teamId && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRosterManager(r, event._leagueSlug);
                                      }}
                                    >
                                      <ClipboardList className="h-3 w-3" />
                                      {rosterCount > 0 ? "Edit Roster" : "Submit Roster"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Divisions */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Divisions</h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {event._divisions.map((div) => {
                          const alreadyRegistered = orgRegs.some(
                            (r) => r.divisionId === div._id,
                          );
                          return (
                            <div
                              key={div._id}
                              className="flex items-center justify-between rounded-md border p-3"
                            >
                              <div>
                                <div className="text-sm font-medium">{div.label}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {div._registeredCount} registered
                                  </span>
                                  {div._spotsRemaining !== null && (
                                    <span>
                                      {div._spotsRemaining > 0
                                        ? `${div._spotsRemaining} spots left`
                                        : "Full"}
                                    </span>
                                  )}
                                </div>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {div.eventFormat.replace(/_/g, " ")}
                                </Badge>
                              </div>
                              {isRegOpen(event) && !alreadyRegistered && (
                                <Button
                                  size="sm"
                                  variant={
                                    regForm?.divisionId === div._id ? "default" : "outline"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRegForm({
                                      eventId: event._id,
                                      leagueSlug: event._leagueSlug,
                                      divisionId: div._id,
                                      teamId: regForm?.teamId || "",
                                    });
                                  }}
                                  disabled={div._spotsRemaining === 0}
                                >
                                  {div._spotsRemaining === 0 ? "Full" : "Register"}
                                </Button>
                              )}
                              {alreadyRegistered && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Registration form */}
                    {regForm?.eventId === event._id && (
                      <>
                        <Separator />
                        <div className="rounded-md border bg-muted/30 p-4 space-y-4">
                          <h4 className="text-sm font-semibold">Register Your Team</h4>
                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-sm font-medium">Select Team</label>
                              <Select
                                value={regForm.teamId}
                                onValueChange={(val) =>
                                  setRegForm({ ...regForm, teamId: val })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a team..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams.map((t) => (
                                    <SelectItem key={t._id} value={t._id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="text-right">
                              <div className="mb-1 text-xs text-muted-foreground">Division</div>
                              <Badge variant="outline">
                                {event._divisions.find((d) => d._id === regForm.divisionId)?.label}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="mb-1 text-xs text-muted-foreground">Fee</div>
                              <span className="text-sm font-bold">
                                {displayPrice === 0 ? "Free" : formatPrice(displayPrice)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleAddToCart}
                              disabled={!regForm.teamId || registering}
                            >
                              {registering ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingCart className="mr-2 h-4 w-4" />
                              )}
                              Add to Cart
                              {displayPrice > 0 && ` — ${formatPrice(displayPrice)}`}
                            </Button>
                            <Button variant="ghost" onClick={() => setRegForm(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Event details */}
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <span className="font-medium">Registration Window:</span>{" "}
                        <span className="text-muted-foreground">
                          {formatDate(event.registrationOpen)} — {formatDate(event.registrationClose)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Event Type:</span>{" "}
                        <span className="text-muted-foreground capitalize">
                          {event.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      {event.locations.map((loc, i) => (
                        <div key={i}>
                          <span className="font-medium">Venue:</span>{" "}
                          <span className="text-muted-foreground">
                            {loc.name}{loc.city ? `, ${loc.city}` : ""}{loc.state ? ` ${loc.state}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {/* Roster Management Modal */}
      {rosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-semibold">Event Roster — {rosterModal.teamName}</h3>
                <p className="text-sm text-muted-foreground">
                  Select players to include in the event roster
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRosterModal(null)}>
                &times;
              </Button>
            </div>

            {rosterLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedPlayerIds.size} of {teamRoster.length} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto p-4">
                  {teamRoster.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No players found on this team&apos;s roster. Add players to the team first.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {teamRoster.map((player) => {
                        const isSelected = selectedPlayerIds.has(player.playerId);
                        return (
                          <div
                            key={player.playerId}
                            className={`flex cursor-pointer items-center gap-3 rounded-md border p-2.5 transition-colors ${
                              isSelected
                                ? "border-blue-300 bg-blue-50"
                                : "border-transparent hover:bg-muted/50"
                            }`}
                            onClick={() => togglePlayer(player.playerId)}
                          >
                            <div
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{player.playerName}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {player.jerseyNumber != null && <span>#{player.jerseyNumber}</span>}
                                {player.position && <span>{player.position}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t p-4">
                  <Button variant="ghost" onClick={() => setRosterModal(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={saveRoster}
                    disabled={rosterSaving || selectedPlayerIds.size === 0}
                  >
                    {rosterSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Roster ({selectedPlayerIds.size} players)
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
