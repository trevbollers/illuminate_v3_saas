"use client";

import { useState, useEffect } from "react";
import { Button } from "@goparticipate/ui";
import { Loader2, Save, User, Bell, Lock } from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  notificationPreferences: {
    emailMessages: boolean;
    smsUrgent: boolean;
    emailAnnouncements: boolean;
  };
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const res = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        notificationPreferences: profile.notificationPreferences,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = await res.json();
      setPasswordError(data.error || "Failed to change password");
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Unable to load profile
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, notifications, and security.
        </p>
      </div>

      {/* Profile */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
              value={profile.email}
              disabled
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Phone</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={profile.phone || ""}
              placeholder="(555) 123-4567"
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>

        <div className="space-y-3">
          {[
            { key: "emailMessages" as const, label: "Email me team messages" },
            { key: "smsUrgent" as const, label: "SMS for urgent messages" },
            { key: "emailAnnouncements" as const, label: "Email me league announcements" },
          ].map((pref) => (
            <label key={pref.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.notificationPreferences[pref.key]}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    notificationPreferences: {
                      ...profile.notificationPreferences,
                      [pref.key]: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">{pref.label}</span>
            </label>
          ))}
        </div>
      </section>

      <Button onClick={saveProfile} disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saved ? "Saved!" : "Save Changes"}
      </Button>

      {/* Password */}
      <section className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Change Password</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Current Password</label>
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>

        {passwordError && (
          <p className="text-sm text-destructive">{passwordError}</p>
        )}
        {passwordSuccess && (
          <p className="text-sm text-green-600">Password changed successfully</p>
        )}

        <Button variant="outline" onClick={changePassword} disabled={changingPassword}>
          {changingPassword ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Change Password
        </Button>
      </section>
    </div>
  );
}
