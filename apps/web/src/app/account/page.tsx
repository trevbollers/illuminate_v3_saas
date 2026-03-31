"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  ArrowLeft,
  Loader2,
  Check,
  Bell,
} from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Input } from "@goparticipate/ui/src/components/input";
import { Label } from "@goparticipate/ui/src/components/label";
import { Separator } from "@goparticipate/ui/src/components/separator";
import { Badge } from "@goparticipate/ui/src/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { Switch } from "@goparticipate/ui/src/components/switch";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  image?: string;
  emailVerified?: string;
  notificationPreferences: {
    emailMessages: boolean;
    smsUrgent: boolean;
    emailAnnouncements: boolean;
  };
  memberships: {
    tenantId: string;
    tenantName: string;
    tenantType: string;
    role: string;
  }[];
  createdAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailMessages, setEmailMessages] = useState(true);
  const [smsUrgent, setSmsUrgent] = useState(false);
  const [emailAnnouncements, setEmailAnnouncements] = useState(true);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => {
        if (r.status === 401) {
          router.push("/auth/login?callbackUrl=/account");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmailMessages(data.notificationPreferences?.emailMessages ?? true);
        setSmsUrgent(data.notificationPreferences?.smsUrgent ?? false);
        setEmailAnnouncements(
          data.notificationPreferences?.emailAnnouncements ?? true,
        );
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          notificationPreferences: {
            emailMessages,
            smsUrgent,
            emailAnnouncements,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                {profile.emailVerified ? (
                  <Badge variant="default" className="shrink-0">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    Unverified
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Messages</p>
                <p className="text-xs text-muted-foreground">
                  Receive team messages and updates via email
                </p>
              </div>
              <Switch
                checked={emailMessages}
                onCheckedChange={setEmailMessages}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Announcements</p>
                <p className="text-xs text-muted-foreground">
                  Receive league and org announcements via email
                </p>
              </div>
              <Switch
                checked={emailAnnouncements}
                onCheckedChange={setEmailAnnouncements}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS for Urgent Messages</p>
                <p className="text-xs text-muted-foreground">
                  Get text messages for time-sensitive updates (opt-in)
                </p>
              </div>
              <Switch checked={smsUrgent} onCheckedChange={setSmsUrgent} />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saved ? "Saved!" : "Save Preferences"}
            </Button>
          </CardFooter>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              Password
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button
                variant="outline"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
                {passwordSaved && (
                  <p className="text-sm text-green-600">
                    Password changed successfully!
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={passwordSaving}
                    className="gap-2"
                  >
                    {passwordSaving && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Update Password
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memberships */}
        {profile.memberships.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Your Organizations
              </CardTitle>
              <CardDescription>
                Teams and leagues you belong to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.memberships.map((m) => {
                  const appUrl =
                    m.tenantType === "league"
                      ? process.env.NEXT_PUBLIC_LEAGUE_URL || "http://localhost:4002"
                      : process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:4003";

                  return (
                    <div
                      key={m.tenantId}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{m.tenantName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {m.tenantType} · {m.role.replace(/_/g, " ")}
                        </p>
                      </div>
                      <a
                        href={appUrl}
                        className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90"
                      >
                        Open {m.tenantType === "league" ? "League" : "Dashboard"}
                      </a>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
