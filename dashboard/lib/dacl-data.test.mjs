import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createDataLoaders } from './dacl-data.js';

function withTempRepo(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dacl-dashboard-test-'));
  try {
    fs.mkdirSync(path.join(root, 'agents', 'config'), { recursive: true });
    fs.mkdirSync(path.join(root, 'agents', 'metadata'), { recursive: true });
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('loadAgents merges config and metadata with safe fallbacks', () => {
  withTempRepo((root) => {
    fs.writeFileSync(
      path.join(root, 'agents', 'config', 'zeta.json'),
      JSON.stringify({ agentId: 'zeta', role: 'builder', responsibilities: ['ship'] })
    );
    fs.writeFileSync(
      path.join(root, 'agents', 'metadata', 'zeta.json'),
      JSON.stringify({ wallet: { pubkey: 'WALLET123' }, worktreePath: '/tmp/zeta' })
    );

    fs.writeFileSync(path.join(root, 'agents', 'config', 'alpha.json'), '{ invalid json');

    const { loadAgents } = createDataLoaders(root);
    const agents = loadAgents();

    assert.equal(agents.length, 2);
    assert.deepEqual(agents.map((a) => a.agentId), ['alpha', 'zeta']);

    assert.equal(agents[0].role, 'unknown');
    assert.equal(agents[0].health, 'degraded');

    assert.equal(agents[1].wallet, 'WALLET123');
    assert.equal(agents[1].worktree, '/tmp/zeta');
    assert.equal(agents[1].health, 'healthy');
  });
});

test('loadCronJobs normalizes defaults and supports schedule alias', () => {
  withTempRepo((root) => {
    fs.writeFileSync(
      path.join(root, 'agents', 'config', 'cron-jobs.json'),
      JSON.stringify([
        { name: 'nightly', enabled: true, interval: '24h', nextRun: 'tomorrow', lastRunStatus: 'ok' },
        { schedule: '5m' }
      ])
    );

    const { loadCronJobs } = createDataLoaders(root);
    const jobs = loadCronJobs();

    assert.equal(jobs.length, 2);
    assert.deepEqual(jobs[0], {
      name: 'nightly',
      enabled: true,
      interval: '24h',
      nextRun: 'tomorrow',
      lastRunStatus: 'ok'
    });
    assert.deepEqual(jobs[1], {
      name: 'unnamed-job',
      enabled: false,
      interval: '5m',
      nextRun: 'unknown',
      lastRunStatus: 'unknown'
    });
  });
});
