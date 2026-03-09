import type { Agent } from '@/lib/types';

export function StatsBar({ agents }: { agents: Agent[] }) {
  const planners = agents.filter((a) => a.role === 'planner').length;
  const workers = agents.filter((a) => a.role === 'worker').length;

  return (
    <div className="flex gap-6 text-sm">
      <span>
        <span className="text-muted-foreground">Agents </span>
        <span className="font-medium">{agents.length}</span>
      </span>
      <span>
        <span className="text-muted-foreground">Planners </span>
        <span className="font-medium text-purple-300">{planners}</span>
      </span>
      <span>
        <span className="text-muted-foreground">Workers </span>
        <span className="font-medium text-teal-300">{workers}</span>
      </span>
    </div>
  );
}
