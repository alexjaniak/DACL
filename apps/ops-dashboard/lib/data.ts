import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
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
};

const repoRoot = path.resolve(process.cwd(), '..', '..');
const runlogsRoot = path.join(repoRoot, 'agents/runlogs');

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

export async function getDashboardData(): Promise<DashboardData> {
  const [agents, cronJobs, activity, runlogs] = await Promise.all([getAgents(), getCronJobs(), getActivity(), getRunlogs()]);

  return {
    agents,
    cronJobs,
    activity,
    runlogs
  };
}
