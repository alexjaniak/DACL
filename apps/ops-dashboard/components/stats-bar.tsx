import type { Agent } from '@/lib/types';

export function StatsBar({ agents }: { agents: Agent[] }) {
  const planners = agents.filter((a) => a.role === 'planner').length;
  const workers = agents.filter((a) => a.role === 'worker').length;

  return (
    <div className="flex gap-6 text-sm text-muted-foreground">
      <span>
        <span className="font-medium text-foreground">{agents.length}</span> agents
      </span>
      <span>
        <span className="font-medium text-purple-300">{planners}</span> planners
      </span>
      <span>
        <span className="font-medium text-teal-300">{workers}</span> workers
      </span>
    </div>
  );
}
