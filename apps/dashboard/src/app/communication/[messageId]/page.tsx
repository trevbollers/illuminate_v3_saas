"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Pin,
  PinOff,
  Bell,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui";

interface MessageDetail {
  _id: string;
  authorId: string;
  authorName: string;
  channel: string;
  subject?: string;
  body: string;
  priority: "normal" | "urgent";
  requiresAck: boolean;
  ackOptions: string[];
  deliveryChannels: string[];
  recipientUserIds: string[];
  pinned: boolean;
  teamName?: string;
  createdAt: string;
}

interface AckEntry {
  _id: string;
  userId: string;
  userName: string;
  response: string;
  respondedAt: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  team: "Team",
  parents: "Parents",
  coaches: "Coaches",
  org: "Org-wide",
};

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messageId = params.messageId as string;

  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [acks, setAcks] = useState<AckEntry[]>([]);
  const [userAck, setUserAck] = useState<AckEntry | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [ackCount, setAckCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);
  const [isAuthorOrAdmin, setIsAuthorOrAdmin] = useState(false);

  const fetchMessage = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${messageId}`);
      if (!res.ok) {
        router.push("/communication");
        return;
      }
      const data = await res.json();
      setMessage(data.message);
      setAcks(data.acks || []);
      setUserAck(data.userAck || null);
      setRecipientCount(data.recipientCount || 0);
      setAckCount(data.ackCount || 0);
      setIsAuthorOrAdmin(!!data.acks);
    } catch {
      router.push("/communication");
    } finally {
      setLoading(false);
    }
  }, [messageId, router]);

  useEffect(() => {
    fetchMessage();
  }, [fetchMessage]);

  async function handleAck(response: string) {
    setAcking(true);
    try {
      const res = await fetch(`/api/messages/${messageId}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserAck(data.ack);
      }
    } catch {
      // Silently fail
    } finally {
      setAcking(false);
    }
  }

  async function handleTogglePin() {
    if (!message) return;
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !message.pinned }),
      });
      if (res.ok) {
        setMessage((prev) => (prev ? { ...prev, pinned: !prev.pinned } : null));
      }
    } catch {
      // Silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!message) return null;

  const isUrgent = message.priority === "urgent";
  const respondedUserIds = new Set(acks.map((a) => a.userId));
  const awaitingCount = recipientCount - ackCount;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/communication">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {CHANNEL_LABELS[message.channel] || message.channel}
            </Badge>
            {isUrgent && (
              <Badge variant="destructive" className="text-xs">
                Urgent
              </Badge>
            )}
            {message.pinned && (
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        {isAuthorOrAdmin && (
          <Button variant="ghost" size="icon" onClick={handleTogglePin}>
            {message.pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Message content */}
      <Card>
        <CardContent className="pt-6">
          {message.subject && (
            <h2 className="text-xl font-bold mb-2">{message.subject}</h2>
          )}

          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {message.authorName}
            </span>
            {message.teamName && (
              <>
                <span>&middot;</span>
                <span>{message.teamName}</span>
              </>
            )}
            <span>&middot;</span>
            <span>
              {new Date(message.createdAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{message.body}</p>
          </div>
        </CardContent>
      </Card>

      {/* Ack section — for recipients */}
      {message.requiresAck && !isAuthorOrAdmin && (
        <Card>
          <CardContent className="pt-6">
            {userAck ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  You responded: {userAck.response}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Please respond:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {message.ackOptions.map((option) => (
                    <Button
                      key={option}
                      variant="outline"
                      className="flex-1 min-h-[44px]"
                      disabled={acking}
                      onClick={() => handleAck(option)}
                    >
                      {acking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ack tracker — for author/admin */}
      {message.requiresAck && isAuthorOrAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Responses</CardTitle>
              <span className="text-sm text-muted-foreground">
                {ackCount}/{recipientCount} acknowledged
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${recipientCount > 0 ? (ackCount / recipientCount) * 100 : 0}%`,
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Responded list */}
            {acks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Responded ({acks.length})
                </h4>
                <div className="space-y-1.5">
                  {acks.map((ack) => (
                    <div
                      key={ack._id}
                      className="flex items-center justify-between text-sm py-1"
                    >
                      <span>{ack.userName}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {ack.response}
                        </Badge>
                        <span className="text-xs">
                          {new Date(ack.respondedAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting */}
            {awaitingCount > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Awaiting ({awaitingCount})
                </h4>
                <p className="text-sm text-muted-foreground">
                  {awaitingCount} recipient{awaitingCount !== 1 ? "s" : ""}{" "}
                  haven't responded yet.
                </p>
                {/* TODO: Send Reminder button — trigger re-send email/SMS to non-responders */}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
