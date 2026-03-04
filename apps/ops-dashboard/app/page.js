import { getDashboardData } from '../lib/data';

function EmptyState({ message }) {
  return <p className="subtitle section-state">{message}</p>;
}

function ErrorState({ message }) {
  return <p className="subtitle section-state error">{message}</p>;
}

function AgentSection({ agents }) {
  if (!Array.isArray(agents)) {
    return <ErrorState message="Could not render agents right now." />;
  }

  if (agents.length === 0) {
    return <EmptyState message="No agent data found." />;
  }

  return (
    <ul className="stack-list">
      {agents.map((agent) => (
        <li key={agent.id}>
          <strong>{agent.id}</strong>
          <span>Role: {agent.role}</span>
          <span>Status: {agent.statusSummary}</span>
        </li>
      ))}
    </ul>
  );
}

function CronSection({ cronJobs }) {
  if (!Array.isArray(cronJobs)) {
    return <ErrorState message="Could not render cron jobs right now." />;
  }

  if (cronJobs.length === 0) {
    return <EmptyState message="No cron job data found." />;
  }

  return (
    <ul className="stack-list">
      {cronJobs.map((job) => (
        <li key={job.name}>
          <strong>{job.name}</strong>
          <span>Schedule/interval: {job.schedule}</span>
          <span>Enabled: {String(job.enabled)}</span>
          <span>Next run: {job.nextRun}</span>
          <span>Last run/status: {job.lastRunStatus}</span>
        </li>
      ))}
    </ul>
  );
}

function ActivitySection({ activity }) {
  if (!Array.isArray(activity)) {
    return <ErrorState message="Could not render activity right now." />;
  }

  if (activity.length === 0) {
    return <EmptyState message="No activity data found." />;
  }

  return (
    <ul className="stack-list">
      {activity.map((row) => (
        <li key={`${row.agentId}-${row.updatedAt}`}>
          <strong>{row.agentId}</strong>
          <span>Action: {row.lastKnownAction}</span>
          <span>Timestamp: {row.updatedAt}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  let data;

  try {
    data = await getDashboardData();
  } catch {
    data = null;
  }

  const agents = data?.agents;
  const cronJobs = data?.cronJobs;
  const activity = data?.activity;

  return (
    <main className="container">
      <header>
        <p className="eyebrow">DACL</p>
        <h1>Ops Dashboard</h1>
        <p className="subtitle">Live overview for agents, cron jobs, and recent activity.</p>
      </header>

      <section className="grid" aria-label="Agents, cron jobs, and activity">
        <article className="card">
          <h2>Agents</h2>
          <AgentSection agents={agents} />
        </article>

        <article className="card">
          <h2>Cron Jobs</h2>
          <CronSection cronJobs={cronJobs} />
        </article>

        <article className="card">
          <h2>Activity</h2>
          <ActivitySection activity={activity} />
        </article>
      </section>
    </main>
  );
}
