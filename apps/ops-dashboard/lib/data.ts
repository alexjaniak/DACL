import fs from 'node:fs/promises';
import path from 'node:path';

export type AgentRecord = {
  id: string;
  role: string;
  interval: string;
  agentic: boolean;
  workspace: boolean;
};

export type CronJobRecord = {
  name: string;
  interval: string;
  prompt: string;
  contexts: string[];
  agentic: boolean;
  workspace: boolean;
};

export type ActivityRecord = {
  agentId: string;
  lastKnownAction: string;
  updatedAt: string;
};

export type RunlogEntry = {
  id: string;
  timestamp: string;
  preview: string;
  path: string;
};

export type AgentRunlogHistory = {
  agentId: string;
  latest: RunlogEntry | null;
  byDate: {
    date: string;
    entries: RunlogEntry[];
  }[];
  parseErrors: number;
};

export type DashboardData = {
  agents: AgentRecord[];
  cronJobs: CronJobRecord[];
  activity: ActivityRecord[];
  runlogs: AgentRunlogHistory[];
  generatedAt: string;
  errors: string[];
};

const repoRoot = path.resolve(process.cwd(), '..', '..');
const cronJobsPath = path.join(repoRoot, 'agent-kernel/cron/cron-jobs.json');

type CronJobEntry = {
  id?: unknown;
  interval?: unknown;
  prompt?: unknown;
  contexts?: unknown;
  agentic?: unknown;
  workspace?: unknown;
};

function ensureString(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function inferRole(contexts: string[]): string {
  if (contexts.some((c) => c.includes('PLANNER.md'))) return 'planner';
  if (contexts.some((c) => c.includes('WORKER.md'))) return 'worker';
  return 'unknown';
}

async function readCronJobs(errors: string[]): Promise<CronJobEntry[]> {
  try {
    const content = await fs.readFile(cronJobsPath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      return Array.isArray(obj.jobs) ? (obj.jobs as CronJobEntry[]) : [];
    }
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    errors.push(`agent-kernel/cron/cron-jobs.json: ${message}`);
    return [];
  }
}

function getAgents(jobs: CronJobEntry[]): AgentRecord[] {
  return jobs.map((job) => {
    const contexts = ensureStringArray(job.contexts);
    return {
      id: ensureString(job.id),
      role: inferRole(contexts),
      interval: ensureString(job.interval, 'not set'),
      agentic: Boolean(job.agentic),
      workspace: Boolean(job.workspace),
    };
  });
}

function getCronJobs(jobs: CronJobEntry[]): CronJobRecord[] {
  return jobs.map((job) => ({
    name: ensureString(job.id),
    interval: ensureString(job.interval, 'not set'),
    prompt: ensureString(job.prompt, ''),
    contexts: ensureStringArray(job.contexts),
    agentic: Boolean(job.agentic),
    workspace: Boolean(job.workspace),
  }));
}

function getRunlogs(): AgentRunlogHistory[] {
  // Structured runlog directory (agents/runlogs/<id>/<date>/*.md) does not exist yet.
  // Return empty array — the UI shows a graceful empty state.
  return [];
}

function getActivity(): ActivityRecord[] {
  // Activity is derived from runlogs, which are not yet available.
  return [];
}

export async function getDashboardData(): Promise<DashboardData> {
  const errors: string[] = [];
  const jobs = await readCronJobs(errors);

  return {
    agents: getAgents(jobs),
    cronJobs: getCronJobs(jobs),
    activity: getActivity(),
    runlogs: getRunlogs(),
    generatedAt: new Date().toISOString(),
    errors,
  };
}
