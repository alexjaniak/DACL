'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent, DashboardData } from '@/lib/types';
import { AgentGrid } from './agent-grid';
import { AllLogsViewer } from './all-logs-viewer';
import { LogViewer } from './log-viewer';
import { StatsBar } from './stats-bar';

const POLL_INTERVAL = 10_000;

export function Dashboard({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeLogTab, setActiveLogTab] = useState<string>('all');
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

  useEffect(() => {
    mountedRef.current = true;
    const id = setInterval(fetchAgents, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchAgents]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - updatedAt.getTime()) / 1000));
    }, 1_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  const logTabs = [
    { id: 'all', label: 'All Agents' },
    ...agents.map((a) => ({ id: a.id, label: a.id })),
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      {/* Agents Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Agents</h2>
        <AgentGrid agents={agents} />
      </section>

      <div className="border-t border-border/40" />

      {/* Logs Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Logs</h2>

        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-900/50 p-1">
          {logTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveLogTab(tab.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeLogTab === tab.id
                  ? 'bg-zinc-800 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Log content */}
        {activeLogTab === 'all' ? (
          <AllLogsViewer agents={agents} />
        ) : (
          <LogViewer key={activeLogTab} agentId={activeLogTab} />
        )}
      </section>
    </main>
  );
}
