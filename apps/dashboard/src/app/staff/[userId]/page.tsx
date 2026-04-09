"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Loader2,
  Camera,
  Save,
  Shield,
  Mail,
  Phone,
  Award,
  QrCode,
  Printer,
  Instagram,
  Twitter,
} from "lucide-react";

interface CoachProfile {
  _id: string;
  userId: string;
  name: string;
  photoUrl?: string;
  bio?: string;
  role: string;
  teamIds: string[];
  teams?: { _id: string; name: string; sport: string }[];
  email?: string;
  phone?: string;
  socials: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    facebook?: string;
    linkedin?: string;
  };
  certifications?: string[];
  yearsExperience?: number;
  badges: {
    label: string;
    icon?: string;
    awardedAt: string;
    description?: string;
  }[];
  checkInCode: string;
}

const ROLE_LABELS: Record<string, string> = {
  head_coach: "HEAD COACH",
  assistant_coach: "ASSISTANT COACH",
  team_manager: "TEAM MANAGER",
};

const ROLE_COLORS: Record<string, string> = {
  head_coach: "bg-blue-700",
  assistant_coach: "bg-blue-600",
  team_manager: "bg-purple-700",
};

export default function CoachProfilePage() {
  const { userId } = useParams<{ userId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Edit form
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [certs, setCerts] = useState("");
  const [years, setYears] = useState("");

  useEffect(() => {
    fetch(`/api/staff/profile?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.exists && data.profile) {
          setProfile(data.profile);
          populateForm(data.profile);
        } else {
          setEditing(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  function populateForm(p: CoachProfile) {
    setName(p.name || "");
    setBio(p.bio || "");
    setEmail(p.email || "");
    setPhone(p.phone || "");
    setInstagram(p.socials?.instagram || "");
    setTwitter(p.socials?.twitter || "");
    setTiktok(p.socials?.tiktok || "");
    setCerts((p.certifications || []).join(", "));
    setYears(p.yearsExperience?.toString() || "");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/staff/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          email,
          phone,
          socials: { instagram, twitter, tiktok },
          certifications: certs.split(",").map((c) => c.trim()).filter(Boolean),
          yearsExperience: parseInt(years) || undefined,
        }),
      });
      const data = await res.json();
      setProfile(data);
      setEditing(false);
    } catch {}
    setSaving(false);
  }

  function handlePrint() {
    const card = cardRef.current;
    if (!card) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>Coach Credential Card</title>
        <style>
          body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; }
          .card { width: 350px; }
          @media print { body { background: white; } }
        </style>
        </head>
        <body><div class="card">${card.outerHTML}</div></body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Coach Profile</h1>
        <div className="flex gap-2">
          {profile && !editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Edit Profile
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" /> Print Card
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Credential Card */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Credential Card
          </h2>
          <div
            ref={cardRef}
            className="w-full max-w-[350px] rounded-2xl overflow-hidden shadow-xl border border-slate-200"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {/* Card header */}
            <div className={`${ROLE_COLORS[profile?.role || "head_coach"]} px-5 py-4 text-white`}>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">
                Go Participate
              </p>
              <p className="text-lg font-bold mt-0.5">
                {ROLE_LABELS[profile?.role || "head_coach"] || "COACH"}
              </p>
            </div>

            {/* Card body */}
            <div className="bg-white p-5">
              <div className="flex gap-4">
                {/* Photo */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                  {profile?.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-8 w-8 text-slate-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">
                    {profile?.name || name || "Coach Name"}
                  </h3>
                  {profile?.teams && profile.teams.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.teams.map((t) => (
                        <span
                          key={t._id}
                          className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                {(profile?.email || email) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-slate-400" />
                    {profile?.email || email}
                  </div>
                )}
                {(profile?.phone || phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {profile?.phone || phone}
                  </div>
                )}
                {profile?.socials?.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-3 w-3 text-slate-400" />
                    @{profile.socials.instagram}
                  </div>
                )}
                {profile?.socials?.twitter && (
                  <div className="flex items-center gap-2">
                    <Twitter className="h-3 w-3 text-slate-400" />
                    @{profile.socials.twitter}
                  </div>
                )}
              </div>

              {/* Badges */}
              {profile?.badges && profile.badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.badges.map((b, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                    >
                      <Award className="h-3 w-3" />
                      {b.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {profile?.certifications && profile.certifications.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {profile.certifications.map((c, i) => (
                    <span
                      key={i}
                      className="rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-medium text-green-700 border border-green-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* QR Code footer */}
            <div className="border-t bg-slate-50 px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                  Check-in Code
                </p>
                <p className="text-sm font-mono font-bold text-slate-700 mt-0.5">
                  {profile?.checkInCode || "---"}
                </p>
              </div>
              {/* QR placeholder — in production use a QR library */}
              <div className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-slate-300 bg-white">
                <QrCode className="h-8 w-8 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form / Bio */}
        <div>
          {editing ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold">Edit Profile</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                    placeholder="A few words about yourself and your coaching experience..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 pt-2">Socials</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500">Instagram</label>
                    <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="handle"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Twitter / X</label>
                    <input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="handle"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">TikTok</label>
                    <input type="text" value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="handle"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 pt-2">Credentials</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500">Certifications</label>
                    <input type="text" value={certs} onChange={(e) => setCerts(e.target.value)} placeholder="CPR, First Aid, USSSA"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Years Experience</label>
                    <input type="number" value={years} onChange={(e) => setYears(e.target.value)} min="0"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {profile && (
                  <button onClick={() => setEditing(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Cancel
                  </button>
                )}
                <button onClick={handleSave} disabled={saving || !name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Profile
                </button>
              </div>
            </div>
          ) : profile?.bio ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{profile.bio}</p>
              {profile.yearsExperience && (
                <p className="mt-3 text-xs text-slate-400">
                  {profile.yearsExperience} years coaching experience
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
