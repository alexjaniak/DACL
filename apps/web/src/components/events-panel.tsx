"use client";

import { useState, useEffect, useCallback } from "react";

interface GitHubEvent {
  action?: string;
  issue?: { title: string; number: number; html_url: string };
  pull_request?: { title: string; number: number; html_url: string };
  comment?: { body: string; user: { login: string } };
  sender?: { login: string; avatar_url: string };
  repository?: { full_name: string };
  [key: string]: unknown;
}

interface EventsResponse {
  events: GitHubEvent[];
  offset: number;
  total: number;
}

function getEventType(event: GitHubEvent): "issue" | "pr" | "comment" | "other" {
  if (event.comment) return "comment";
  if (event.pull_request) return "pr";
  if (event.issue) return "issue";
  return "other";
}

function getAccentClass(type: "issue" | "pr" | "comment" | "other"): string {
  switch (type) {
    case "issue":
      return "bg-accent-green";
    case "pr":
      return "bg-accent-blue";
    case "comment":
      return "bg-accent-yellow";
    default:
      return "bg-accent-cyan";
  }
}

function getSummary(event: GitHubEvent): string {
  const sender = event.sender?.login ?? "unknown";
  const action = event.action ?? "triggered";

  if (event.comment) {
    const target = event.issue
      ? `#${event.issue.number}`
      : event.pull_request
        ? `#${event.pull_request.number}`
        : "unknown";
    return `${sender} commented on ${target}`;
  }
  if (event.pull_request) {
    return `${sender} ${action} PR #${event.pull_request.number}`;
  }
  if (event.issue) {
    return `${sender} ${action} #${event.issue.number}`;
  }
  return `${sender} ${action} event`;
}

function getBodyPreview(event: GitHubEvent): string | null {
  if (!event.comment?.body) return null;
  const body = event.comment.body.replace(/\n/g, " ").trim();
  return body.length > 80 ? body.slice(0, 77) + "..." : body;
}

function getTimestamp(event: GitHubEvent): string | null {
  const raw =
    (event.comment as Record<string, unknown>)?.created_at ??
    (event.issue as Record<string, unknown>)?.updated_at ??
    (event.pull_request as Record<string, unknown>)?.updated_at;
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  if (isNaN(date.getTime())) return null;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function EventCard({ event }: { event: GitHubEvent }) {
  const type = getEventType(event);
  const accent = getAccentClass(type);
  const summary = getSummary(event);
  const preview = getBodyPreview(event);
  const timestamp = getTimestamp(event);

  return (
    <div className="bg-background rounded p-2 flex gap-2 items-start">
      <div className={`w-1 shrink-0 self-stretch rounded-full ${accent}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-text-bright text-sm truncate">{summary}</p>
          {timestamp && (
            <span className="text-muted-foreground text-xs font-mono shrink-0">
              {timestamp}
            </span>
          )}
        </div>
        {preview && (
          <p className="text-text text-xs mt-0.5 truncate">{preview}</p>
        )}
      </div>
    </div>
  );
}

export function EventsPanel() {
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async (offset: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?offset=${offset}`);
      if (!res.ok) return;
      const data: EventsResponse = await res.json();
      setEvents((prev) => (append ? [...prev, ...data.events] : data.events));
      setNextOffset(data.offset);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchEvents(0, false);
    const interval = setInterval(() => fetchEvents(0, false), 10_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const hasMore = nextOffset < total;

  return (
    <div className="h-full bg-surface p-4 overflow-y-auto flex flex-col">
      <h2 className="text-text-bright font-semibold text-sm uppercase tracking-wide mb-4">
        Events
      </h2>
      {events.length === 0 && !loading ? (
        <p className="text-muted-foreground text-sm">No events yet</p>
      ) : (
        <div className="flex flex-col gap-1 flex-1 min-h-0">
          {events.map((event, i) => (
            <EventCard key={`${i}-${nextOffset}`} event={event} />
          ))}
          {hasMore && (
            <button
              onClick={() => fetchEvents(nextOffset, true)}
              disabled={loading}
              className="text-sm text-accent-blue hover:text-text-bright mt-2 self-center disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
