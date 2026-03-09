'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent, DashboardData } from '@/lib/types';
import { AgentGrid } from './agent-grid';
import { StatsBar } from './stats-bar';

const POLL_INTERVAL_MS = 10_000;

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function Dashboard({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState('just now');
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/agents');
      if (!res.ok) return;
      const data: DashboardData = await res.json();
      if (!mountedRef.current) return;
      setAgents(data.agents);
      setUpdatedAt(Date.now());
    } catch {
      // Silently ignore — stale data is fine
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, []);

  // Poll every 10s
  useEffect(() => {
    mountedRef.current = true;
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  // Update elapsed timer every 5s
  useEffect(() => {
    setElapsed('just now');
    const id = setInterval(() => {
      setElapsed(formatElapsed(Date.now() - updatedAt));
    }, 5_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground" aria-live="polite">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                refreshing ? 'bg-sky-400' : 'bg-emerald-500/80'
              }`}
            />
            Updated {elapsed}
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Ops Dashboard</h1>
        <StatsBar agents={agents} />
      </header>

      <div
        className={`transition-opacity duration-300 ${refreshing ? 'opacity-90' : 'opacity-100'}`}
      >
        <AgentGrid agents={agents} />
      </div>
    </main>
  );
}
