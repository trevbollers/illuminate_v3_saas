"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2,
  XCircle,
  Mail,
  Shield,
  Heart,
  Users,
} from "lucide-react";

/**
 * /invite/[token] — parent invite router / bouncer.
 *
 * Replaces the anonymous accept page. Here we only decide where to
 * send the parent next:
 *
 *   1. Not logged in, email already has an account  → /auth/login with
 *      a callback that returns them to /family. The invite will show
 *      up in their pending-invites list once they're authenticated.
 *
 *   2. Not logged in, email is new                  → /signup as
 *      family with email pre-filled. After signup + auth, the invite
 *      shows up on /family ready to accept.
 *
 *   3. Logged in as the right user                  → /family. The
 *      pending-invites section handles the accept action in-context.
 *
 *   4. Logged in as SOMEONE ELSE                    → show a warning
 *      and suggest sign-out, so they don't accidentally claim an
 *      invite meant for a different person.
 *
 * Acceptance itself lives at POST /api/family/invites/[token]/accept.
 */

interface InviteData {
  valid: boolean;
  token: string;
  role: string;
  email?: string;
  inviteName?: string;
  orgName: string;
  orgSlug: string;
  teamNames: string[];
  existingUser: boolean;
  existingUserName?: string | null;
  error?: string;
}

const ROLE_LABELS: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Assistant Coach",
  team_manager: "Team Manager",
  player: "Player",
  viewer: "Viewer",
};

export default function InviteRouterPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d: InviteData) => {
        if (!d.valid) {
          setError(d.error || "Invite not found or expired.");
          return;
        }
        setInvite(d);
      })
      .catch(() => setError("Failed to load invite."));
  }, [token]);

  // Once we have both invite data AND session state, route accordingly.
  useEffect(() => {
    if (!invite || status === "loading") return;

    const sessionEmail = (session?.user?.email || "").toLowerCase();
    const inviteEmail = (invite.email || "").toLowerCase();

    // Logged in as the right person → straight to /family
    if (sessionEmail && inviteEmail && sessionEmail === inviteEmail) {
      router.replace("/family");
      return;
    }

    // Logged in as someone else → warning screen (handled below, no redirect)
    if (sessionEmail && inviteEmail && sessionEmail !== inviteEmail) {
      return;
    }

    // Not logged in — route by whether the invite email has an account.
    // Always carry the invite token through so the target page can show
    // the user context about the invite (e.g. "Eastern Iowa Ball Hawks
    // invited you to join as Player").
    if (!session) {
      const callback = encodeURIComponent("/family");
      const tokenParam = `&invite=${encodeURIComponent(invite.token)}`;
      if (invite.existingUser && invite.email) {
        // Existing user → sign in
        router.replace(
          `/auth/login?email=${encodeURIComponent(invite.email)}&callbackUrl=${callback}${tokenParam}`,
        );
      } else if (invite.email) {
        // New user → sign up as family with email pre-filled
        router.replace(
          `/signup?role=family&email=${encodeURIComponent(invite.email)}&callbackUrl=${callback}${tokenParam}`,
        );
      } else {
        // Invite has no email (phone-only invite) — send to login and let
        // them figure out which account to use
        router.replace(`/auth/login?callbackUrl=${callback}${tokenParam}`);
      }
    }
  }, [invite, session, status, router]);

  // ─── UI states ───────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Invite Error</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-amber-600 hover:underline"
          >
            Go to Go Participate →
          </Link>
        </div>
      </div>
    );
  }

  // Wrong user signed in — warn before doing anything destructive
  const sessionEmail = (session?.user?.email || "").toLowerCase();
  const inviteEmail = (invite?.email || "").toLowerCase();
  if (invite && sessionEmail && inviteEmail && sessionEmail !== inviteEmail) {
    const Icon =
      invite.role === "player" || invite.role === "viewer" ? Heart : Users;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Icon className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Invite to {invite.orgName}
              </h1>
              <p className="text-xs text-slate-500">
                {ROLE_LABELS[invite.role] || invite.role}
                {invite.teamNames.length > 0 && ` · ${invite.teamNames.join(", ")}`}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">
              You're signed in as a different person.
            </p>
            <p className="mt-1 text-amber-800">
              This invite was sent to{" "}
              <strong>{invite.email}</strong>, but you're signed in as{" "}
              <strong>{sessionEmail}</strong>. Sign out and use the invite
              link again with the correct email.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href="/api/auth/signout"
              className="flex-1 inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </a>
            <Link
              href="/family"
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Stay signed in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default — we're about to redirect, show a short loading state with the
  // invite context so the user knows what's happening.
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
          <Mail className="h-6 w-6 text-amber-600" />
        </div>
        {invite ? (
          <>
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Invite to {invite.orgName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {ROLE_LABELS[invite.role] || invite.role}
              {invite.teamNames.length > 0 && (
                <> · {invite.teamNames.join(", ")}</>
              )}
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Taking you to {invite.existingUser ? "sign in" : "sign up"}...
            </div>
          </>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading invite...
          </div>
        )}
      </div>
    </div>
  );
}
