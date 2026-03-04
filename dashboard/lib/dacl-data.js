import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '..');

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function loadAgents() {
  const configDir = path.join(repoRoot, 'agents', 'config');
  const metadataDir = path.join(repoRoot, 'agents', 'metadata');

  if (!fs.existsSync(configDir)) return [];

  return fs
    .readdirSync(configDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const config = readJsonSafe(path.join(configDir, file), {});
      const metadataFile = config.metadataFile
        ? path.join(repoRoot, config.metadataFile)
        : path.join(metadataDir, `${config.agentId || file.replace('.json', '')}.json`);
      const metadata = readJsonSafe(metadataFile, {});

      return {
        agentId: config.agentId || file.replace('.json', ''),
        role: config.role || 'unknown',
        responsibilities: Array.isArray(config.responsibilities) ? config.responsibilities : [],
        worktree: config.worktree || metadata.worktreePath || null,
        wallet: metadata.wallet?.pubkey || null,
        health: metadata.wallet?.pubkey ? 'healthy' : 'degraded'
      };
    })
    .sort((a, b) => a.agentId.localeCompare(b.agentId));
}

export function loadCronJobs() {
  const cronPath = path.join(repoRoot, 'agents', 'config', 'cron-jobs.json');
  const raw = readJsonSafe(cronPath, []);
  if (!Array.isArray(raw)) return [];

  return raw.map((job) => ({
    name: job.name || 'unnamed-job',
    enabled: Boolean(job.enabled),
    interval: job.interval || job.schedule || 'n/a',
    nextRun: job.nextRun || 'unknown',
    lastRunStatus: job.lastRunStatus || 'unknown'
  }));
}
