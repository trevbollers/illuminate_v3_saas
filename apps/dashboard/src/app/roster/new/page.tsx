"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Separator,
} from "@goparticipate/ui";

interface TeamOption {
  _id: string;
  name: string;
  sport: string;
  divisionKey: string;
}

const FOOTBALL_POSITIONS = ["QB", "WR", "RB", "Center", "Safety", "Corner", "Linebacker", "Rusher"];
const BASKETBALL_POSITIONS = ["PG", "SG", "SF", "PF", "C"];

export default function NewPlayerPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [teamId, setTeamId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTeams(
          (data || []).map((t: any) => ({
            _id: t._id,
            name: t.name,
            sport: t.sport,
            divisionKey: t.divisionKey,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingTeams(false));
  }, []);

  const selectedTeam = teams.find((t) => t._id === teamId);
  const sportPositions =
    selectedTeam?.sport?.toLowerCase().includes("basketball")
      ? BASKETBALL_POSITIONS
      : FOOTBALL_POSITIONS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !dateOfBirth) {
      setError("First name, last name, and date of birth are required.");
      return;
    }

    setSaving(true);

    try {
      // Create the player in the platform DB
      const emergencyContacts = [];
      if (emergencyName.trim() && emergencyPhone.trim()) {
        emergencyContacts.push({
          name: emergencyName.trim(),
          relationship: emergencyRelationship.trim() || "Guardian",
          phone: emergencyPhone.trim(),
        });
      }

      const medical: any = {};
      if (medicalNotes.trim()) medical.notes = medicalNotes.trim();

      const playerRes = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth,
          gender: gender || undefined,
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
          position: position || undefined,
          teamId: teamId || undefined,
          guardianName: guardianName.trim() || undefined,
          guardianEmail: guardianEmail.trim() || undefined,
          guardianPhone: guardianPhone.trim() || undefined,
          emergencyContacts,
          medical: Object.keys(medical).length > 0 ? medical : undefined,
        }),
      });

      if (!playerRes.ok) {
        const data = await playerRes.json();
        setError(data.error || "Failed to create player.");
        setSaving(false);
        return;
      }

      const player = await playerRes.json();

      // If a team was selected, add to that team's roster
      if (teamId && player._id) {
        const rosterRes = await fetch(`/api/teams/${teamId}/roster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: player._id,
            playerName: `${player.firstName} ${player.lastName}`,
            jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : undefined,
            position: position || undefined,
          }),
        });

        if (!rosterRes.ok) {
          // Player created but roster add failed — still redirect
          const data = await rosterRes.json();
          console.warn("Roster add failed:", data.error);
        }
      }

      // Redirect based on context
      if (teamId) {
        router.push(`/teams/${teamId}`);
      } else {
        router.push("/roster");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

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
            Create a new player profile and optionally assign to a team.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="e.g., Johnson"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jerseyNumber">Jersey Number</Label>
                <Input
                  id="jerseyNumber"
                  placeholder="e.g., 7"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Team</Label>
                {loadingTeams ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading teams...
                  </div>
                ) : (
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {sportPositions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Label htmlFor="guardianName">Guardian Name</Label>
              <Input
                id="guardianName"
                placeholder="e.g., Sandra Johnson"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianEmail">Email</Label>
                <Input
                  id="guardianEmail"
                  type="email"
                  placeholder="parent@email.com"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">Phone</Label>
                <Input
                  id="guardianPhone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <p className="text-sm font-medium">Emergency Contact</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Name</Label>
                <Input
                  id="emergencyName"
                  placeholder="Contact name"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  placeholder="e.g., Grandmother"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
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
              Critical info only — allergies, inhalers, EpiPens, etc. Visible to coaching staff on game day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              id="medicalNotes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g., Peanut allergy — carries EpiPen. Asthma — has inhaler in bag."
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-8">
          <Button type="button" variant="outline" asChild>
            <Link href="/roster">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Player
          </Button>
        </div>
      </form>
    </div>
  );
}
