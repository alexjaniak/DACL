import fs from 'node:fs/promises';
import path from 'node:path';

/** @typedef {{ id: string, role: string, statusSummary: string }} AgentRecord */
/** @typedef {{ name: string, schedule: string, enabled: boolean, nextRun: string, lastRunStatus: string }} CronJobRecord */
/** @typedef {{ agentId: string, lastKnownAction: string, updatedAt: string }} ActivityRecord */
/** @typedef {{ agents: AgentRecord[], cronJobs: CronJobRecord[], activity: ActivityRecord[] }} DashboardData */

const repoRoot = path.resolve(process.cwd(), '..', '..');

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function ensureString(value, fallback = 'unknown') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function deriveStatusSummary(config) {
  if (!config) {
    return 'No config available';
  }

  const worktree = ensureString(config.worktree, 'no worktree configured');
  return `Configured (${worktree})`;
}

async function getAgents() {
  const registry = await readJson('agents/registry.json');
  const registryAgents = Array.isArray(registry?.agents) ? registry.agents : [];

  const mappedAgents = await Promise.all(
    registryAgents.map(async (agent) => {
      const config = agent.config ? await readJson(agent.config) : null;

      return {
        id: ensureString(agent.agentId),
        role: ensureString(agent.role),
        statusSummary: deriveStatusSummary(config)
      };
    })
  );

  return mappedAgents;
}

async function getCronJobs() {
  const source = await readJson('apps/ops-dashboard/data/cron-jobs.json');
  const jobs = Array.isArray(source?.cronJobs) ? source.cronJobs : [];

  return jobs.map((job) => ({
    name: ensureString(job.name),
    schedule: ensureString(job.schedule, 'not configured'),
    enabled: Boolean(job.enabled),
    nextRun: ensureString(job.nextRun, 'unknown'),
    lastRunStatus: ensureString(job.lastRunStatus, 'never-run')
  }));
}

async function getActivity() {
  const source = await readJson('apps/ops-dashboard/data/activity.json');
  const rows = Array.isArray(source?.activity) ? source.activity : [];

  return rows.map((row) => ({
    agentId: ensureString(row.agentId),
    lastKnownAction: ensureString(row.lastKnownAction, 'no activity captured'),
    updatedAt: ensureString(row.updatedAt, 'unknown')
  }));
}

/** @returns {Promise<DashboardData>} */
export async function getDashboardData() {
  const [agents, cronJobs, activity] = await Promise.all([
    getAgents(),
    getCronJobs(),
    getActivity()
  ]);

  return {
    agents,
    cronJobs,
    activity
  };
}
