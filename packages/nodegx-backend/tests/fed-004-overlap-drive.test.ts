/**
 * FED-004 — the overlap policy on a REAL backend, over real HTTP.
 *
 * `fed-004-overlap.test.ts` grades the decision against a stand-in dispatcher
 * on a fake clock, which is the only way to run four minutes of a minutely
 * schedule in half a second. What it cannot grade is everything the decision
 * touches on the way out: the execution record, its disposition, the id it
 * names, the trigger's own counters, and the fact that none of it is reported
 * as a failure. That is this file, and every piece of it here is the real one —
 * `TriggerRegistry`, `TriggerDispatcher`, `WorkflowRunner`, the execution store,
 * and the admin routes.
 *
 * ## How four minutes are compressed without a fake clock
 *
 * The cron path needs a minute to say anything, so this drive does not use it.
 * It uses the OTHER door into `requestFire`, which is the catch-up fire: a
 * `run-once-on-start` schedule whose `lastFiredAt` is in the past fires once
 * the moment the scheduler arms, and `reschedule()` re-arms. So:
 *
 *   - starting the service arms it → catch-up fire → the slow function runs;
 *   - `POST /admin/triggers/:id/enabled` calls `reschedule()` → re-arm → another
 *     catch-up fire is DUE (the first run has not finished, so `lastFiredAt` is
 *     still stale) → and that fire is the one the policy has to decide about.
 *
 * Every fire is a real dispatch attempt at a real target through the real
 * scheduler. Nothing here is stubbed and nothing is advanced by hand.
 *
 * The slow function is CWF-018's shape — a graph whose Response node is never
 * reached, bounded by a per-function `timeoutMs`. It is the most honest "takes a
 * while" a cloud function has: no timer node is needed, and the duration is
 * declared in `security.json` where an operator can read it.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { SKIPPED_OVERLAP } from '../src/triggers/dispatcher';
import type { TriggerDef } from '../src/triggers/registry';

import { httpClient } from './helpers/http';

jest.setTimeout(30000);

/** How long one run of `poll` takes: its graph never answers, so its timeout is its duration. */
const RUN_MS = 1500;

/** CWF-018's `hangs` graph under a feed-shaped name. */
const poll = {
  name: '/#__cloud__/poll',
  nodes: [
    { id: 'req-p', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] },
    { id: 'res-p', type: 'noodl.cloud.response', x: 0, y: 200, parameters: {}, ports: [], children: [] }
  ],
  connections: [],
  roots: []
};

const SECURITY = {
  version: 1,
  devOpen: true,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: true
  },
  collections: {},
  functions: { poll: { timeoutMs: RUN_MS } },
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

const TRIGGER_ID = 'trg_fed004';

