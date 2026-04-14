"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Upload,
  Loader2,
  CheckCircle2,
  Video,
  X as XIcon,
} from "lucide-react";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  currentPhotoUrl?: string;
  sizing?: { top?: string; bottom?: string; shoe?: string; headgear?: string };
}

export default function EditPlayerPage() {
  const router = useRouter();
  const { playerId } = useParams<{ playerId: string }>();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [sizingTop, setSizingTop] = useState("");
  const [sizingBottom, setSizingBottom] = useState("");
  const [sizingShoe, setSizingShoe] = useState("");

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the player
  useEffect(() => {
    if (!playerId) return;
    fetch(`/api/family/players/${playerId}`)
      .then((r) => {
        if (r.status === 401) { router.push("/auth/login?callbackUrl=/family"); return null; }
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d?.player) return;
        const p = d.player as Player;
        setFirstName(p.firstName || "");
        setLastName(p.lastName || "");
        setDob(p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : "");
        setGender(p.gender || "male");
        setSizingTop(p.sizing?.top || "");
        setSizingBottom(p.sizing?.bottom || "");
        setSizingShoe(p.sizing?.shoe || "");
        setPhotoPreview(p.currentPhotoUrl || null);
      })
      .finally(() => setLoading(false));
  }, [playerId, router]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }
    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleCapturedPhoto(file: File, dataUrl: string) {
    setPhotoFile(file);
    setPhotoPreview(dataUrl);
    setCameraOpen(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // 1. PATCH profile fields
      const patchRes = await fetch(`/api/family/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob ? new Date(dob) : undefined,
          gender,
          sizing: {
            top: sizingTop.trim() || undefined,
            bottom: sizingBottom.trim() || undefined,
            shoe: sizingShoe.trim() || undefined,
          },
        }),
      });
      if (!patchRes.ok) {
        const body = await patchRes.json().catch(() => null);
        throw new Error(body?.error || "Failed to save profile");
      }

      // 2. Upload photo if one was selected
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        const photoRes = await fetch(`/api/family/players/${playerId}/photo`, {
          method: "POST",
          body: fd,
        });
        if (!photoRes.ok) {
          const body = await photoRes.json().catch(() => null);
          throw new Error(body?.error || "Failed to upload photo");
        }
      }

      router.push("/family");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-600">Player not found.</p>
        <Link href="/family" className="text-amber-600 hover:underline mt-4 inline-block">
          Back to Family
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/family"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Family
      </Link>

      <h1 className="text-2xl font-bold mb-2">
        Edit {firstName || "Player"}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Update profile details, sizing, and photo.
      </p>

      {/* Photo section */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Photo</h2>

        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Preview */}
          <div className="shrink-0">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Player"
                className="h-40 w-40 rounded-lg object-cover border"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-gray-100 border">
                <Camera className="h-10 w-10 text-gray-300" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-1 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Upload from file
            </button>
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto sm:ml-2"
            >
              <Video className="h-4 w-4" />
              Use webcam
            </button>
            {photoFile && (
              <p className="text-xs text-green-700 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                New photo staged — click Save to apply.
              </p>
            )}
            <p className="text-xs text-gray-500">
              JPEG, PNG, WebP, or GIF. Max 10 MB. Auto-converts to WebP.
            </p>
          </div>
        </div>
      </section>

      {/* Profile section */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </section>

      {/* Sizing section */}
      <section className="mb-8 rounded-lg border bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Sizing</h2>
        <p className="text-xs text-gray-500 mb-4">
          Optional — used for uniform orders and team gear.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Top</label>
            <input
              value={sizingTop}
              onChange={(e) => setSizingTop(e.target.value)}
              placeholder="e.g. YM, AL"
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bottom</label>
            <input
              value={sizingBottom}
              onChange={(e) => setSizingBottom(e.target.value)}
              placeholder="e.g. YM, AL"
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shoe</label>
            <input
              value={sizingShoe}
              onChange={(e) => setSizingShoe(e.target.value)}
              placeholder="e.g. 8.5"
              className="w-full h-10 rounded-md border px-3 text-sm"
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href="/family"
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || !firstName.trim() || !lastName.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {cameraOpen && (
        <WebcamCapture
          onCapture={handleCapturedPhoto}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Webcam Capture ──────────────────────────────────────────────────────────
// Full-screen overlay (not a modal in the form sense — it's a native-style
// camera-viewer UI that takes over the viewport while the user composes the
// shot). Launches via getUserMedia, previews captured frame, lets the user
// re-take or accept.

function WebcamCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File, dataUrl: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser doesn't support webcam access.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 960, facingMode: "user" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch((err) => {
        setError(
          err?.name === "NotAllowedError"
            ? "Camera permission denied. Enable it in your browser settings and try again."
            : "Could not access webcam.",
        );
      });

    return stopStream;
  }, [stopStream]);

  function snap() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(dataUrl);
  }

  function retake() {
    setCaptured(null);
  }

  function accept() {
    if (!captured) return;
    // Convert data URL → File for upload
    const byteString = atob(captured.split(",")[1]!);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const file = new File([blob], `player-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopStream();
    onCapture(file, captured);
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
        <h2 className="text-sm font-semibold">
          {captured ? "Review photo" : "Take photo"}
        </h2>
        <button
          onClick={handleClose}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Close"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="max-w-md px-6 text-center">
            <p className="text-white text-sm">{error}</p>
            <button
              onClick={handleClose}
              className="mt-4 rounded-md border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>
        ) : captured ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captured} alt="Captured" className="max-h-full max-w-full object-contain" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      {/* Controls */}
      {!error && (
        <div className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
          {captured ? (
            <>
              <button
                onClick={retake}
                className="rounded-md border border-white/30 px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Retake
              </button>
              <button
                onClick={accept}
                className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Use this photo
              </button>
            </>
          ) : (
            <button
              onClick={snap}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
            >
              <Camera className="h-5 w-5" />
              {ready ? "Capture" : "Starting camera..."}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
