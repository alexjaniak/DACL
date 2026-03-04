import { getDashboardData } from '../lib/data';

function EmptyState({ message }) {
  return <p className="subtitle">{message}</p>;
}

export default async function HomePage() {
  const data = await getDashboardData();
  const { agents, cronJobs, activity } = data;

  return (
    <main className="container">
      <header>
        <p className="eyebrow">DACL</p>
        <h1>Ops Dashboard</h1>
        <p className="subtitle">Unified data path for agents, cron jobs, and activity.</p>
      </header>

      <section className="grid" aria-label="Agents">
        <article className="card">
          <h2>Agents</h2>
          {agents.length === 0 ? (
            <EmptyState message="No agent data found." />
          ) : (
            <ul>
              {agents.map((agent) => (
                <li key={agent.id}>
                  <strong>{agent.id}</strong> — {agent.role} — {agent.statusSummary}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Cron Jobs</h2>
          {cronJobs.length === 0 ? (
            <EmptyState message="No cron data found." />
          ) : (
            <ul>
              {cronJobs.map((job) => (
                <li key={job.name}>
                  <strong>{job.name}</strong> — {job.schedule} — enabled: {String(job.enabled)} — next: {job.nextRun} — last: {job.lastRunStatus}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Activity</h2>
          {activity.length === 0 ? (
            <EmptyState message="No activity data found." />
          ) : (
            <ul>
              {activity.map((row) => (
                <li key={`${row.agentId}-${row.updatedAt}`}>
                  <strong>{row.agentId}</strong> — {row.lastKnownAction} — {row.updatedAt}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
