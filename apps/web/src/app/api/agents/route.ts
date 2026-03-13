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
      interval?: string;
      last_run?: string;
      stagger_offset?: number;
      installed_at?: string;
      contexts?: string[];
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
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "EPERM") {
      return true;
    }
    return false;
  }
}

function inferRole(contexts: string[]): string {
  return contexts.some((c) => c.includes("PLANNER.md"))
    ? "planner"
    : "worker";
}

function buildAgentFromJob(
  job: CronJob,
  jobState: CronState["jobs"][string] | undefined,
  status: "staged" | "active" | "modified" | "orphan",
  stagedInterval?: string
) {
  const intervalSeconds = parseIntervalSeconds(job.interval);
  const lastRun = jobState?.last_run ?? null;

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
    staggerOffset: jobState?.stagger_offset ?? 0,
    prompt: job.prompt,
    contexts: job.contexts,
    agentic: job.agentic,
    workspace: job.workspace,
    repo: job.repo ?? "",
    status,
    ...(stagedInterval ? { stagedInterval } : {}),
  };
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
  let hasState = false;
  try {
    const raw = fs.readFileSync(cronStatePath(), "utf-8");
    state = JSON.parse(raw);
    hasState = true;
  } catch {
    // no state file yet
  }

  const stagedIds = new Set(jobs.map((j) => j.id));
  const activeIds = new Set(Object.keys(state.jobs ?? {}));

  const agents = jobs.map((job) => {
    const jobState = state.jobs?.[job.id];
    const inState = activeIds.has(job.id);

    if (!hasState || !inState) {
      return buildAgentFromJob(job, undefined, "staged");
    }

    const activeInterval = jobState?.interval;
    if (activeInterval && activeInterval !== job.interval) {
      // interval field shows the active (running) interval
      // stagedInterval shows what it will change to on next apply
      const modifiedJob = { ...job, interval: activeInterval };
      return buildAgentFromJob(modifiedJob, jobState, "modified", job.interval);
    }

    return buildAgentFromJob(job, jobState, "active");
  });

  // Add orphan agents (in state but not in staged config)
  for (const id of activeIds) {
    if (!stagedIds.has(id)) {
      const jobState = state.jobs[id];
      const orphanJob: CronJob = {
        id,
        interval: jobState.interval ?? "?",
        prompt: "",
        contexts: jobState.contexts ?? [],
        agentic: false,
        workspace: false,
      };
      agents.push(buildAgentFromJob(orphanJob, jobState, "orphan"));
    }
  }

  return NextResponse.json({ agents });
}
