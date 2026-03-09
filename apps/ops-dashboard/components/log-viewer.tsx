'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogChunk } from '@/lib/types';

export function LogViewer({ agentId }: { agentId: string }) {
  const [log, setLog] = useState<LogChunk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    let active = true;

    async function fetchLogs() {
      try {
        const res = await fetch(`/api/logs/${encodeURIComponent(agentId)}?lines=100`);
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

  // Track whether user is scrolled to bottom
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

  // Auto-scroll to bottom on new content if user was at bottom
  useEffect(() => {
    if (log && isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md bg-zinc-950 text-xs text-muted-foreground">
        Loading logs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md bg-zinc-950 text-xs text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!log || log.lines.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md bg-zinc-950 text-xs text-muted-foreground">
        No logs available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300"
      >
        {log.lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line || '\u00a0'}
          </div>
        ))}
      </div>
      <p className="text-right text-[10px] text-muted-foreground">
        {log.totalLines.toLocaleString()} total lines
      </p>
    </div>
  );
}
