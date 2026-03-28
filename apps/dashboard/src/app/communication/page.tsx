"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus, Loader2, Inbox } from "lucide-react";
import { Button } from "@goparticipate/ui";
import { MessageCard } from "@/components/message-card";

type TabKey = "all" | "team" | "parents" | "coaches" | "org" | "announcements";

interface Tab {
  key: TabKey;
  label: string;
  count: number;
}

interface MessageItem {
  _id: string;
  authorName: string;
  channel: string;
  subject?: string;
  body: string;
  priority: "normal" | "urgent";
  requiresAck: boolean;
  ackCount?: number;
  recipientCount?: number;
  isRead: boolean;
  createdAt: string;
  teamId?: string;
}

interface AnnouncementItem {
  _id: string;
  title: string;
  body: string;
  authorName: string;
  priority: "normal" | "urgent";
  leagueName: string;
  leagueSlug: string;
  isRead: boolean;
  createdAt: string;
}

export default function CommunicationPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const tabs: Tab[] = [
    { key: "all", label: "All", count: unreadCounts.all || 0 },
    { key: "team", label: "Team", count: unreadCounts.team || 0 },
    { key: "parents", label: "Parents", count: unreadCounts.parents || 0 },
    { key: "coaches", label: "Coaches", count: unreadCounts.coaches || 0 },
    { key: "org", label: "Org", count: unreadCounts.org || 0 },
    {
      key: "announcements",
      label: "Announcements",
      count: 0,
    },
  ];

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data);
      }
    } catch {
      // Silently fail — counts are non-critical
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (activeTab !== "all" && activeTab !== "announcements") {
        params.set("channel", activeTab);
      }

      const res = await fetch(`/api/messages?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      // Error handled by empty state
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch {
      // Error handled by empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCounts();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCounts, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "announcements") {
      fetchAnnouncements();
    } else {
      fetchMessages();
    }
  }, [activeTab, page, fetchMessages, fetchAnnouncements]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Communication</h1>
        <Link href="/communication/new">
          <Button size="sm">
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">New Message</span>
          </Button>
        </Link>
      </div>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 min-w-max border-b pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary -mb-[1px]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-medium text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === "announcements" ? (
        announcements.length === 0 ? (
          <EmptyState message="No announcements yet" />
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <Link
                key={a._id}
                href={`/communication/announcement/${a._id}?leagueSlug=${a.leagueSlug}`}
                className="block"
              >
                <div
                  className={`rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                    a.priority === "urgent"
                      ? "border-l-4 border-l-red-500"
                      : ""
                  } ${!a.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                      {a.leagueName}
                    </span>
                    {a.priority === "urgent" && (
                      <span className="text-xs font-medium text-red-500">
                        Urgent
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {a.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : messages.length === 0 ? (
        <EmptyState
          message={
            activeTab === "all"
              ? "No messages yet. Send your first message!"
              : `No ${activeTab} messages`
          }
        />
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <MessageCard
              key={m._id}
              id={m._id}
              authorName={m.authorName}
              channel={m.channel}
              subject={m.subject}
              body={m.body}
              priority={m.priority}
              requiresAck={m.requiresAck}
              ackCount={m.ackCount}
              recipientCount={m.recipientCount}
              isRead={m.isRead}
              createdAt={m.createdAt}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Mobile floating compose button */}
      <Link
        href="/communication/new"
        className="fixed bottom-6 right-6 sm:hidden z-50"
      >
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors">
          <MessageSquarePlus className="h-6 w-6" />
        </button>
      </Link>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Inbox className="h-12 w-12 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
