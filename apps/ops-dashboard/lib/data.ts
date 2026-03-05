import fs from 'node:fs/promises';
import path from 'node:path';

export type AgentRecord = {
  id: string;
  role: string;
  statusSummary: string;
};

export type CronJobRecord = {
  name: string;
  schedule: string;
  enabled: boolean;
  nextRun: string;
  lastRunStatus: string;
};

export type ActivityRecord = {
  agentId: string;
  lastKnownAction: string;
  updatedAt: string;
};

export type DashboardData = {
  agents: AgentRecord[];
  cronJobs: CronJobRecord[];
  activity: ActivityRecord[];
};

const repoRoot = path.resolve(process.cwd(), '..', '..');

async function readJson(relativePath: string): Promise<unknown> {
  const filePath = path.join(repoRoot, relativePath);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function ensureString(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function deriveStatusSummary(config: unknown): string {
  if (!config || typeof config !== 'object') {
    return 'No config available';
  }

  const worktree = ensureString((config as { worktree?: unknown }).worktree, 'no worktree configured');
  return `Configured (${worktree})`;
}

async function getAgents(): Promise<AgentRecord[]> {
  const registry = await readJson('agents/registry.json');
  const registryAgents =
    registry && typeof registry === 'object' && Array.isArray((registry as { agents?: unknown }).agents)
      ? ((registry as { agents: unknown[] }).agents ?? [])
      : [];

  const mappedAgents = await Promise.all(
    registryAgents.map(async (agent): Promise<AgentRecord> => {
      const safeAgent = agent && typeof agent === 'object' ? (agent as { agentId?: unknown; role?: unknown; config?: unknown }) : {};
      const config = typeof safeAgent.config === 'string' ? await readJson(safeAgent.config) : null;

      return {
        id: ensureString(safeAgent.agentId),
        role: ensureString(safeAgent.role),
        statusSummary: deriveStatusSummary(config)
      };
    })
  );

  return mappedAgents;
}

async function getCronJobs(): Promise<CronJobRecord[]> {
  const source = await readJson('apps/ops-dashboard/data/cron-jobs.json');
  const jobs =
    source && typeof source === 'object' && Array.isArray((source as { cronJobs?: unknown }).cronJobs)
      ? ((source as { cronJobs: unknown[] }).cronJobs ?? [])
      : [];

  return jobs.map((job): CronJobRecord => {
    const safeJob = job && typeof job === 'object' ? (job as Record<string, unknown>) : {};

    return {
      name: ensureString(safeJob.name),
      schedule: ensureString(safeJob.schedule, 'not configured'),
      enabled: Boolean(safeJob.enabled),
      nextRun: ensureString(safeJob.nextRun, 'unknown'),
      lastRunStatus: ensureString(safeJob.lastRunStatus, 'never-run')
    };
  });
}

async function getActivity(): Promise<ActivityRecord[]> {
  const source = await readJson('apps/ops-dashboard/data/activity.json');
  const rows =
    source && typeof source === 'object' && Array.isArray((source as { activity?: unknown }).activity)
      ? ((source as { activity: unknown[] }).activity ?? [])
      : [];

  return rows.map((row): ActivityRecord => {
    const safeRow = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};

    return {
      agentId: ensureString(safeRow.agentId),
      lastKnownAction: ensureString(safeRow.lastKnownAction, 'no activity captured'),
      updatedAt: ensureString(safeRow.updatedAt, 'unknown')
    };
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const [agents, cronJobs, activity] = await Promise.all([getAgents(), getCronJobs(), getActivity()]);

  return {
    agents,
    cronJobs,
    activity
  };
}
