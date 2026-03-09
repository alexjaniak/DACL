'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent, DashboardData } from '@/lib/types';
import { AgentGrid } from './agent-grid';
import { StatsBar } from './stats-bar';

const POLL_INTERVAL = 10_000;

export function Dashboard({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const fetchAgents = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/agents');
      if (!mountedRef.current) return;
      if (!res.ok) return;
      const data: DashboardData = await res.json();
      setAgents(data.agents);
      setUpdatedAt(new Date());
      setSecondsAgo(0);
    } catch {
      // silently ignore fetch errors
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, []);

  // Poll for agent data
  useEffect(() => {
    mountedRef.current = true;
    const id = setInterval(fetchAgents, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAgents]);

  // Tick the "seconds ago" counter every second
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - updatedAt.getTime()) / 1000));
    }, 1_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                refreshing ? 'bg-emerald-400' : 'bg-emerald-600'
              }`}
            />
            <span>
              Updated {secondsAgo < 2 ? 'just now' : `${secondsAgo}s ago`}
            </span>
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Ops Dashboard</h1>
        <StatsBar agents={agents} />
      </header>

      <div className="border-t border-border/40" />

      <AgentGrid agents={agents} />
    </main>
  );
}
