"use client";

import Link from "next/link";
import { Badge } from "@goparticipate/ui";

interface MessageCardProps {
  id: string;
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
  teamName?: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  team: "bg-green-500",
  parents: "bg-blue-500",
  coaches: "bg-orange-500",
  org: "bg-purple-500",
};

const CHANNEL_LABELS: Record<string, string> = {
  team: "Team",
  parents: "Parents",
  coaches: "Coaches",
  org: "Org-wide",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function MessageCard({
  id,
  authorName,
  channel,
  subject,
  body,
  priority,
  requiresAck,
  ackCount,
  recipientCount,
  isRead,
  createdAt,
  teamName,
}: MessageCardProps) {
  const isUrgent = priority === "urgent";
  const channelColor = CHANNEL_COLORS[channel] || "bg-gray-500";

  return (
    <Link href={`/communication/${id}`} className="block">
      <div
        className={`relative flex gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
          isUrgent ? "border-l-4 border-l-red-500" : ""
        } ${!isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
      >
        {/* Unread dot */}
        {!isRead && (
          <div className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500" />
        )}

        {/* Channel color bar */}
        <div
          className={`hidden sm:block w-1 rounded-full flex-shrink-0 ${channelColor}`}
        />

        <div className="flex-1 min-w-0">
          {/* Top row: author + meta */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {authorName}
            </span>
            <Badge
              variant="secondary"
              className="text-xs px-1.5 py-0 flex-shrink-0"
            >
              {CHANNEL_LABELS[channel] || channel}
            </Badge>
            {isUrgent && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                Urgent
              </Badge>
            )}
            {teamName && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                {teamName}
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
              {timeAgo(createdAt)}
            </span>
          </div>

          {/* Subject */}
          {subject && (
            <p className="text-sm font-medium truncate mb-0.5">{subject}</p>
          )}

          {/* Body preview */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {body}
          </p>

          {/* Ack indicator */}
          {requiresAck && ackCount !== undefined && recipientCount !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${recipientCount > 0 ? (ackCount / recipientCount) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {ackCount}/{recipientCount} responded
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
