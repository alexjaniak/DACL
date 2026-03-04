import './globals.css';
import { loadAgents, loadCronJobs } from '../lib/dacl-data';

function StatusBadge({ ok, children }) {
  return <span className={`badge ${ok ? 'ok' : 'warn'}`}>{children}</span>;
}

export default function DashboardPage() {
  const agents = loadAgents();
  const cronJobs = loadCronJobs();

  return (
    <main>
      <h1>DACL Dashboard (v1)</h1>
      <p className="muted">Read-only visibility for agents and cron jobs. Data is loaded from local repo files.</p>

      <section>
        <h2>Agents</h2>
        <small>Source: <code>agents/config/*.json</code> + <code>agents/metadata/*.json</code></small>
        {agents.length === 0 ? (
          <div className="empty">No agents found. Add JSON files under <code>agents/config</code>.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Agent</th><th>Role</th><th>Health</th><th>Wallet</th><th>Responsibilities</th></tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.agentId}>
                  <td><strong>{agent.agentId}</strong><div className="muted">{agent.worktree || 'no worktree set'}</div></td>
                  <td>{agent.role}</td>
                  <td><StatusBadge ok={agent.health === 'healthy'}>{agent.health}</StatusBadge></td>
                  <td><code>{agent.wallet || 'n/a'}</code></td>
                  <td>{agent.responsibilities.length ? <ul>{agent.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul> : <span className="muted">none listed</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Cron Jobs</h2>
        <small>Source: <code>agents/config/cron-jobs.json</code> (optional)</small>
        {cronJobs.length === 0 ? (
          <div className="empty">No cron jobs found. Create <code>agents/config/cron-jobs.json</code> with an array of jobs.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>Enabled</th><th>Interval</th><th>Next run</th><th>Last status</th></tr>
            </thead>
            <tbody>
              {cronJobs.map((job) => (
                <tr key={job.name}>
                  <td>{job.name}</td>
                  <td><StatusBadge ok={job.enabled}>{job.enabled ? 'enabled' : 'disabled'}</StatusBadge></td>
                  <td>{job.interval}</td>
                  <td>{job.nextRun}</td>
                  <td>{job.lastRunStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
