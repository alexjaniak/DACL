"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogBlock, parseLogBlocks } from "@/lib/log-parser";
import { getAgentColor } from "@/lib/colors";

const MAX_BLOCKS = 200;
const POLL_INTERVAL = 2000;

interface AgentOffset {
  [agentId: string]: number;
}

export function LogsPanel() {
  const [blocks, setBlocks] = useState<LogBlock[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  const offsetsRef = useRef<AgentOffset>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollTop = useRef(0);

  const fetchLogs = useCallback(async () => {
    if (activeTab === "all") {
      // For "all" tab: fetch each agent's logs using per-agent endpoints
      // First discover agents if we don't know them yet
      let agentIds = agents;
      if (agentIds.length === 0) {
        const agentsRes = await fetch("/api/agents");
        if (!agentsRes.ok) return;
        const agentsData = await agentsRes.json();
        agentIds = (agentsData.agents as { id: string }[]).map((a) => a.id);
        agentIds.sort();
        setAgents(agentIds);
      }

      // Fetch all agent logs in parallel with per-agent offsets
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
          const parsed = parseLogBlocks(result.agentId, result.data);
          newBlocks.push(...parsed);
        }
        offsetsRef.current[result.agentId] = result.offset;
      }

      if (newBlocks.length > 0) {
        setBlocks((prev) => {
          // On first load or full refresh, replace all
          const existingKeys = new Set(prev.map((b) => b.key));
          const fresh = newBlocks.filter((b) => !existingKeys.has(b.key));
          if (fresh.length === 0) return prev;
          const merged = [...prev, ...fresh];
          merged.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          );
          return merged.slice(0, MAX_BLOCKS);
        });
      }
    } else {
      const offset = offsetsRef.current[activeTab] ?? 0;
      const res = await fetch(
        `/api/logs/${encodeURIComponent(activeTab)}?offset=${offset}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (data.data) {
        const parsed = parseLogBlocks(activeTab, data.data);
        if (parsed.length > 0) {
          setBlocks((prev) => {
            const existingKeys = new Set(prev.map((b) => b.key));
            const fresh = parsed.filter((b) => !existingKeys.has(b.key));
            if (fresh.length === 0) return prev;
            const merged = [...prev, ...fresh];
            merged.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            );
            return merged.slice(0, MAX_BLOCKS);
          });
        }
      }
      offsetsRef.current[activeTab] = data.offset;
    }
  }, [activeTab, agents]);

  // Reset blocks when switching tabs
  useEffect(() => {
    setBlocks([]);
    offsetsRef.current = {};
    fetchLogs();
  }, [activeTab, fetchLogs]);

  // Poll every 2 seconds
  useEffect(() => {
    const id = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // Auto-scroll detection
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Container scrolls; top = 0 means at newest (top)
    if (el.scrollTop < prevScrollTop.current && el.scrollTop > 10) {
      setAutoScroll(false);
    }
    if (el.scrollTop <= 5) {
      setAutoScroll(true);
    }
    prevScrollTop.current = el.scrollTop;
  }, []);

  // Scroll to top when new blocks arrive and autoScroll is on
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [blocks, autoScroll]);

  const filteredBlocks =
    activeTab === "all"
      ? blocks
      : blocks.filter((b) => b.agentId === activeTab);

  const displayBlocks = filter
    ? filteredBlocks.filter((b) =>
        b.content.toLowerCase().includes(filter.toLowerCase())
      )
    : filteredBlocks;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          <TabButton
            label="All"
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          />
          {agents.map((id) => (
            <TabButton
              key={id}
              label={id}
              active={activeTab === id}
              onClick={() => setActiveTab(id)}
              color={getAgentColor(id)}
            />
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-surface-hover text-text text-sm px-2 py-1 rounded border border-border outline-none focus:border-accent-blue w-40 shrink-0 ml-2"
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
            <LogCard key={block.key} block={block} showAgent={activeTab === "all"} />
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
        active
          ? "text-text-bright border-accent-blue"
          : "text-muted-foreground border-transparent hover:text-text"
      }`}
      style={active && color ? { borderColor: color } : undefined}
    >
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

function LogCard({
  block,
  showAgent,
}: {
  block: LogBlock;
  showAgent: boolean;
}) {
  const agentColor = getAgentColor(block.agentId);

  return (
    <div className="bg-surface border border-border rounded-md p-3">
      <div className="flex items-center gap-2 mb-2">
        {showAgent && (
          <span
            className="text-sm font-semibold px-2 py-0.5 rounded"
            style={{
              backgroundColor: agentColor + "20",
              color: agentColor,
            }}
          >
            {block.agentId}
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {block.displayTime}
        </span>
      </div>
      <pre className="text-text text-base whitespace-pre-wrap break-words leading-relaxed">
        {block.content}
      </pre>
    </div>
  );
}
