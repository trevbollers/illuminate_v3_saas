"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@goparticipate/ui";

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  sport: z.string().min(1, "Sport is required"),
  divisionKey: z.string().min(1, "Age group / division is required"),
  season: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamSchema>;

const sports = ["7v7 Football", "Basketball"];
const divisionKeys = [
  "Under 8",
  "Under 10",
  "Under 12",
  "Under 14",
  "Under 16",
  "Under 18",
  "AAU 9U",
  "AAU 11U",
  "AAU 13U",
  "AAU 15U",
  "AAU 17U",
  "Recreational",
  "Competitive",
  "Travel",
];

export default function NewTeamPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      sport: "",
      divisionKey: "",
      season: "",
    },
  });

  const onSubmit = async (data: TeamFormValues) => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to create team");
        return;
      }

      const team = await res.json();
      router.push(`/teams/${team._id}`);
    } catch {
      setError("Failed to create team. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Team</h1>
          <p className="text-muted-foreground">
            Add a new team to your organization.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
            <CardDescription>
              Core team information and classification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Team Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., KC Thunder U14 Varsity"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Sport <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(val) => setValue("sport", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {sports.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sport && (
                  <p className="text-xs text-destructive">{errors.sport.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Age Group / Division <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(val) => setValue("divisionKey", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisionKeys.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.divisionKey && (
                  <p className="text-xs text-destructive">{errors.divisionKey.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Season (optional)</Label>
              <Input
                id="season"
                placeholder="e.g., Spring 2026"
                {...register("season")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" asChild>
            <Link href="/teams">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Team
          </Button>
        </div>
      </form>
    </div>
  );
}
