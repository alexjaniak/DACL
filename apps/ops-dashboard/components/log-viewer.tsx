'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LogChunk } from '@/lib/types';

export function LogViewer({ agentId }: { agentId: string }) {
  const [data, setData] = useState<LogChunk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/logs/${encodeURIComponent(agentId)}?lines=100`);
      if (!res.ok) {
        setError(res.status === 404 ? 'Agent not found' : 'Failed to load logs');
        return;
      }
      const chunk: LogChunk = await res.json();
      setData(chunk);
      setError(null);
    } catch {
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Track scroll position before update
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      wasAtBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll to bottom if user was already there
  useEffect(() => {
    if (data && wasAtBottomRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [data]);

  // Fetch on mount + poll every 8s
  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 8000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border/40 bg-background/80">
        <span className="animate-pulse text-xs text-muted-foreground">Loading logs…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-20 items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/5">
        <span className="text-xs text-rose-300">{error}</span>
      </div>
    );
  }

  if (!data || data.lines.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center rounded-md border border-border/40 bg-background/80">
        <span className="text-xs text-muted-foreground">No logs available</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{data.totalLines.toLocaleString()} total lines</span>
        {data.lastModified && (
          <span>updated {new Date(data.lastModified).toLocaleTimeString()}</span>
        )}
      </div>
      <div
        ref={containerRef}
        className="max-h-64 overflow-y-auto rounded-md border border-border/40 bg-[oklch(0.12_0.02_264)] p-3 font-mono text-[11px] leading-relaxed text-emerald-200/90"
      >
        {data.lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap break-all">
            {line || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}
