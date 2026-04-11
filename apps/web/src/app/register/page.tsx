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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { ArrowRight, Loader2 } from "lucide-react";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    businessName: z.string().min(2, "Business name must be at least 2 characters"),
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [validPlans, setValidPlans] = useState<string[]>([]);
  const [planLabel, setPlanLabel] = useState<string>("");

  // Load valid plans from the API
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data: { planId: string; name: string; pricing: { monthly: number } }[]) => {
        const ids = data.map((p) => p.planId);
        setValidPlans(ids);
        const match = data.find((p) => p.planId === selectedPlan);
        if (match) {
          setPlanLabel(
            match.pricing.monthly === 0 ? `${match.name} (Free)` : match.name
          );
        }
      });
  }, [selectedPlan]);

  // Redirect to pricing if plans loaded and selected plan is invalid
  useEffect(() => {
    if (validPlans.length > 0 && selectedPlan && !validPlans.includes(selectedPlan)) {
      router.replace("/pricing");
    }
  }, [validPlans, selectedPlan, router]);

  // Don't render the form until plans are loaded and plan is validated
  if (!selectedPlan || (validPlans.length > 0 && !validPlans.includes(selectedPlan))) {
    return null;
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      businessName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormData) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          businessName: data.businessName,
          email: data.email,
          password: data.password,
          plan: selectedPlan,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Registration failed. Please try again.");
      }

      const { checkoutUrl } = await res.json();
      if (checkoutUrl) {
        router.push(checkoutUrl);
      } else {
        router.push("/auth/verify-email?email=" + encodeURIComponent(data.email));
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">I</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Go Participate
            </span>
          </Link>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Get started with the{" "}
              <span className="font-semibold text-primary">
                {planLabel || selectedPlan}
              </span>{" "}
              plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  {...register("fullName")}
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Doe's Premium Meats"
                  {...register("businessName")}
                  aria-invalid={!!errors.businessName}
                />
                {errors.businessName && (
                  <p className="text-xs text-destructive">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  {...register("confirmPassword")}
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

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
                  <Link
                    href="#"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="#"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.acceptTerms && (
                <p className="text-xs text-destructive">
                  {errors.acceptTerms.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
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
