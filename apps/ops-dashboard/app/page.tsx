import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDashboardData, type ActivityRecord, type AgentRecord, type AgentRunlogHistory, type CronJobRecord } from '../lib/data';
import { AutoRefresh } from '../components/auto-refresh';

export const dynamic = 'force-dynamic';

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border/70 bg-background/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-200">
      {message}
    </p>
  );
}

function Pill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
      : tone === 'warn'
        ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
        : tone === 'bad'
          ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
          : 'border-border/60 bg-background/40 text-muted-foreground';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{label}</span>;
}


function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-3">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm leading-relaxed text-foreground/95">{value}</span>
    </div>
  );
}

function AgentSection({ agents }: { agents: AgentRecord[] | undefined }) {
  if (!Array.isArray(agents)) return <ErrorState message="Could not render agents right now." />;
  if (agents.length === 0) return <EmptyState message="No agent data found." />;

  return (
    <ul className="grid gap-3">
      {agents.map((agent) => (
        <li
          key={agent.id}
          className="rounded-xl border border-border/80 bg-background/30 p-4 shadow-sm transition-colors hover:border-border"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold tracking-tight">{agent.id}</p>
              <p className="mt-0.5 text-xs text-muted-foreground uppercase">{agent.role}</p>
            </div>
            <Pill label={agent.agentic ? 'Agentic' : 'Non-agentic'} tone={agent.agentic ? 'good' : 'neutral'} />
          </div>

          <div className="space-y-2.5">
            <StackRow label="Interval" value={agent.interval} />
            <StackRow label="Workspace" value={agent.workspace ? 'Isolated worktree' : 'Shared'} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CronSection({ cronJobs }: { cronJobs: CronJobRecord[] | undefined }) {
  if (!Array.isArray(cronJobs)) return <ErrorState message="Could not render cron jobs right now." />;
  if (cronJobs.length === 0) return <EmptyState message="No cron job data found." />;

  return (
    <ul className="grid gap-3">
      {cronJobs.map((job) => (
        <li
          key={job.name}
          className="rounded-xl border border-border/80 bg-background/30 p-4 shadow-sm transition-colors hover:border-border"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-base font-semibold tracking-tight">{job.name}</p>
            <Pill label={`Every ${job.interval}`} tone="good" />
          </div>

          <div className="space-y-2.5">
            <StackRow label="Prompt" value={job.prompt.length > 120 ? `${job.prompt.slice(0, 120)}…` : job.prompt} />
            <StackRow label="Contexts" value={job.contexts.map((c) => c.split('/').pop()).join(', ') || 'none'} />
            <StackRow label="Agentic" value={job.agentic ? 'Yes' : 'No'} />
            <StackRow label="Workspace" value={job.workspace ? 'Isolated worktree' : 'Shared'} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActivitySection({ activity }: { activity: ActivityRecord[] | undefined }) {
  if (!Array.isArray(activity)) return <ErrorState message="Could not render activity right now." />;
  if (activity.length === 0) return <EmptyState message="No activity data found." />;

  return (
    <ul className="grid gap-3">
      {activity.map((row) => (
        <li
          key={`${row.agentId}-${row.updatedAt}`}
          className="rounded-xl border border-border/80 bg-background/30 p-4 shadow-sm transition-colors hover:border-border"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-base font-semibold tracking-tight">{row.agentId}</p>
            <Pill label={row.updatedAt} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{row.lastKnownAction}</p>
        </li>
      ))}
    </ul>
  );
}

function RunlogSection({ runlogs }: { runlogs: AgentRunlogHistory[] | undefined }) {
  if (!Array.isArray(runlogs)) return <ErrorState message="Could not render runlog history right now." />;
  if (runlogs.length === 0) return <EmptyState message="No runlog files found." />;

  return (
    <ul className="grid gap-3">
      {runlogs.map((history) => (
        <li key={history.agentId} className="rounded-xl border border-border/80 bg-background/30 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-semibold tracking-tight">{history.agentId}</p>
            {history.parseErrors > 0 ? <Pill label={`${history.parseErrors} parse errors`} tone="warn" /> : null}
          </div>

          {history.latest ? (
            <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs text-muted-foreground uppercase">Latest</p>
              <p className="mt-1 text-xs text-muted-foreground">{history.latest.timestamp}</p>
              <p className="mt-1 text-sm text-foreground/90">{history.latest.preview}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No valid runlogs yet.</p>
          )}

          <div className="mt-3 space-y-2">
            {history.byDate.slice(0, 5).map((group) => (
              <details key={`${history.agentId}-${group.date}`} className="rounded-lg border border-border/60 bg-background/20 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">
                  {group.date} <span className="text-muted-foreground">({group.entries.length})</span>
                </summary>
                <ul className="mt-2 space-y-2">
                  {group.entries.slice(0, 10).map((entry) => (
                    <li key={entry.id} className="text-sm text-foreground/90">
                      <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                      <p>{entry.preview}</p>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof getDashboardData>> | null;

  try {
    data = await getDashboardData();
  } catch {
    data = null;
  }

  const totalAgents = data?.agents?.length ?? 0;
  const totalCronJobs = data?.cronJobs?.length ?? 0;
  const totalActivity = data?.activity?.length ?? 0;
  const totalRunlogAgents = data?.runlogs?.length ?? 0;
  const dataErrors = data?.errors ?? [];
  const generatedAt = data?.generatedAt ?? null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:gap-7 lg:px-8 lg:py-12">
      <header className="space-y-3">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">DACL</p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ops Dashboard</h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Operational overview for agents, cron jobs, and recent activity.
            </p>
            <AutoRefresh />
            {generatedAt ? (
              <p className="text-xs text-muted-foreground">Data generated at {generatedAt}</p>
            ) : null}
          </div>

          <div className="grid w-full grid-cols-2 gap-2 text-center sm:w-auto sm:grid-cols-4 sm:gap-3">
            <div className="rounded-lg border border-border/70 bg-background/30 px-3 py-2">
              <p className="text-lg font-semibold leading-none sm:text-xl">{totalAgents}</p>
              <p className="mt-1 text-xs text-muted-foreground uppercase">Agents</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 px-3 py-2">
              <p className="text-lg font-semibold leading-none sm:text-xl">{totalCronJobs}</p>
              <p className="mt-1 text-xs text-muted-foreground uppercase">Cron Jobs</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 px-3 py-2">
              <p className="text-lg font-semibold leading-none sm:text-xl">{totalActivity}</p>
              <p className="mt-1 text-xs text-muted-foreground uppercase">Activity</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/30 px-3 py-2">
              <p className="text-lg font-semibold leading-none sm:text-xl">{totalRunlogAgents}</p>
              <p className="mt-1 text-xs text-muted-foreground uppercase">Runlog Agents</p>
            </div>
          </div>
        </div>
      </header>

      {dataErrors.length > 0 ? (
        <ErrorState message={`Some data sources failed to load: ${dataErrors.join(' | ')}`} />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2" aria-label="Agents, cron jobs, activity, and runlogs">
        <Card className="border-border/80 bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Agents</CardTitle>
            <CardDescription>Worker and planner status at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentSection agents={data?.agents} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Cron Jobs</CardTitle>
            <CardDescription>Schedule coverage and most recent health data.</CardDescription>
          </CardHeader>
          <CardContent>
            <CronSection cronJobs={data?.cronJobs} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Activity</CardTitle>
            <CardDescription>Latest actions reported by dashboard agents.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivitySection activity={data?.activity} />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/95">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Runlog History</CardTitle>
            <CardDescription>Latest per-agent preview with date-grouped history.</CardDescription>
          </CardHeader>
          <CardContent>
            <RunlogSection runlogs={data?.runlogs} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
