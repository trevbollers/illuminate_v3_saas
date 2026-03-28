"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@goparticipate/ui/src/components/button";
import { Badge } from "@goparticipate/ui/src/components/badge";

interface Announcement {
  _id: string;
  title: string;
  body: string;
  authorName: string;
  priority: "normal" | "urgent";
  targetType: "all_registered" | "event" | "division";
  readByOrgAdmins: string[];
  createdAt: string;
}

const TARGET_LABELS: Record<string, string> = {
  all_registered: "All Orgs",
  event: "Event",
  division: "Division",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Send announcements to registered organization admins
          </p>
        </div>
        <Link href="/announcements/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Megaphone className="h-12 w-12 mb-3" />
          <p className="text-sm">No announcements yet</p>
          <Link href="/announcements/new" className="mt-3">
            <Button variant="outline" size="sm">
              Create your first announcement
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a._id}
              className={`rounded-lg border p-4 ${
                a.priority === "urgent" ? "border-l-4 border-l-red-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {TARGET_LABELS[a.targetType] || a.targetType}
                    </Badge>
                    {a.priority === "urgent" && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {a.body}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>By {a.authorName}</span>
                    <span>
                      {new Date(a.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>
                      {a.readByOrgAdmins?.length || 0} read
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a._id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
