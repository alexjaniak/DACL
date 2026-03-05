import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardData, type ActivityRecord, type AgentRecord, type CronJobRecord } from '../lib/data';

function EmptyState({ message }: { message: string }) {
  return <p className="text-muted-foreground text-sm">{message}</p>;
}

function ErrorState({ message }: { message: string }) {
  return <p className="text-sm text-rose-300">{message}</p>;
}

function AgentSection({ agents }: { agents: AgentRecord[] | undefined }) {
  if (!Array.isArray(agents)) return <ErrorState message="Could not render agents right now." />;
  if (agents.length === 0) return <EmptyState message="No agent data found." />;

  return (
    <ul className="grid gap-3">
      {agents.map((agent) => (
        <li key={agent.id} className="grid gap-0.5 rounded-md border border-border/70 bg-background/30 p-3">
          <strong>{agent.id}</strong>
          <span className="text-muted-foreground text-sm">Role: {agent.role}</span>
          <span className="text-muted-foreground text-sm">Status: {agent.statusSummary}</span>
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
        <li key={job.name} className="grid gap-0.5 rounded-md border border-border/70 bg-background/30 p-3">
          <strong>{job.name}</strong>
          <span className="text-muted-foreground text-sm">Schedule/interval: {job.schedule}</span>
          <span className="text-muted-foreground text-sm">Enabled: {String(job.enabled)}</span>
          <span className="text-muted-foreground text-sm">Next run: {job.nextRun}</span>
          <span className="text-muted-foreground text-sm">Last run/status: {job.lastRunStatus}</span>
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
        <li key={`${row.agentId}-${row.updatedAt}`} className="grid gap-0.5 rounded-md border border-border/70 bg-background/30 p-3">
          <strong>{row.agentId}</strong>
          <span className="text-muted-foreground text-sm">Action: {row.lastKnownAction}</span>
          <span className="text-muted-foreground text-sm">Timestamp: {row.updatedAt}</span>
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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12">
      <header className="space-y-2">
        <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">DACL</p>
        <h1 className="text-4xl font-semibold tracking-tight">Ops Dashboard</h1>
        <p className="text-muted-foreground">Live overview for agents, cron jobs, and recent activity.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Agents, cron jobs, and activity">
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>Current worker and planner state.</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentSection agents={data?.agents} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cron Jobs</CardTitle>
            <CardDescription>Schedules and run health.</CardDescription>
          </CardHeader>
          <CardContent>
            <CronSection cronJobs={data?.cronJobs} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Latest agent updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivitySection activity={data?.activity} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
