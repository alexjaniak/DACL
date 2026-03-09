'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogChunk } from '@/lib/types';
import { LogMarkdown } from './log-markdown';

const RUN_HEADER_RE = /^=== RUN (.+) ===$/;

function formatTimestamp(raw: string): string {
  try {
    const date = new Date(raw.trim());
    if (isNaN(date.getTime())) return raw;
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return raw;
  }
}

interface RunGroup {
  timestamp: string;
  lines: string[];
}

function groupIntoParagraphs(lines: string[]): string[][] {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line === '') {
      if (current.length > 0) {
        paragraphs.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    paragraphs.push(current);
  }
  return paragraphs;
}

function groupByRuns(lines: string[]): RunGroup[] {
  const groups: RunGroup[] = [];
  let current: RunGroup | null = null;

  for (const line of lines) {
    const match = line.match(RUN_HEADER_RE);
    if (match) {
      current = { timestamp: match[1], lines: [] };
      groups.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      if (groups.length === 0 || groups[0].timestamp !== '') {
        groups.unshift({ timestamp: '', lines: [] });
      }
      groups[0].lines.push(line);
    }
  }

  return groups;
}

export function LogViewer({ agentId, colorClass }: { agentId: string; colorClass?: string }) {
  const [log, setLog] = useState<LogChunk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    let active = true;

    async function fetchLogs() {
      try {
        const res = await fetch(`/api/logs/${encodeURIComponent(agentId)}?lines=200`);
        if (!active) return;
        if (!res.ok) {
          setError(res.status === 404 ? 'Agent not found' : 'Failed to load logs');
          setLoading(false);
          return;
        }
        const data: LogChunk = await res.json();
        setLog(data);
        setError(null);
      } catch {
        if (active) setError('Failed to load logs');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [agentId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      isAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (log && isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        Loading logs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!log || log.lines.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        No logs available
      </div>
    );
  }

  const groups = groupByRuns(log.lines);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg bg-zinc-950/80 font-mono text-[13px] leading-relaxed text-zinc-300"
      >
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.timestamp && (
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/95 px-4 py-2 text-xs font-medium text-zinc-400">
                {colorClass && <span className={colorClass}>{agentId}</span>}
                <span>{formatTimestamp(group.timestamp)}</span>
              </div>
            )}
            <div className="px-4 py-2">
              {groupIntoParagraphs(group.lines).map((para, pi) => (
                <div key={pi} className="mb-2 last:mb-0">
                  <LogMarkdown content={para.join('\n')} />
                </div>
              ))}
            </div>
            {gi < groups.length - 1 && group.timestamp && (
              <div className="border-b border-zinc-800/50" />
            )}
          </div>
        ))}
      </div>
      <p className="text-right text-xs text-muted-foreground">
        {log.totalLines.toLocaleString()} total lines
      </p>
    </div>
  );
}
