"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogBlock, parseLogBlocks } from "@/lib/log-parser";
import { getAgentColor } from "@/lib/colors";

const MAX_BLOCKS = 200;
const POLL_INTERVAL = 5000; // Fallback polling interval (only used when SSE drops)

interface AgentOffset {
  [agentId: string]: number;
}

export function LogsPanel() {
  const [blocks, setBlocks] = useState<LogBlock[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  const offsetsRef = useRef<AgentOffset>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollTop = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Merge new blocks into state
  const mergeBlocks = useCallback(
    (newBlocks: LogBlock[]) => {
      if (newBlocks.length === 0) return;
      setBlocks((prev) => {
        const blockMap = new Map<string, LogBlock>();
        for (const b of prev) {
          blockMap.set(b.key, b);
        }
        let changed = false;
        for (const b of newBlocks) {
          const existing = blockMap.get(b.key);
          if (!existing || (b.endTimestamp && !existing.endTimestamp)) {
            blockMap.set(b.key, b);
            changed = true;
          }
        }
        if (!changed) return prev;
        const merged = Array.from(blockMap.values());
        merged.sort(
          (a, b) =>
            new Date(a.endTimestamp ?? a.timestamp).getTime() -
            new Date(b.endTimestamp ?? b.timestamp).getTime()
        );
        return merged.slice(-MAX_BLOCKS);
      });
    },
    []
  );

  // Initial load via existing GET endpoint
  const fetchInitialLogs = useCallback(async () => {
    let agentIds = agents;
    if (agentIds.length === 0) {
      const agentsRes = await fetch("/api/agents");
      if (!agentsRes.ok) return;
      const agentsData = await agentsRes.json();
      agentIds = (agentsData.agents as { id: string }[]).map((a) => a.id);
      agentIds.sort();
      setAgents(agentIds);
    }

    const results = await Promise.all(
      agentIds.map(async (agentId) => {
        const res = await fetch(
          `/api/logs/${encodeURIComponent(agentId)}?offset=0`
        );
        if (!res.ok) return { agentId, data: "", offset: 0 };
        const data = await res.json();
        return { agentId, ...data };
      })
    );

    const newBlocks: LogBlock[] = [];
    for (const result of results) {
      if (result.data) {
        newBlocks.push(...parseLogBlocks(result.agentId, result.data));
      }
      offsetsRef.current[result.agentId] = result.offset;
    }
    mergeBlocks(newBlocks);
  }, [agents, mergeBlocks]);

  // Fallback polling fetch (incremental)
  const fetchLogsPoll = useCallback(async () => {
    const agentIds = agents;
    if (agentIds.length === 0) return;

    const results = await Promise.all(
      agentIds.map(async (agentId) => {
        const offset = offsetsRef.current[agentId] ?? 0;
        const res = await fetch(
          `/api/logs/${encodeURIComponent(agentId)}?offset=${offset}`
        );
        if (!res.ok) return { agentId, data: "", offset: 0 };
        const data = await res.json();
        return { agentId, ...data };
      })
    );

    const newBlocks: LogBlock[] = [];
    for (const result of results) {
      if (result.data) {
        newBlocks.push(...parseLogBlocks(result.agentId, result.data));
      }
      offsetsRef.current[result.agentId] = result.offset;
    }
    mergeBlocks(newBlocks);
  }, [agents, mergeBlocks]);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) return;
    fallbackTimerRef.current = setInterval(fetchLogsPoll, POLL_INTERVAL);
  }, [fetchLogsPoll]);

  // Stop fallback polling
  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Set up SSE connection
  useEffect(() => {
    setBlocks([]);
    offsetsRef.current = {};

    fetchInitialLogs();

    const es = new EventSource("/api/logs/stream");
    eventSourceRef.current = es;

    es.addEventListener("log", (event) => {
      const { agentId, data, offset } = JSON.parse(event.data);
      if (data) {
        const parsed = parseLogBlocks(agentId, data);
        mergeBlocks(parsed);
      }
      offsetsRef.current[agentId] = offset;

      setAgents((prev) => {
        if (prev.includes(agentId)) return prev;
        const next = [...prev, agentId];
        next.sort();
        return next;
      });
    });

    es.onerror = () => {
      startFallbackPolling();
    };

    es.onopen = () => {
      stopFallbackPolling();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      stopFallbackPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeBlocks, startFallbackPolling, stopFallbackPolling]);

  // Auto-scroll detection
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (!atBottom && el.scrollTop < prevScrollTop.current) {
      setAutoScroll(false);
    }
    if (atBottom) {
      setAutoScroll(true);
    }
    prevScrollTop.current = el.scrollTop;
  }, []);

  // Scroll to bottom when new blocks arrive and autoScroll is on
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [blocks, autoScroll]);

  const displayBlocks = filter
    ? blocks.filter((b) =>
        b.content.toLowerCase().includes(filter.toLowerCase())
      )
    : blocks;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center justify-end border-b border-border px-4 py-2 shrink-0">
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface-hover text-text text-sm px-2 py-1 rounded border border-border outline-none focus:border-accent-blue w-40 shrink-0"
        />
      </div>

      {/* Log cards */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {displayBlocks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">No logs yet</p>
          </div>
        ) : (
          displayBlocks.map((block) => (
            <LogCard key={block.key} block={block} />
          ))
        )}
      </div>
    </div>
  );
}

function getRoleDotColor(agentId: string): string {
  if (agentId.startsWith("worker")) return "#98c379";
  if (agentId.startsWith("planner")) return "#c678dd";
  if (agentId.startsWith("super")) return "#e5c07b";
  return "#abb2bf";
}

function formatDuration(startIso: string, endIso: string): string {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function LogCard({ block }: { block: LogBlock }) {
  const agentColor = getAgentColor(block.agentId);
  const dotColor = getRoleDotColor(block.agentId);
  const duration =
    block.endTimestamp && block.timestamp
      ? formatDuration(block.timestamp, block.endTimestamp)
      : "";

  return (
    <div
      className="bg-surface border border-border rounded-md p-3 border-l-2"
      style={{ borderLeftColor: agentColor }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-2 py-0.5 rounded"
          style={{
            backgroundColor: agentColor + "26",
            color: agentColor,
            border: `1px solid ${agentColor}4D`,
          }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          {block.agentId}
        </span>
        <span className="text-sm text-muted-foreground">
          {block.displayTime}
          {block.displayEndTime && (
            <>
              <span className="text-muted-foreground/60">
                {" "}
                → {block.displayEndTime}
              </span>
              {duration && (
                <span className="text-muted-foreground text-xs ml-1">
                  ({duration})
                </span>
              )}
            </>
          )}
        </span>
      </div>
      <pre className="text-text text-base whitespace-pre-wrap break-words leading-relaxed">
        {block.content}
      </pre>
    </div>
  );
}
