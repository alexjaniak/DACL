import type { Agent } from '@/lib/types';
import { AgentCard } from './agent-card';

export function AgentGrid({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return <p className="text-sm text-muted-foreground">No agents found.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
