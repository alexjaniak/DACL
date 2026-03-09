import type { Agent } from '@/lib/types';
import { AgentCard } from './agent-card';

export function AgentGrid({
  agents,
  selectedId,
  onSelect,
}: {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (agents.length === 0) {
    return <p className="text-sm text-muted-foreground">No agents found.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            selected={selectedId === agent.id}
            onClick={() => onSelect(selectedId === agent.id ? null : agent.id)}
          />
        ))}
      </div>
    </div>
  );
}
