"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Shield, Loader2, ArrowLeft, Smartphone, Mail, KeyRound } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";

type LoginMode = "choose" | "email-password" | "magic-code" | "magic-code-verify" | "player-code";

export default function DashboardLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");
  const isWelcome = searchParams.get("welcome") === "true";

  const [mode, setMode] = useState<LoginMode>("choose");
  const [loading, setLoading] = useState(false);
  const clearedRef = useRef(false);
  const [error, setError] = useState(
    errorParam === "invalid_account"
      ? "This account is not associated with a team or organization."
      : "",
  );

  // Auto-sign out stale sessions so user can log in with a different account
  useEffect(() => {
    if (errorParam === "invalid_account" && !clearedRef.current) {
      clearedRef.current = true;
      signOut({ redirect: false });
    }
  }, [errorParam]);

  // Email/password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Magic code
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  // Player code
  const [playerCode, setPlayerCode] = useState("");

  function resetError() { setError(""); }

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault();
    resetError();
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    if (result?.error) { setError("Invalid email or password"); setLoading(false); return; }
    window.location.href = callbackUrl;
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    resetError();
    try {
      const res = await fetch("/api/auth/magic-code/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to send code."); return; }
      if (data._devCode) setDevCode(data._devCode);
      setMode("magic-code-verify");
    } catch { setError("Failed to send code."); } finally { setLoading(false); }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    resetError();
    try {
      const result = await signIn("magic-code", {
        identifier: identifier.trim().toLowerCase(),
        code: code.trim(),
        redirect: false,
      });
      if (result?.error) { setError("Invalid or expired code."); return; }
      window.location.href = callbackUrl;
    } catch { setError("Something went wrong."); } finally { setLoading(false); }
  }

  async function handlePlayerCode(e: React.FormEvent) {
    e.preventDefault();
    if (playerCode.length !== 6) return;
    setLoading(true);
    resetError();
    try {
      const result = await signIn("magic-code", {
        identifier: `player:${playerCode.trim()}`,
        code: playerCode.trim(),
        redirect: false,
      });
      if (result?.error) { setError("Invalid or expired player code."); return; }
      window.location.href = callbackUrl;
    } catch { setError("Something went wrong."); } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() { await signIn("google", { callbackUrl }); }
  async function handleAppleSignIn() { await signIn("apple", { callbackUrl }); }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        {/* ===== CHOOSE ===== */}
        {mode === "choose" && (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl">Team Dashboard</CardTitle>
              <CardDescription>Sign in to manage your teams and rosters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isWelcome && (
                <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                  Account created! Sign in with the credentials you just used to get started.
                </div>
              )}
              {error && <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">{error}</p>}

              <Button variant="outline" className="w-full gap-3" onClick={handleGoogleSignIn}>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <Button variant="outline" className="w-full gap-3" onClick={handleAppleSignIn}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </Button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-3" onClick={() => { resetError(); setMode("magic-code"); }}>
                <Smartphone className="h-4 w-4" /> Text or email me a code
              </Button>

              <Button variant="ghost" className="w-full gap-3 text-muted-foreground" onClick={() => { resetError(); setMode("email-password"); }}>
                <Mail className="h-4 w-4" /> Email & password
              </Button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Player?</span>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-3" onClick={() => { resetError(); setMode("player-code"); }}>
                <KeyRound className="h-4 w-4" /> I have a player code
              </Button>
            </CardContent>
          </>
        )}

        {/* ===== EMAIL/PASSWORD ===== */}
        {mode === "email-password" && (
          <>
            <CardHeader>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2" onClick={() => { resetError(); setMode("choose"); }}>
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <CardTitle className="text-lg">Sign in with email</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailPassword} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="coach@yourteam.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ===== MAGIC CODE SEND ===== */}
        {mode === "magic-code" && (
          <>
            <CardHeader>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2" onClick={() => { resetError(); setMode("choose"); }}>
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <CardTitle className="text-lg">Sign in with a code</CardTitle>
              <CardDescription>We'll send a 6-digit code to your email or phone.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendCode} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="space-y-2">
                  <Label>Email or phone</Label>
                  <Input placeholder="you@example.com or (555) 123-4567" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus />
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Code"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ===== MAGIC CODE VERIFY ===== */}
        {mode === "magic-code-verify" && (
          <>
            <CardHeader>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2" onClick={() => { resetError(); setCode(""); setDevCode(null); setMode("magic-code"); }}>
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <CardTitle className="text-lg">Enter your code</CardTitle>
              <CardDescription>Sent to <span className="font-medium text-foreground">{identifier}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                {devCode && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                    Dev mode — code: <span className="font-mono font-bold">{devCode}</span>
                  </div>
                )}
                <Input
                  type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus
                />
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading || code.length !== 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign In"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {/* ===== PLAYER CODE ===== */}
        {mode === "player-code" && (
          <>
            <CardHeader>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2" onClick={() => { resetError(); setMode("choose"); }}>
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
              <CardTitle className="text-lg">Player Login</CardTitle>
              <CardDescription>Enter the code your parent or coach gave you.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePlayerCode} className="space-y-4">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Input
                  type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  value={playerCode} onChange={(e) => setPlayerCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus
                />
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading || playerCode.length !== 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join My Team"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
