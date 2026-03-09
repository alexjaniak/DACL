import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/types';
import { RelativeTime } from './relative-time';
import { RoleBadge } from './role-badge';

export function AgentCard({
  agent,
  selected = false,
  onClick,
}: {
  agent: Agent;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'gap-4 border-border/60 bg-card/70 py-5 transition-colors',
        onClick && 'cursor-pointer hover:border-zinc-500/60',
        selected && 'border-zinc-400 bg-card/90 ring-1 ring-zinc-400/30',
      )}
      onClick={onClick}
    >
      <CardHeader className="flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="text-lg font-semibold tracking-tight">{agent.id}</CardTitle>
        <RoleBadge role={agent.role} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded border border-border/50 bg-background/30 px-2 py-0.5">
            {agent.interval}
          </span>
          {agent.agentic && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">
              agentic
            </span>
          )}
          {agent.workspace && (
            <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-300">
              workspace
            </span>
          )}
          <span className="rounded border border-border/50 bg-background/30 px-1.5 py-0.5 text-muted-foreground">
            {agent.repo}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Last run </span>
            <span className="text-foreground">
              {agent.lastRun ? <RelativeTime iso={agent.lastRun} /> : 'never'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Next run </span>
            <span className="text-foreground">
              {agent.nextRun ? <RelativeTime iso={agent.nextRun} /> : 'unknown'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
