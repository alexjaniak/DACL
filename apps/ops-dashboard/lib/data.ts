import fs from 'node:fs/promises';
import path from 'node:path';

export type AgentRecord = {
  id: string;
  role: string;
  operativeFile: string;
  worktree: string;
  worktreePath: string;
  walletNetwork: string;
  walletPubkey: string;
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
  errors: string[];
};

const repoRoot = path.resolve(process.cwd(), '..', '..');

type RegistryAgent = {
  agentId?: unknown;
  role?: unknown;
  operative?: unknown;
  config?: unknown;
};

type AgentConfig = {
  operativeFile?: unknown;
  worktree?: unknown;
  worktreePath?: unknown;
  wallet?: {
    network?: unknown;
    pubkey?: unknown;
  };
};

async function readJson(relativePath: string): Promise<unknown> {
  const filePath = path.join(repoRoot, relativePath);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as unknown;
}

async function readJsonSafe(relativePath: string, errors: string[]): Promise<unknown | null> {
  try {
    return await readJson(relativePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    errors.push(`${relativePath}: ${message}`);
    return null;
  }
}

function ensureString(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function deriveStatusSummary(config: AgentConfig | null): string {
  if (!config) return 'Config unavailable';

  const hasWorktree = typeof config.worktree === 'string' && config.worktree.trim().length > 0;
  const hasOperative = typeof config.operativeFile === 'string' && config.operativeFile.trim().length > 0;
  const walletObject = asObject(config.wallet);
  const hasWallet = Boolean(walletObject && typeof walletObject.pubkey === 'string' && walletObject.pubkey.trim().length > 0);

  if (hasWorktree && hasOperative && hasWallet) return 'Ready';
  if (hasWorktree || hasOperative || hasWallet) return 'Partial config';
  return 'Config missing fields';
}

async function getAgents(errors: string[]): Promise<AgentRecord[]> {
  const registry = await readJsonSafe('agents/registry.json', errors);
  const registryObject = asObject(registry);
  const registryAgents = Array.isArray(registryObject?.agents) ? (registryObject.agents as unknown[]) : [];

  return Promise.all(
    registryAgents.map(async (entry): Promise<AgentRecord> => {
      const safeAgent = asObject(entry) as RegistryAgent | null;
      const agentId = ensureString(safeAgent?.agentId);
      const role = ensureString(safeAgent?.role);
      const configPath = ensureString(safeAgent?.config, '');
      const fallbackOperative = ensureString(safeAgent?.operative, 'not provided');

      let config: AgentConfig | null = null;
      if (configPath) {
        const rawConfig = await readJsonSafe(configPath, errors);
        config = asObject(rawConfig) as AgentConfig | null;
      }

      const wallet = asObject(config?.wallet);

      return {
        id: agentId,
        role,
        operativeFile: ensureString(config?.operativeFile, fallbackOperative),
        worktree: ensureString(config?.worktree, 'not configured'),
        worktreePath: ensureString(config?.worktreePath, 'not configured'),
        walletNetwork: ensureString(wallet?.network, 'unknown'),
        walletPubkey: ensureString(wallet?.pubkey, 'not configured'),
        statusSummary: deriveStatusSummary(config)
      };
    })
  );
}

async function getCronJobs(errors: string[]): Promise<CronJobRecord[]> {
  const source = await readJsonSafe('apps/ops-dashboard/data/cron-jobs.json', errors);
  const sourceObj = asObject(source);
  const jobs = Array.isArray(sourceObj?.cronJobs) ? (sourceObj.cronJobs as unknown[]) : [];

  return jobs.map((job): CronJobRecord => {
    const safeJob = asObject(job) ?? {};

    return {
      name: ensureString(safeJob.name),
      schedule: ensureString(safeJob.schedule, 'not configured'),
      enabled: Boolean(safeJob.enabled),
      nextRun: ensureString(safeJob.nextRun, 'unknown'),
      lastRunStatus: ensureString(safeJob.lastRunStatus, 'never-run')
    };
  });
}

async function getActivity(errors: string[]): Promise<ActivityRecord[]> {
  const source = await readJsonSafe('apps/ops-dashboard/data/activity.json', errors);
  const sourceObj = asObject(source);
  const rows = Array.isArray(sourceObj?.activity) ? (sourceObj.activity as unknown[]) : [];

  return rows.map((row): ActivityRecord => {
    const safeRow = asObject(row) ?? {};

    return {
      agentId: ensureString(safeRow.agentId),
      lastKnownAction: ensureString(safeRow.lastKnownAction, 'no activity captured'),
      updatedAt: ensureString(safeRow.updatedAt, 'unknown')
    };
  });
}

export async function getDashboardData(): Promise<DashboardData> {
  const errors: string[] = [];
  const [agents, cronJobs, activity] = await Promise.all([getAgents(errors), getCronJobs(errors), getActivity(errors)]);

  return {
    agents,
    cronJobs,
    activity,
    errors
  };
}
