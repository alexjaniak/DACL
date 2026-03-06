import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
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
const runlogsRoot = path.join(repoRoot, 'agents/runlogs');

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

function parseRunlogTimestamp(content: string, date: string, fileName: string, mtime: Date): string {
  const fromField = content.match(/^-\s*timestamp_utc:\s*(.+)$/m)?.[1]?.trim();
  if (fromField) return fromField;

  const fromHeader = content.match(/^# .*—\s*([^\n]+)$/m)?.[1]?.trim();
  if (fromHeader) return fromHeader;

  const fromName = fileName.match(/^(\d{2})(\d{2})(\d{2})Z\.md$/);
  if (fromName) return `${date}T${fromName[1]}:${fromName[2]}:${fromName[3]}Z`;

  return mtime.toISOString();
}

function parseRunlogPreview(content: string): string {
  const cleaned = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  const firstBullet = cleaned.find((line) => line.startsWith('-'));
  return firstBullet ? firstBullet.replace(/^-\s*/, '') : 'Runlog recorded.';
}

async function getRunlogs(): Promise<AgentRunlogHistory[]> {
  let agentDirs: Dirent[] = [];
  try {
    agentDirs = await fs.readdir(runlogsRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  const histories = await Promise.all(
    agentDirs
      .filter((dir) => dir.isDirectory())
      .map(async (agentDir): Promise<AgentRunlogHistory> => {
        const agentId = agentDir.name;
        const agentPath = path.join(runlogsRoot, agentId);
        let parseErrors = 0;
        const entries: RunlogEntry[] = [];

        let dateDirs: Dirent[] = [];
        try {
          dateDirs = await fs.readdir(agentPath, { withFileTypes: true });
        } catch {
          return { agentId, latest: null, byDate: [], parseErrors: 1 };
        }

        for (const dateDir of dateDirs.filter((dir) => dir.isDirectory())) {
          const date = dateDir.name;
          const datePath = path.join(agentPath, date);
          let files: Dirent[] = [];

          try {
            files = await fs.readdir(datePath, { withFileTypes: true });
          } catch {
            parseErrors += 1;
            continue;
          }

          for (const file of files.filter((f) => f.isFile() && f.name.endsWith('.md'))) {
            const filePath = path.join(datePath, file.name);
            try {
              const [content, stat] = await Promise.all([fs.readFile(filePath, 'utf8'), fs.stat(filePath)]);
              const timestamp = parseRunlogTimestamp(content, date, file.name, stat.mtime);
              entries.push({
                id: `${agentId}:${date}:${file.name}`,
                timestamp,
                preview: parseRunlogPreview(content),
                path: path.relative(repoRoot, filePath)
              });
            } catch {
              parseErrors += 1;
            }
          }
        }

        const sorted = entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const byDateMap = new Map<string, RunlogEntry[]>();
        for (const entry of sorted) {
          const day = entry.timestamp.slice(0, 10);
          byDateMap.set(day, [...(byDateMap.get(day) ?? []), entry]);
        }

        return {
          agentId,
          latest: sorted[0] ?? null,
          byDate: [...byDateMap.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, dayEntries]) => ({ date, entries: dayEntries })),
          parseErrors
        };
      })
  );

  return histories.sort((a, b) => a.agentId.localeCompare(b.agentId));
}

async function getCronJobs(errors: string[]): Promise<CronJobRecord[]> {
  const source = await readJsonSafe('cron/jobs.json', errors);
  const sourceObj = asObject(source);
  const jobs = Array.isArray(sourceObj?.jobs) ? (sourceObj.jobs as unknown[]) : [];

  return jobs.map((job): CronJobRecord => {
    const safeJob = asObject(job) ?? {};
    return {
      name: ensureString(safeJob.name),
      schedule: ensureString(safeJob.every, 'not configured'),
      enabled: Boolean(safeJob.enabled),
      nextRun: 'Managed by OpenClaw runtime',
      lastRunStatus: 'See runlog panel for latest execution output'
    };
  });
}

function getActivity(runlogs: AgentRunlogHistory[]): ActivityRecord[] {
  return runlogs
    .map((history) => ({
      agentId: history.agentId,
      lastKnownAction: history.latest?.preview ?? 'No activity captured yet',
      updatedAt: history.latest?.timestamp ?? 'unknown'
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDashboardData(): Promise<DashboardData> {
  const errors: string[] = [];
  const [agents, cronJobs, runlogs] = await Promise.all([getAgents(errors), getCronJobs(errors), getRunlogs()]);

  return {
    agents,
    cronJobs,
    activity: getActivity(runlogs),
    runlogs,
    generatedAt: new Date().toISOString(),
    errors
  };
}
