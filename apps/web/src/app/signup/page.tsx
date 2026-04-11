"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@goparticipate/ui/src/components/card";
import {
  ArrowRight,
  Loader2,
  Trophy,
  Shield,
  Heart,
  Check,
} from "lucide-react";

// ── Role Config ──────────────────────────────────────────────────────────────
const roleConfig = {
  league: {
    key: "league" as const,
    icon: Trophy,
    label: "Run a League",
    tagline: "For commissioners & league directors",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBorder: "border-blue-500",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
    ringClass: "ring-blue-500",
    plan: "league",
    planLabel: "League — $79.99/mo",
  },
  org: {
    key: "org" as const,
    icon: Shield,
    label: "Manage a Team or Org",
    tagline: "For coaches, org admins & team managers",
    color: "emerald",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    activeBorder: "border-emerald-500",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700",
    ringClass: "ring-emerald-500",
    plan: null, // user picks
    planLabel: null,
  },
  family: {
    key: "family" as const,
    icon: Heart,
    label: "Join as a Family",
    tagline: "For parents & players",
    color: "amber",
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeBorder: "border-amber-500",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    buttonBg: "bg-amber-600 hover:bg-amber-700",
    ringClass: "ring-amber-500",
    plan: "family_free",
    planLabel: "Always Free",
  },
} as const;

type RoleKey = keyof typeof roleConfig;

const orgPlans = [
  { id: "free", name: "Free", price: "$0", period: "", desc: "1 team, 15 players" },
  { id: "team_pro", name: "Team Pro", price: "$9.99", period: "/mo", desc: "1 team, 25 players", highlighted: true },
  { id: "partner", name: "Partner", price: "$4.99", period: "/mo", desc: "Team Pro via uniform partner" },
  { id: "organization", name: "Organization", price: "$29.99", period: "/mo", desc: "Up to 10 teams" },
];

// ── Schemas ──────────────────────────────────────────────────────────────────
const baseSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must include uppercase, lowercase, and a number"
    ),
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms of service" }),
  }),
});

