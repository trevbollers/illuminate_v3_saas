"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trophy,
} from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Badge } from "@goparticipate/ui/src/components/badge";

interface InviteDetails {
  invite: {
    _id: string;
    role: string;
    expiresAt: string;
    createdAt: string;
  };
  team: { name: string; sport: string } | null;
  org: { name: string } | null;
}

type PageState = "loading" | "details" | "accepting" | "accepted" | "error" | "requires-auth";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = params.token as string;

  const [state, setState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState("");
  const [acceptResult, setAcceptResult] = useState<{ role: string; message: string } | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/accept/${token}`);
        const data = await res.json();

        if (data.requiresAuth) {
          setState("requires-auth");
          return;
        }

        if (!res.ok) {
          setError(data.error || "Invite not found.");
          setState("error");
          return;
        }

        setInvite(data);
        setState("details");
      } catch {
        setError("Failed to load invite.");
        setState("error");
      }
    }

    fetchInvite();
  }, [token, sessionStatus]);

  async function handleAccept() {
    setState("accepting");
    try {
      const res = await fetch(`/api/invites/accept/${token}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invite.");
        setState("error");
        return;
      }

      setAcceptResult(data);
      setState("accepted");
    } catch {
      setError("Something went wrong.");
      setState("error");
    }
  }

  function handleGoToDashboard() {
    router.push("/");
  }

  function handleLogin() {
    const callbackUrl = `/invite/${token}`;
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const roleLabels: Record<string, string> = {
    player: "Player",
    coach: "Coach",
    manager: "Team Manager",
    viewer: "Viewer",
  };

  const roleColors: Record<string, string> = {
    player: "bg-blue-100 text-blue-800",
    coach: "bg-green-100 text-green-800",
    manager: "bg-purple-100 text-purple-800",
    viewer: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        {/* Loading */}
        {state === "loading" && (
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Loading invite...</p>
          </CardContent>
        )}

        {/* Requires Auth */}
        {state === "requires-auth" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Team Invite</CardTitle>
              <CardDescription>
                Sign in to accept this invitation and join the team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleLogin}>
                Sign In to Continue
              </Button>
            </CardContent>
          </>
        )}

        {/* Invite Details */}
        {state === "details" && invite && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">You're Invited!</CardTitle>
              <CardDescription>
                You've been invited to join a team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                {invite.org && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Organization</span>
                    <span className="text-sm font-medium">{invite.org.name}</span>
                  </div>
                )}
                {invite.team && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Team</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{invite.team.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {invite.team.sport}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[invite.invite.role] ?? "bg-gray-100 text-gray-800"}`}>
                    {roleLabels[invite.invite.role] ?? invite.invite.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expires</span>
                  <span className="text-sm">
                    {new Date(invite.invite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {session?.user && (
                <p className="text-sm text-muted-foreground text-center">
                  Signed in as <span className="font-medium text-foreground">{session.user.email}</span>
                </p>
              )}

              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleAccept}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Accept & Join Team
              </Button>
            </CardContent>
          </>
        )}

        {/* Accepting */}
        {state === "accepting" && (
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="mt-4 text-sm text-muted-foreground">Joining team...</p>
          </CardContent>
        )}

        {/* Accepted */}
        {state === "accepted" && acceptResult && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Welcome to the Team!</CardTitle>
              <CardDescription>{acceptResult.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={handleGoToDashboard}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Invite Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
