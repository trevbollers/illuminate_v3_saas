"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Loader2, ArrowLeft, Smartphone, Mail, KeyRound, Medal } from "lucide-react";

type LoginMode = "choose" | "email-password" | "magic-code" | "magic-code-verify" | "player-code";

// Wrap the real component in Suspense so useSearchParams inside it can
// safely bail out of static prerender without failing the whole build.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const prefilledEmail = searchParams.get("email");

  const [mode, setMode] = useState<LoginMode>("choose");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Email/password state (email may be pre-filled from a ?email= query param,
  // e.g. when the user arrived here from an /invite/[token] bounce)
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");

  // Magic code state
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone">("email");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  // Player code state
  const [playerCode, setPlayerCode] = useState("");

  function resetError() {
    setServerError(null);
  }

  async function routeAfterLogin() {
    // If the caller passed ?callbackUrl= (e.g. from the invite bouncer or a
    // protected-page redirect), honor it. Only allow same-origin paths to
    // avoid open-redirect abuse.
    if (callbackUrl && callbackUrl.startsWith("/")) {
      window.location.href = callbackUrl;
      return;
    }

    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const tenantType = session?.user?.tenantType;
      const platformRole = session?.user?.platformRole;

      // In production (shared domain), redirect to the right app.
      // In dev (separate ports), sessions don't cross ports — show the
      // account page with links to log in on the correct app.
      const isDev = window.location.hostname === "localhost";

      if (isDev) {
        // Stay on web app, show where to go
        window.location.href = "/account";
        return;
      }

      if (platformRole === "gp_admin") {
        window.location.href = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.goparticipate.com";
      } else if (tenantType === "league") {
        window.location.href = process.env.NEXT_PUBLIC_LEAGUE_URL ?? `https://${session?.user?.tenantSlug}.goparticipate.com`;
      } else if (tenantType === "organization") {
        window.location.href = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? `https://${session?.user?.tenantSlug}.goparticipate.com`;
      } else if (session?.user?.familyId) {
        window.location.href = "/family";
      } else {
        window.location.href = "/account";
      }
    } catch {
      window.location.href = "/account";
    }
  }

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    resetError();

    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setServerError("Invalid email or password.");
        return;
      }
      await routeAfterLogin();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setIsSubmitting(true);
    resetError();

    try {
      const res = await fetch("/api/auth/magic-code/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || "Failed to send code.");
        return;
      }

      setIdentifierType(data.identifierType);
      if (data._devCode) setDevCode(data._devCode);
      setMode("magic-code-verify");
    } catch {
      setServerError("Failed to send code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setIsSubmitting(true);
    resetError();

    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("magic-code", {
        identifier: identifier.trim().toLowerCase(),
        code: code.trim(),
        redirect: false,
      });

      if (result?.error) {
        setServerError("Invalid or expired code. Please try again.");
        return;
      }
      await routeAfterLogin();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePlayerCode(e: React.FormEvent) {
    e.preventDefault();
    if (!playerCode.trim()) return;
    setIsSubmitting(true);
    resetError();

    // Player codes use the magic-code provider with a special identifier format
    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("magic-code", {
        identifier: `player:${playerCode.trim()}`,
        code: playerCode.trim(),
        redirect: false,
      });

      if (result?.error) {
        setServerError("Invalid or expired player code.");
        return;
      }
      window.location.href = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:4003";
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    const { signIn } = await import("next-auth/react");
    await signIn("google", {
      callbackUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:4003",
    });
  }

  async function handleAppleSignIn() {
    const { signIn } = await import("next-auth/react");
    await signIn("apple", {
      callbackUrl: process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:4003",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Medal className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Go Participate
            </span>
          </Link>
        </div>

        <Card className="shadow-xl border-border/50">
          {/* ===== CHOOSE MODE ===== */}
          {mode === "choose" && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Choose how you'd like to sign in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {serverError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {serverError}
                  </div>
                )}

                {/* Social OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-3"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-3"
                  onClick={handleAppleSignIn}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                {/* Magic code */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-3"
                  onClick={() => { resetError(); setMode("magic-code"); }}
                >
                  <Smartphone className="h-4 w-4" />
                  Text or email me a code
                </Button>

                {/* Email/password */}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-3 text-muted-foreground"
                  onClick={() => { resetError(); setMode("email-password"); }}
                >
                  <Mail className="h-4 w-4" />
                  Sign in with email & password
                </Button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Player?</span>
                  </div>
                </div>

                {/* Player code */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-3"
                  onClick={() => { resetError(); setMode("player-code"); }}
                >
                  <KeyRound className="h-4 w-4" />
                  I have a player code
                </Button>
              </CardContent>
            </>
          )}

          {/* ===== EMAIL & PASSWORD ===== */}
          {mode === "email-password" && (
            <>
              <CardHeader>
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  onClick={() => { resetError(); setMode("choose"); }}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <CardTitle className="text-xl">Sign in with email</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailPassword} className="space-y-4">
                  {serverError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {serverError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* ===== MAGIC CODE — SEND ===== */}
          {mode === "magic-code" && (
            <>
              <CardHeader>
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  onClick={() => { resetError(); setMode("choose"); }}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <CardTitle className="text-xl">Sign in with a code</CardTitle>
                <CardDescription>
                  We'll send a 6-digit code to your email or phone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendCode} className="space-y-4">
                  {serverError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {serverError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email or phone number</Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="you@example.com or (555) 123-4567"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Code"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* ===== MAGIC CODE — VERIFY ===== */}
          {mode === "magic-code-verify" && (
            <>
              <CardHeader>
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  onClick={() => { resetError(); setCode(""); setDevCode(null); setMode("magic-code"); }}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <CardTitle className="text-xl">Enter your code</CardTitle>
                <CardDescription>
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{identifier}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  {serverError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {serverError}
                    </div>
                  )}

                  {devCode && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      Dev mode — your code is: <span className="font-mono font-bold">{devCode}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="code">6-digit code</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign In"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => { setCode(""); setDevCode(null); handleSendCode(new Event("submit") as any); }}
                  >
                    Didn't get a code? Send again
                  </button>
                </form>
              </CardContent>
            </>
          )}

          {/* ===== PLAYER CODE ===== */}
          {mode === "player-code" && (
            <>
              <CardHeader>
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  onClick={() => { resetError(); setMode("choose"); }}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <CardTitle className="text-xl">Player Login</CardTitle>
                <CardDescription>
                  Enter the code your parent or coach gave you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePlayerCode} className="space-y-4">
                  {serverError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {serverError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="playerCode">Player code</Label>
                    <Input
                      id="playerCode"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      className="text-center text-2xl tracking-[0.5em] font-mono"
                      value={playerCode}
                      onChange={(e) => setPlayerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || playerCode.length !== 6}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join My Team"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
