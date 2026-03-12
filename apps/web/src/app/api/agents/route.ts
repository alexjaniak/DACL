import { NextResponse } from "next/server";
import fs from "fs";
import {
  cronJobsPath,
  cronStatePath,
  lockFilePath,
} from "@/lib/paths";

interface CronJob {
  id: string;
  interval: string;
  prompt: string;
  contexts: string[];
  agentic: boolean;
  workspace: boolean;
  enabled?: boolean;
  repo?: string;
}

interface CronState {
  jobs: Record<
    string,
    {
      last_run?: string;
      stagger_offset?: number;
      installed_at?: string;
    }
  >;
}

function parseIntervalSeconds(interval: string): number {
  const match = interval.match(/^(\d+)(s|m|h)$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    default:
      return 0;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function inferRole(contexts: string[]): string {
  return contexts.some((c) => c.includes("PLANNER.md"))
    ? "planner"
    : "worker";
}

export async function GET() {
  let jobs: CronJob[] = [];
  try {
    const raw = fs.readFileSync(cronJobsPath(), "utf-8");
    jobs = JSON.parse(raw).jobs ?? [];
  } catch {
    return NextResponse.json({ agents: [] });
  }

  let state: CronState = { jobs: {} };
  try {
    const raw = fs.readFileSync(cronStatePath(), "utf-8");
    state = JSON.parse(raw);
  } catch {
    // no state file yet
  }

  const agents = jobs.map((job) => {
    const jobState = state.jobs?.[job.id] ?? {};
    const intervalSeconds = parseIntervalSeconds(job.interval);
    const lastRun = jobState.last_run ?? null;

    let running = false;
    try {
      const lockContent = fs.readFileSync(lockFilePath(job.id), "utf-8").trim();
      const pid = parseInt(lockContent, 10);
      if (!isNaN(pid)) {
        running = isProcessAlive(pid);
      }
    } catch {
      // no lock file
    }

    let nextRun: string | null = null;
    let overdue = false;
    if (lastRun) {
      const nextRunDate = new Date(
        new Date(lastRun).getTime() + intervalSeconds * 1000
      );
      nextRun = nextRunDate.toISOString();
      overdue = !running && new Date() > nextRunDate;
    }

    return {
      id: job.id,
      role: inferRole(job.contexts),
      interval: job.interval,
      intervalSeconds,
      enabled: job.enabled !== false,
      lastRun,
      nextRun,
      running,
      overdue,
      staggerOffset: jobState.stagger_offset ?? 0,
      prompt: job.prompt,
      contexts: job.contexts,
      agentic: job.agentic,
      workspace: job.workspace,
      repo: job.repo ?? "",
    };
  });

  return NextResponse.json({ agents });
}
