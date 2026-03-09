'use client';

import { useEffect, useRef, useState } from 'react';
import type { Agent, LogChunk } from '@/lib/types';

const RUN_HEADER_RE = /^=== RUN (.+) ===$/;

const AGENT_COLORS: Record<number, string> = {
  0: 'text-teal-400',
  1: 'text-purple-400',
  2: 'text-amber-400',
  3: 'text-sky-400',
  4: 'text-rose-400',
  5: 'text-emerald-400',
  6: 'text-indigo-400',
  7: 'text-orange-400',
};

interface TaggedLine {
  agentId: string;
  colorClass: string;
  text: string;
  isRunHeader: boolean;
}

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

export function AllLogsViewer({ agents }: { agents: Agent[] }) {
  const [logs, setLogs] = useState<Map<string, LogChunk>>(new Map());
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    let active = true;

    async function fetchAllLogs() {
      try {
        const results = await Promise.all(
          agents.map(async (agent) => {
            const res = await fetch(`/api/logs/${encodeURIComponent(agent.id)}?lines=50`);
            if (!res.ok) return null;
            const data: LogChunk = await res.json();
            return data;
          })
        );
        if (!active) return;
        const map = new Map<string, LogChunk>();
        for (const chunk of results) {
          if (chunk) map.set(chunk.agentId, chunk);
        }
        setLogs(map);
      } catch {
        // silently ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAllLogs();
    const interval = setInterval(fetchAllLogs, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [agents]);

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
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        Loading logs…
      </div>
    );
  }

  // Build color map for agents
  const colorMap = new Map<string, string>();
  agents.forEach((agent, i) => {
    colorMap.set(agent.id, AGENT_COLORS[i % Object.keys(AGENT_COLORS).length]);
  });

  // Interleave: show each agent's logs sequentially (grouped by agent)
  const taggedLines: TaggedLine[] = [];
  for (const agent of agents) {
    const chunk = logs.get(agent.id);
    if (!chunk || chunk.lines.length === 0) continue;
    const color = colorMap.get(agent.id) ?? 'text-zinc-400';
    for (const line of chunk.lines) {
      const match = line.match(RUN_HEADER_RE);
      taggedLines.push({
        agentId: agent.id,
        colorClass: color,
        text: match ? formatTimestamp(match[1]) : line,
        isRunHeader: !!match,
      });
    }
  }

  if (taggedLines.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        No logs available
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[28rem] overflow-y-auto rounded-lg bg-zinc-950/80 px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-300"
    >
      {taggedLines.map((tl, i) =>
        tl.isRunHeader ? (
          <div key={i} className="mt-3 mb-1 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
            <span className={`font-medium ${tl.colorClass}`}>{tl.agentId}</span>
            <span className="ml-2">{tl.text}</span>
          </div>
        ) : (
          <div key={i} className="flex gap-2 whitespace-pre-wrap break-all">
            <span className={`shrink-0 select-none font-medium ${tl.colorClass}`}>
              {tl.agentId.padEnd(12).slice(0, 12)}
            </span>
            <span>{tl.text || '\u00a0'}</span>
          </div>
        )
      )}
    </div>
  );
}
