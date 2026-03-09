import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Agent } from '@/lib/types';
import { LogPanel } from './log-panel';
import { RelativeTime } from './relative-time';
import { RoleBadge } from './role-badge';

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="gap-4 border-border/60 bg-card/70 py-4">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-0">
        <CardTitle className="text-base tracking-tight">{agent.id}</CardTitle>
        <RoleBadge role={agent.role} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded border border-border/50 bg-background/30 px-1.5 py-0.5">
            {agent.interval}
          </span>
          {agent.agentic && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
              agentic
            </span>
          )}
          {agent.workspace && (
            <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-sky-300">
              workspace
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
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
        <LogPanel agentId={agent.id} />
      </CardContent>
    </Card>
  );
}
