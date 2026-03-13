import path from "path";

/**
 * Resolve the repo root from which all data files are located.
 * Defaults to two levels up from apps/web/ (the repo root).
 */
export function getForgeRoot(): string {
  return (
    process.env.FORGE_REPO_ROOT || path.resolve(process.cwd(), "../..")
  );
}

export function cronJobsPath(): string {
  return path.join(getForgeRoot(), "agent-kernel/cron/cron-jobs.json");
}

export function cronStatePath(): string {
  return path.join(getForgeRoot(), "agent-kernel/cron/cron-state.json");
}

export function lockFilePath(agentId: string): string {
  return path.join(getForgeRoot(), `.worktrees/${agentId}/.agent.lock`);
}

export function agentLogPath(agentId: string): string {
  return path.join(getForgeRoot(), `agent-kernel/logs/${agentId}.log`);
}

export function logsDir(): string {
  return path.join(getForgeRoot(), "agent-kernel/logs");
}

export function eventsPath(): string {
  return path.join(getForgeRoot(), "events.jsonl");
}

export function managePyPath(): string {
  return path.join(getForgeRoot(), "agent-kernel/cron/manage.py");
}

export function runShPath(): string {
  return path.join(getForgeRoot(), "agent-kernel/run.sh");
}
