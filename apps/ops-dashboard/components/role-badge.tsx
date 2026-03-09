import { cn } from '@/lib/utils';
import type { Agent } from '@/lib/types';

const styles: Record<Agent['role'], string> = {
  planner: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  worker: 'border-teal-500/40 bg-teal-500/15 text-teal-300',
  unknown: 'border-border/60 bg-background/40 text-muted-foreground',
};

export function RoleBadge({ role }: { role: Agent['role'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[role],
      )}
    >
      {role}
    </span>
  );
}
