'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Agent, DashboardData } from '@/lib/types';
import { AgentGrid } from './agent-grid';
import { AllLogsViewer } from './all-logs-viewer';
import { LogViewer } from './log-viewer';
import { StatsBar } from './stats-bar';

const POLL_INTERVAL = 10_000;

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

export function Dashboard({ initialAgents }: { initialAgents: Agent[] }) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
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

  // Build agent color map
  const colorMap = new Map<string, string>();
  agents.forEach((agent, i) => {
    colorMap.set(agent.id, AGENT_COLORS[i % Object.keys(AGENT_COLORS).length]);
  });

  const selectedColor = selectedAgent ? colorMap.get(selectedAgent) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm tracking-[0.16em] text-muted-foreground uppercase">FORGE</p>
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

      {/* Unified Agents + Logs Section */}
      <section className="space-y-6">
        <AgentGrid
          agents={agents}
          selectedId={selectedAgent}
          onSelect={setSelectedAgent}
        />

        {/* Log viewer label */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">
            {selectedAgent ? (
              <>
                Logs &mdash;{' '}
                <span className={selectedColor}>{selectedAgent}</span>
              </>
            ) : (
              'Logs — All Agents'
            )}
          </h2>
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Show all
            </button>
          )}
        </div>

        {/* Fixed-height log content */}
        <div className="h-[28rem]">
          {selectedAgent ? (
            <LogViewer
              key={selectedAgent}
              agentId={selectedAgent}
              colorClass={selectedColor}
            />
          ) : (
            <AllLogsViewer agents={agents} />
          )}
        </div>
      </section>
    </main>
  );
}
