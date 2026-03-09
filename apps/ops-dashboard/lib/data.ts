import fs from 'node:fs/promises';
import path from 'node:path';
import type { Agent, DashboardData, LogChunk } from './types';

const repoRoot = path.resolve(process.cwd(), '..', '..');
const cronJobsPath = path.join(repoRoot, 'agent-kernel/cron/cron-jobs.json');
const logsDir = path.join(repoRoot, 'agent-kernel/logs');

type CronJobEntry = {
  id?: unknown;
  interval?: unknown;
  prompt?: unknown;
  contexts?: unknown;
  agentic?: unknown;
  workspace?: unknown;
};

function inferRole(contexts: string[]): 'planner' | 'worker' | 'unknown' {
  if (contexts.some((c) => c.includes('PLANNER.md'))) return 'planner';
  if (contexts.some((c) => c.includes('WORKER.md'))) return 'worker';
  return 'unknown';
}

function parseIntervalMs(interval: string): number | null {
  const match = interval.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 0);
}

async function getLogMtime(agentId: string): Promise<Date | null> {
  try {
    const stat = await fs.stat(path.join(logsDir, `${agentId}.log`));
    return stat.mtime;
  } catch {
    return null;
  }
}

export async function getAgents(): Promise<Agent[]> {
  const content = await fs.readFile(cronJobsPath, 'utf8');
  const parsed = JSON.parse(content) as { jobs?: CronJobEntry[] };
  const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];

  const agents: Agent[] = await Promise.all(
    jobs.map(async (job) => {
      const id = typeof job.id === 'string' ? job.id : 'unknown';
      const contexts = Array.isArray(job.contexts)
        ? job.contexts.filter((c): c is string => typeof c === 'string')
        : [];
      const interval = typeof job.interval === 'string' ? job.interval : 'unknown';

      const mtime = await getLogMtime(id);
      const lastRun = mtime ? mtime.toISOString() : null;

      let nextRun: string | null = null;
      if (lastRun) {
        const intervalMs = parseIntervalMs(interval);
        if (intervalMs) {
          nextRun = new Date(mtime!.getTime() + intervalMs).toISOString();
        }
      }

      return {
        id,
        role: inferRole(contexts),
        interval,
        agentic: Boolean(job.agentic),
        workspace: Boolean(job.workspace),
        contexts,
        lastRun,
        nextRun,
      };
    })
  );

  return agents;
}

export async function getDashboardData(): Promise<DashboardData> {
  const agents = await getAgents();
  return {
    agents,
    updatedAt: new Date().toISOString(),
  };
}

export async function agentExists(agentId: string): Promise<boolean> {
  const content = await fs.readFile(cronJobsPath, 'utf8');
  const parsed = JSON.parse(content) as { jobs?: CronJobEntry[] };
  const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
  return jobs.some((job) => job.id === agentId);
}

export async function getAgentLog(agentId: string, lines: number = 100): Promise<LogChunk> {
  const logPath = path.join(logsDir, `${agentId}.log`);

  try {
    await fs.access(logPath);
  } catch {
    return { agentId, lines: [], totalLines: 0, lastModified: null };
  }

  const content = await fs.readFile(logPath, 'utf8');
  const allLines = content.split('\n');
  const totalLines = allLines.length;

  let stat: { mtime: Date } | null = null;
  try {
    stat = await fs.stat(logPath);
  } catch {
    // ignore
  }

  return {
    agentId,
    lines: allLines.slice(-lines),
    totalLines,
    lastModified: stat ? stat.mtime.toISOString() : null,
  };
}
