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

function str(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function inferRole(contexts: string[]): "planner" | "worker" | "unknown" {
  if (contexts.some((c) => c.includes('PLANNER.md'))) return 'planner';
  if (contexts.some((c) => c.includes('WORKER.md'))) return 'worker';
  return 'unknown';
}

function parseIntervalMs(interval: string): number | null {
  const match = interval.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
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
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const jobs = Array.isArray(parsed.jobs) ? (parsed.jobs as CronJobEntry[]) : [];

  const agents: Agent[] = await Promise.all(
    jobs.map(async (job) => {
      const contexts = strArray(job.contexts);
      const id = str(job.id);
      const interval = str(job.interval, 'not set');
      const mtime = await getLogMtime(id);
      const lastRun = mtime ? mtime.toISOString() : null;
      const intervalMs = parseIntervalMs(interval);
      const nextRun = lastRun && intervalMs ? new Date(mtime!.getTime() + intervalMs).toISOString() : null;

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
  return {
    agents: await getAgents(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getAgentLog(agentId: string, lines = 100): Promise<LogChunk> {
  const logPath = path.join(logsDir, `${agentId}.log`);

  try {
    const [content, stat] = await Promise.all([
      fs.readFile(logPath, 'utf8'),
      fs.stat(logPath),
    ]);
    const allLines = content.split('\n');
    // Remove trailing empty line from split
    if (allLines.length > 0 && allLines[allLines.length - 1] === '') {
      allLines.pop();
    }
    return {
      agentId,
      lines: allLines.slice(-lines),
      totalLines: allLines.length,
      lastModified: stat.mtime.toISOString(),
    };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return { agentId, lines: [], totalLines: 0, lastModified: null };
    }
    throw err;
  }
}