interface ExecutionRow {
  id: string;
  workflowId: string;
  status: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface TriggerBody {
  trigger: TriggerDef;
}

/**
 * The trigger, written straight into `triggers.json` before the service boots.
 *
 * `lastFiredAt` in the past is what makes the catch-up fire due — the registry
 * owns `status` and there is no API that backdates it, which is correct and is
 * why this is a file rather than a POST.
 */
function triggersFile(overlapPolicy: string | undefined): string {
  return (
    JSON.stringify(
      {
        version: 1,
        maxChangeDepth: 1,
        triggers: [
          {
            id: TRIGGER_ID,
            type: 'schedule',
            name: 'Poll the feeds',
            enabled: true,
            target: { kind: 'function', name: 'poll' },
            schedule: {
              cron: '0 * * * *',
              missedFirePolicy: 'run-once-on-start',
              ...(overlapPolicy ? { overlapPolicy } : {})
            },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            status: { lastFiredAt: '2026-01-01T00:00:00.000Z', nextFireAt: null, lastResult: null, fireCount: 1 }
          }
        ]
      },
      null,
      2
    ) + '\n'
  );
}

/** One provisioned backend, torn down by the caller. */
async function provision(overlapPolicy: string | undefined) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-fed004d-'));
  fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(SECURITY));
  fs.writeFileSync(path.join(dataDir, 'triggers.json'), triggersFile(overlapPolicy));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'workflows', 'main.workflow.json'),
    JSON.stringify({ components: [poll], settings: {}, metadata: {} })
  );

  const service = new BackendService({ dataDir, port: 0, backendId: 'fed004', backendName: 'FED-004' });
  const base = (await service.start()).listen.url;
  const adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  const client = httpClient(() => base);
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });

  /** Re-arm the scheduler through the admin surface: one more catch-up fire attempt. */
  const refire = async (): Promise<void> => {
    const res = await client.request('POST', `/admin/triggers/${TRIGGER_ID}/enabled`, {
      body: { enabled: true },
      headers: asAdmin()
    });
    expect(res.status).toBe(200);
  };

  const rows = async (): Promise<ExecutionRow[]> => {
    const res = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=poll', { headers: asAdmin() });
    expect(res.status).toBe(200);
    return res.json;
  };

  const trigger = async (): Promise<TriggerDef> => {
    const res = await client.request<TriggerBody>('GET', `/admin/triggers/${TRIGGER_ID}`, { headers: asAdmin() });
    expect(res.status).toBe(200);
    return res.json.trigger;
  };

  const teardown = async (): Promise<void> => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  };

  return { client, asAdmin, refire, rows, trigger, teardown, dataDir };
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('FED-004 the overlap policy, driven on a provisioned backend', () => {
  it('skip: three re-arms during one slow run leave ONE run and three skipped-overlap records naming it', async () => {
    const be = await provision('skip');
    try {
      // The boot fire is in flight. Three more fires are due and every one of
      // them arrives while it is still going.
      await be.refire();
      await be.refire();
      await be.refire();

      // Let the run reach its own timeout and be recorded.
      await settle(RUN_MS + 1200);

      const all = await be.rows();
      const ran = all.filter((r) => (r.metadata || {}).disposition !== SKIPPED_OVERLAP);
      const skipped = all.filter((r) => (r.metadata || {}).disposition === SKIPPED_OVERLAP);

      expect(ran.length).toBe(1);
      expect(skipped.length).toBe(3);

      // AC1's sentence: each skip names the run it yielded to, and that is a
      // real execution id in this same store — not a label that looks like one.
      const runId = ran[0].id;
      for (const row of skipped) {
        expect((row.metadata || {}).yieldedTo).toBe(runId);
        expect((row.metadata || {}).overlapPolicy).toBe('skip');
        expect((row.metadata || {}).triggerId).toBe(TRIGGER_ID);
        // 🔴 A skip is the policy WORKING. A row coloured red here is how an
        // operator learns to stop reading this column.
        expect(row.status).not.toBe('error');
      }

      // The trigger's own counters say the same thing in the other vocabulary:
      // one fire, three skips, and a last RESULT that describes the run.
      const t = await be.trigger();
      expect(t.status.skipCount).toBe(3);
      expect(t.status.lastSkip).toMatchObject({ policy: 'skip', yieldedTo: runId });
      expect(t.status.fireCount).toBe(2); // the one before boot, plus this run
      expect(t.schedule!.overlapPolicy).toBe('skip');
    } finally {
      await be.teardown();
    }
  });

  it('allow: the same three re-arms during the same slow run start three more runs, and nothing is skipped', async () => {
    const be = await provision('allow');
    try {
      await be.refire();
      await be.refire();
      await be.refire();
      await settle(RUN_MS + 1500);

      const all = await be.rows();
      const skipped = all.filter((r) => (r.metadata || {}).disposition === SKIPPED_OVERLAP);
      const ran = all.filter((r) => (r.metadata || {}).disposition !== SKIPPED_OVERLAP);

      // The control that makes the case above a measurement of the POLICY: one
      // word changed, four runs instead of one, and no skip to be seen.
      expect(skipped).toEqual([]);
      expect(ran.length).toBe(4);

      const t = await be.trigger();
      expect(t.status.skipCount).toBeUndefined();
      expect(t.status.lastSkip).toBeUndefined();
    } finally {
      await be.teardown();
    }
  });

  it('an unauthored policy behaves as skip — and `triggers.json` still carries no such key', async () => {
    const be = await provision(undefined);
    try {
      await be.refire();
      await settle(RUN_MS + 1200);

      const all = await be.rows();
      expect(all.filter((r) => (r.metadata || {}).disposition === SKIPPED_OVERLAP).length).toBe(1);

      // The file the operator reads is unchanged by the default being applied:
      // a diff of triggers.json shows decisions, not defaults.
      const onDisk = JSON.parse(fs.readFileSync(path.join(be.dataDir, 'triggers.json'), 'utf-8'));
      expect('overlapPolicy' in onDisk.triggers[0].schedule).toBe(false);
    } finally {
      await be.teardown();
    }
  });

  it('a MANUAL test fire is never blocked by the policy — a person pressing run is not a schedule', async () => {
    const be = await provision('skip');
    try {
      // The boot run is in flight, so the schedule itself would refuse right
      // now. A human asking for one anyway gets one.
      const res = await be.client.request('POST', `/admin/triggers/${TRIGGER_ID}/fire`, {
        body: {},
        headers: be.asAdmin()
      });
      expect(res.status).toBe(200);

      await settle(RUN_MS + 1500);
      const all = await be.rows();
      expect(all.filter((r) => (r.metadata || {}).disposition === SKIPPED_OVERLAP)).toEqual([]);
      expect(all.length).toBe(2);
    } finally {
      await be.teardown();
    }
  });

  it('refuses a policy word it does not implement rather than defaulting it', async () => {
    const be = await provision('skip');
    try {
      const res = await be.client.request<{ error?: string }>('PUT', `/admin/triggers/${TRIGGER_ID}`, {
        body: {
          type: 'schedule',
          target: { kind: 'function', name: 'poll' },
          schedule: { cron: '0 * * * *', missedFirePolicy: 'skip', overlapPolicy: 'queue' }
        },
        headers: be.asAdmin()
      });
      expect(res.status).toBe(400);
      expect(String(res.json.error)).toContain('overlapPolicy');
      // Unchanged — a refused edit changes nothing.
      expect((await be.trigger()).schedule!.overlapPolicy).toBe('skip');
    } finally {
      await be.teardown();
    }
  });
});
