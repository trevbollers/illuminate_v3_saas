"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy dash.gameon.../invite/[token] URL — kept so invite emails sent
 * before the architecture change still work. Immediately redirects to
 * the new web-app bouncer at gameon.goparticipate.com/invite/[token].
 *
 * All accept UX now lives on the web app so the parent is authenticated
 * in their family context, not on the team admin subdomain.
 */
export default function LegacyInviteRedirect() {
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    if (!token) return;
    const webUrl = process.env.NEXT_PUBLIC_APP_URL || "https://goparticipate.com";
    window.location.replace(`${webUrl}/invite/${token}`);
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting to your invite...
      </div>
    </div>
  );
}
