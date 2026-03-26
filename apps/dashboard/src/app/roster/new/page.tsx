"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
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
  Separator,
} from "@goparticipate/ui";

const playerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  number: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  teamId: z.string().min(1, "Team is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianEmail: z.string().email("Valid email is required"),
  guardianPhone: z.string().min(1, "Guardian phone is required"),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  medicalNotes: z.string().optional(),
});

type PlayerFormValues = z.infer<typeof playerSchema>;

const positions = ["QB", "WR", "RB", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"];
const teams = [
  { id: "team-1", name: "U14 Varsity" },
  { id: "team-2", name: "U12 Junior" },
];

export default function NewPlayerPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      number: "",
      position: "",
      teamId: "",
      dateOfBirth: "",
      guardianName: "",
      guardianEmail: "",
      guardianPhone: "",
      emergencyContact: "",
      emergencyPhone: "",
      medicalNotes: "",
    },
  });

  const onSubmit = (data: PlayerFormValues) => {
    console.log("Player data:", data);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/roster">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Player</h1>
          <p className="text-muted-foreground">
            Add a new player to your roster.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Player Info */}
        <Card>
          <CardHeader>
            <CardTitle>Player Information</CardTitle>
            <CardDescription>
              Basic player details and team assignment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="e.g., Marcus"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g., Johnson"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="number">Jersey Number</Label>
                <Input
                  id="number"
                  placeholder="e.g., 7"
                  {...register("number")}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Position <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(val) => setValue("position", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.position && (
                  <p className="text-xs text-destructive">
                    {errors.position.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Team <span className="text-destructive">*</span>
                </Label>
                <Select onValueChange={(val) => setValue("teamId", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teamId && (
                  <p className="text-xs text-destructive">
                    {errors.teamId.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register("dateOfBirth")}
              />
              {errors.dateOfBirth && (
                <p className="text-xs text-destructive">
                  {errors.dateOfBirth.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Guardian / Parent Info */}
        <Card>
          <CardHeader>
            <CardTitle>Guardian Information</CardTitle>
            <CardDescription>
              Primary parent or guardian contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guardianName">
                Guardian Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guardianName"
                placeholder="e.g., Sandra Johnson"
                {...register("guardianName")}
              />
              {errors.guardianName && (
                <p className="text-xs text-destructive">
                  {errors.guardianName.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianEmail">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guardianEmail"
                  type="email"
                  placeholder="parent@email.com"
                  {...register("guardianEmail")}
                />
                {errors.guardianEmail && (
                  <p className="text-xs text-destructive">
                    {errors.guardianEmail.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="guardianPhone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  {...register("guardianPhone")}
                />
                {errors.guardianPhone && (
                  <p className="text-xs text-destructive">
                    {errors.guardianPhone.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  placeholder="Name (optional)"
                  {...register("emergencyContact")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  {...register("emergencyPhone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Notes</CardTitle>
            <CardDescription>
              Any relevant medical information, allergies, or conditions coaches should know about.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g., Asthma — carries inhaler. No known allergies."
              {...register("medicalNotes")}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" asChild>
            <Link href="/roster">Cancel</Link>
          </Button>
          <Button type="submit">Add Player</Button>
        </div>
      </form>
    </div>
  );
}
