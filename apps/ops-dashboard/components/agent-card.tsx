import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge } from '@/components/role-badge';
import { RelativeTime } from '@/components/relative-time';
import type { Agent } from '@/lib/types';
import { Bot, Timer, Zap, FolderGit2 } from 'lucide-react';

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="gap-0 border-border/60 py-0">
      <CardHeader className="flex-row items-center justify-between gap-2 py-4">
        <div className="flex items-center gap-2.5">
          <Bot className="size-4 text-muted-foreground" />
          <CardTitle className="font-mono text-sm">{agent.id}</CardTitle>
        </div>
        <RoleBadge role={agent.role} />
      </CardHeader>

      <CardContent className="flex flex-col gap-3 border-t border-border/40 py-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Timer className="size-3" />
            Interval
          </span>
          <span className="font-mono">{agent.interval}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last run</span>
          <span className="font-mono text-muted-foreground">
            <RelativeTime iso={agent.lastRun} />
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Next run</span>
          <span className="font-mono text-muted-foreground">
            <RelativeTime iso={agent.nextRun} fallback="unknown" />
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          {agent.agentic && (
            <span className="flex items-center gap-1 rounded border border-border/50 bg-background/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Zap className="size-2.5" /> agentic
            </span>
          )}
          {agent.workspace && (
            <span className="flex items-center gap-1 rounded border border-border/50 bg-background/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <FolderGit2 className="size-2.5" /> workspace
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
