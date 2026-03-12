"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Agent {
  id: string;
  role: "planner" | "worker";
  interval: string;
  intervalSeconds: number;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  running: boolean;
  overdue: boolean;
  prompt: string;
  contexts: string[];
  agentic: boolean;
  workspace: boolean;
  repo: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h ${remainMin}m`;
}

function StatusDot({ running, overdue }: { running: boolean; overdue: boolean }) {
  if (running) {
    return (
      <span
        className="inline-block size-2 rounded-full bg-accent-green"
        title="Running"
      />
    );
  }
  if (overdue) {
    return (
      <span
        className="inline-block size-2 rounded-full bg-accent-yellow"
        title="Overdue"
      />
    );
  }
  return (
    <span
      className="inline-block size-2 rounded-full bg-muted-foreground"
      title="Idle"
    />
  );
}

function RoleBadge({ role }: { role: "planner" | "worker" }) {
  const color = role === "planner" ? "text-accent-magenta" : "text-accent-blue";
  return (
    <span
      className={`${color} text-sm font-medium uppercase tracking-wide`}
    >
      {role}
    </span>
  );
}

function AgentCard({
  agent,
  onForceRun,
  onDelete,
}: {
  agent: Agent;
  onForceRun: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [tick, setTick] = useState(0);

  // Live countdown ticker — updates every second
  useEffect(() => {
    if (!agent.nextRun) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [agent.nextRun]);

  // Suppress unused var lint — tick drives re-render for countdown
  void tick;

  const handleForceRun = () => {
    onForceRun(agent.id);
    setFeedback("Started");
    setTimeout(() => setFeedback(null), 2000);
  };

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    onDelete(agent.id);
    setConfirming(false);
  };

  return (
    <div className="rounded-md bg-surface p-2 border border-border hover:bg-surface-hover transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <StatusDot running={agent.running} overdue={agent.overdue} />
        <span className="font-mono text-base text-text-bright truncate flex-1">
          {agent.id}
        </span>
        <RoleBadge role={agent.role} />
      </div>

      <div className="flex items-center gap-3 text-sm text-text font-mono ml-4 mb-2">
        <span title="Interval">{agent.interval}</span>
        {agent.lastRun && (
          <span title={`Last run: ${agent.lastRun}`}>
            {relativeTime(agent.lastRun)}
          </span>
        )}
        {agent.nextRun && (
          <span className="text-accent-cyan" title={`Next run: ${agent.nextRun}`}>
            {countdown(agent.nextRun)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 ml-4">
        <Button
          variant="ghost"
          size="xs"
          className="text-accent-green hover:text-accent-green"
          onClick={handleForceRun}
        >
          {feedback ?? "Run"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className={
            confirming
              ? "text-accent-red hover:text-accent-red"
              : "text-text hover:text-accent-red"
          }
          onClick={handleDelete}
        >
          {confirming ? "Confirm?" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

export function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (mountedRef.current) {
        setAgents(data.agents ?? []);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch agents");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAgents();
    const id = setInterval(fetchAgents, 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAgents]);

  const handleForceRun = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/force-run`, { method: "POST" });
    } catch {
      // best-effort
    }
  };

  const handleDelete = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
      }
    } catch {
      // best-effort
    }
  };

  return (
    <div className="h-full bg-surface p-3 overflow-y-auto flex flex-col">
      <h2 className="text-text-bright font-semibold text-base uppercase tracking-wide mb-3">
        Agents
      </h2>

      {error && (
        <p className="text-accent-red text-sm mb-2">{error}</p>
      )}

      {agents.length === 0 && !error ? (
        <p className="text-muted-foreground text-sm">No agents configured</p>
      ) : (
        <div className="flex flex-col gap-2">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onForceRun={handleForceRun}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
