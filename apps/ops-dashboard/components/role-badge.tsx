import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  planner: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  worker: 'border-teal-500/40 bg-teal-500/15 text-teal-300',
  unknown: 'border-border/60 bg-background/40 text-muted-foreground',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none', styles[role] ?? styles.unknown)}>
      {role}
    </span>
  );
}