const leagueSchema = baseSchema.extend({
  leagueName: z.string().min(2, "League name must be at least 2 characters"),
  region: z.string().min(2, "Region is required"),
  sport: z.enum(["7v7_football", "basketball"]),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const orgSchema = baseSchema.extend({
  orgName: z.string().min(2, "Team/org name must be at least 2 characters"),
  sport: z.enum(["7v7_football", "basketball"]),
  plan: z.string().min(1, "Please select a plan"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const familySchema = baseSchema.refine(
  (d) => d.password === d.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
);

type LeagueData = z.infer<typeof leagueSchema>;
type OrgData = z.infer<typeof orgSchema>;
type FamilyData = z.infer<typeof familySchema>;

// ── Component ────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as RoleKey | null;
  const planParam = searchParams.get("plan");

  const [activeRole, setActiveRole] = useState<RoleKey>(
    roleParam && roleParam in roleConfig ? roleParam : "org"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const role = roleConfig[activeRole];

  function handleTabClick(key: RoleKey) {
    setActiveRole(key);
    setServerError(null);
  }

  async function submitRegistration(payload: Record<string, unknown>) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Registration failed. Please try again.");
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        // Paid plan → Stripe checkout → redirects to correct app on success
        window.location.href = data.checkoutUrl;
      } else if (data.redirectUrl) {
        // Free plan → go directly to the correct app
        window.location.href = data.redirectUrl;
      } else {
        // Fallback: verify email page
        const email = payload.email as string;
        router.push("/auth/verify-email?email=" + encodeURIComponent(email));
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <div className="px-4 pt-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">GP</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Go Participate
          </span>
        </Link>
      </div>

      <div className="mx-auto w-full max-w-lg px-4 py-8">
        {/* Role Tabs */}
        <div className="mb-6 flex gap-2">
          {(Object.keys(roleConfig) as RoleKey[]).map((key) => {
            const r = roleConfig[key];
            const Icon = r.icon;
            const isActive = activeRole === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabClick(key)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                  isActive
                    ? `${r.activeBorder} ${r.bg} shadow-md`
                    : `border-border bg-card hover:${r.bg}`
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive ? r.iconBg : "bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? r.iconText : "text-muted-foreground"}`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Card */}
        <Card className={`border-2 shadow-xl ${role.activeBorder}`}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${role.iconBg}`}>
                <role.icon className={`h-5 w-5 ${role.iconText}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{role.label}</h1>
                <p className="text-sm text-muted-foreground">{role.tagline}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {serverError && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {activeRole === "league" && (
              <LeagueForm
                onSubmit={submitRegistration}
                isSubmitting={isSubmitting}
                buttonClass={role.buttonBg}
              />
            )}
            {activeRole === "org" && (
              <OrgForm
                onSubmit={submitRegistration}
                isSubmitting={isSubmitting}
                buttonClass={role.buttonBg}
                defaultPlan={planParam}
              />
            )}
            {activeRole === "family" && (
              <FamilyForm
                onSubmit={submitRegistration}
                isSubmitting={isSubmitting}
                buttonClass={role.buttonBg}
              />
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// ── League Form ──────────────────────────────────────────────────────────────
function LeagueForm({
  onSubmit,
  isSubmitting,
  buttonClass,
}: {
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
  buttonClass: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeagueData>({
    resolver: zodResolver(leagueSchema),
    defaultValues: { sport: "7v7_football" },
  });

  function handle(data: LeagueData) {
    onSubmit({
      role: "league",
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      tenantName: data.leagueName,
      region: data.region,
      sport: data.sport,
      plan: "league",
    });
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4">
      <FormField label="League Name" placeholder="MidAmerica 7v7" error={errors.leagueName?.message}>
        <Input placeholder="MidAmerica 7v7" {...register("leagueName")} aria-invalid={!!errors.leagueName} />
      </FormField>
      <FormField label="Region" error={errors.region?.message}>
        <Input placeholder="Kansas City Metro" {...register("region")} aria-invalid={!!errors.region} />
      </FormField>
      <div className="space-y-2">
        <Label>Sport</Label>
        <select
          {...register("sport")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="7v7_football">7v7 Football</option>
          <option value="basketball">Basketball</option>
        </select>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-foreground">League Plan</span>
          </div>
          <span className="text-sm font-bold text-foreground">$79.99/mo</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Unlimited teams & events</p>
      </div>

      <hr className="border-border" />

      <FormField label="Full Name" error={errors.fullName?.message}>
        <Input placeholder="Jane Smith" {...register("fullName")} aria-invalid={!!errors.fullName} />
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="jane@example.com" {...register("email")} aria-invalid={!!errors.email} />
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        <Input type="password" placeholder="Min. 8 characters" {...register("password")} aria-invalid={!!errors.password} />
      </FormField>
      <FormField label="Confirm Password" error={errors.confirmPassword?.message}>
        <Input type="password" placeholder="Repeat your password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
      </FormField>

      <TermsCheckbox register={register} error={errors.acceptTerms?.message} />

      <Button type="submit" className={`w-full gap-2 ${buttonClass}`} size="lg" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating league...</> : <>Create League <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </form>
  );
}

// ── Org Form ─────────────────────────────────────────────────────────────────
function OrgForm({
  onSubmit,
  isSubmitting,
  buttonClass,
  defaultPlan,
}: {
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
  buttonClass: string;
  defaultPlan: string | null;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrgData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      sport: "7v7_football",
      plan: defaultPlan && orgPlans.some((p) => p.id === defaultPlan) ? defaultPlan : "",
    },
  });

  const selectedPlan = watch("plan");

  function handle(data: OrgData) {
    onSubmit({
      role: "org",
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      tenantName: data.orgName,
      sport: data.sport,
      plan: data.plan,
    });
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4">
      <FormField label="Team / Organization Name" error={errors.orgName?.message}>
        <Input placeholder="KC Thunder" {...register("orgName")} aria-invalid={!!errors.orgName} />
      </FormField>
      <div className="space-y-2">
        <Label>Sport</Label>
        <select
          {...register("sport")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="7v7_football">7v7 Football</option>
          <option value="basketball">Basketball</option>
        </select>
      </div>

      {/* Plan Selector */}
      <div className="space-y-2">
        <Label>Plan</Label>
        {errors.plan && <p className="text-xs text-destructive">{errors.plan.message}</p>}
        <div className="grid grid-cols-2 gap-2">
          {orgPlans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setValue("plan", p.id, { shouldValidate: true })}
              className={`relative flex flex-col rounded-lg border-2 p-3 text-left transition-all ${
                selectedPlan === p.id
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-border hover:border-emerald-300"
              }`}
            >
              {p.highlighted && (
                <span className="absolute -top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  Popular
                </span>
              )}
              <span className="text-sm font-bold text-foreground">{p.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.price}{p.period}
              </span>
              <span className="mt-1 text-[11px] text-muted-foreground">{p.desc}</span>
              {selectedPlan === p.id && (
                <Check className="absolute top-2 right-2 h-4 w-4 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      </div>
      {/* Hidden input so react-hook-form tracks it */}
      <input type="hidden" {...register("plan")} />

      <hr className="border-border" />

      <FormField label="Full Name" error={errors.fullName?.message}>
        <Input placeholder="John Coach" {...register("fullName")} aria-invalid={!!errors.fullName} />
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="coach@example.com" {...register("email")} aria-invalid={!!errors.email} />
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        <Input type="password" placeholder="Min. 8 characters" {...register("password")} aria-invalid={!!errors.password} />
      </FormField>
      <FormField label="Confirm Password" error={errors.confirmPassword?.message}>
        <Input type="password" placeholder="Repeat your password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
      </FormField>

      <TermsCheckbox register={register} error={errors.acceptTerms?.message} />

      <Button type="submit" className={`w-full gap-2 ${buttonClass}`} size="lg" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : <>Get Started <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </form>
  );
}

// ── Family Form ──────────────────────────────────────────────────────────────
function FamilyForm({
  onSubmit,
  isSubmitting,
  buttonClass,
}: {
  onSubmit: (payload: Record<string, unknown>) => void;
  isSubmitting: boolean;
  buttonClass: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FamilyData>({
    resolver: zodResolver(familySchema),
  });

  function handle(data: FamilyData) {
    onSubmit({
      role: "family",
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    });
  }

  return (
    <form onSubmit={handleSubmit(handle)} className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-foreground">Always Free</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Family accounts are free forever. You'll join teams and leagues via invite links or registration pages.
        </p>
      </div>

      <FormField label="Full Name" error={errors.fullName?.message}>
        <Input placeholder="Sarah Parent" {...register("fullName")} aria-invalid={!!errors.fullName} />
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="parent@example.com" {...register("email")} aria-invalid={!!errors.email} />
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        <Input type="password" placeholder="Min. 8 characters" {...register("password")} aria-invalid={!!errors.password} />
      </FormField>
      <FormField label="Confirm Password" error={errors.confirmPassword?.message}>
        <Input type="password" placeholder="Repeat your password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
      </FormField>

      <TermsCheckbox register={register} error={errors.acceptTerms?.message} />

      <Button type="submit" className={`w-full gap-2 ${buttonClass}`} size="lg" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : <>Create Family Account <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </form>
  );
}

// ── Shared Components ────────────────────────────────────────────────────────
function FormField({
  label,
  error,
  children,
}: {
  label: string;
  placeholder?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TermsCheckbox({
  register,
  error,
}: {
  register: any;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id="acceptTerms"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
          {...register("acceptTerms")}
        />
        <Label
          htmlFor="acceptTerms"
          className="text-sm font-normal leading-snug text-muted-foreground"
        >
          I agree to the{" "}
          <Link href="#" className="font-medium text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
        </Label>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
