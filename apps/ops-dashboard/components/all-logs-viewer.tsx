'use client';

import { useEffect, useRef, useState } from 'react';
import type { Agent, LogChunk } from '@/lib/types';
import { LogMarkdown } from './log-markdown';

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

interface RunGroup {
  agentId: string;
  colorClass: string;
  timestamp: string;
  lines: string[];
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
      <div className="flex h-full items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        Loading logs…
      </div>
    );
  }

  // Build color map for agents
  const colorMap = new Map<string, string>();
  agents.forEach((agent, i) => {
    colorMap.set(agent.id, AGENT_COLORS[i % Object.keys(AGENT_COLORS).length]);
  });

  // Group lines by runs, per agent (same structure as LogViewer)
  const allGroups: RunGroup[] = [];
  for (const agent of agents) {
    const chunk = logs.get(agent.id);
    if (!chunk || chunk.lines.length === 0) continue;
    const color = colorMap.get(agent.id) ?? 'text-zinc-400';
    let current: RunGroup | null = null;

    for (const line of chunk.lines) {
      const match = line.match(RUN_HEADER_RE);
      if (match) {
        current = { agentId: agent.id, colorClass: color, timestamp: match[1], lines: [] };
        allGroups.push(current);
      } else if (current) {
        current.lines.push(line);
      } else {
        current = { agentId: agent.id, colorClass: color, timestamp: '', lines: [line] };
        allGroups.push(current);
      }
    }
  }

  if (allGroups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-zinc-950/80 text-sm text-muted-foreground">
        No logs available
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto rounded-lg bg-zinc-950/80 font-mono text-[13px] leading-relaxed text-zinc-300"
    >
      {allGroups.map((group, gi) => (
        <div key={gi}>
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/95 px-4 py-2 text-xs font-medium text-zinc-400">
            <span className={group.colorClass}>{group.agentId}</span>
            {group.timestamp && <span>{formatTimestamp(group.timestamp)}</span>}
          </div>
          <div className="px-4 py-2">
            {groupIntoParagraphs(group.lines).map((para, pi) => (
              <div key={pi} className="mb-2 flex gap-2 last:mb-0">
                <span className={`shrink-0 select-none pt-0.5 font-medium ${group.colorClass}`}>
                  {group.agentId.padEnd(12).slice(0, 12)}
                </span>
                <div className="min-w-0 flex-1">
                  <LogMarkdown content={para.join('\n')} />
                </div>
              </div>
            ))}
          </div>
          {gi < allGroups.length - 1 && group.timestamp && (
            <div className="border-b border-zinc-800/50" />
          )}
        </div>
      ))}
    </div>
  );
}
