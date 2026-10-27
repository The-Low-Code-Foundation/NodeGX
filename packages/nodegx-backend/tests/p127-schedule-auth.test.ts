/**
 * P127-BKO006-SCHEDULEAUTH — a run the app starts itself counts as the app.
 *
 * BKO-006's book club: a Monday schedule ran a function left at the Request node's default, "Allow Unauthenticated"
 * off. A schedule has nobody signed in, so every fire was refused, and the agent made the function public to get the
 * digest out. The shared-expenses agent did the same for its monthly job. Richard ruled, 2026-10-27: a schedule, a row
 * change and a run from Studio count as the app, so they pass "signed in only" with nobody signed in; a webhook and a
 * direct call stay visitors. The function itself is never opened.
 *
 * Every door below runs the SAME members-only function, so a door that changed and a door that did not are told
 * apart by their answer and nothing else.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { httpClient } from './helpers/http';

jest.setTimeout(30000);

/** The Request node's default — no call without a signed-in person — and a Response that says it ran. */
const DIGEST = {
  components: [
    {
      name: '/#__cloud__/digest',
      nodes: [
        { id: 'req1', type: 'noodl.cloud.request', x: 0, y: 0, parameters: {}, ports: [], children: [] },
        { id: 'res1', type: 'noodl.cloud.response', x: 0, y: 200, parameters: {}, ports: [], children: [] }
      ],
      connections: [{ sourceId: 'req1', sourcePort: 'receive', targetId: 'res1', targetPort: 'send' }],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

/** One step: the members-only function. */
const DIGEST_FLOW = {
  version: 1,
  id: 'digest-flow',
  name: 'Digest flow',
  entry: 'send',
  concurrency: 1,
  steps: [{ id: 'send', kind: 'call-function', ref: 'digest' }],
  createdAt: '2026-10-27T00:00:00.000Z',
  updatedAt: '2026-10-27T00:00:00.000Z'
};

const ADMIN_TOKEN = 'admin-token-for-p127-scheduleauth';
const BACKEND_ID = 'backend_p127scheduleauth';
const CATCH_UP = 'trg_p127_catchup';

/**
 * A schedule that owes a catch-up fire at start: the scheduler's own `schedule` fire, not Studio's "run now". The
 * registry owns `status` and no API backdates `lastFiredAt`, so it is a file (the FED-004 drive does the same).
 */
const TRIGGERS_FILE = {
  version: 1,
  maxChangeDepth: 1,
  triggers: [
    {
      id: CATCH_UP,
      type: 'schedule',
      name: 'Monday digest',
      enabled: true,
      target: { kind: 'function', name: 'digest' },
      schedule: { cron: '0 8 * * 1', missedFirePolicy: 'run-once-on-start' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      status: { lastFiredAt: '2026-01-05T08:00:00.000Z', nextFireAt: null, lastResult: null, fireCount: 1 }
    }
  ]
};

interface LastResult {
  ok: boolean;
  error?: string;
}
interface TriggerBody {
  trigger: { id: string; status: { fireCount: number; lastResult: LastResult | null } };
  secret?: string;
}

describe('P127-BKO006-SCHEDULEAUTH — a run the app starts itself passes "signed in only"', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(() => base);
  const admin = <T = unknown>(method: string, p: string, body?: unknown) =>
    http.request<T>(method, p, { body, headers: { authorization: `Bearer ${ADMIN_TOKEN}` } });

  const trigger = async (id: string) => (await admin<TriggerBody>('GET', `/admin/triggers/${id}`)).json.trigger;

  /** A fire lands after its trigger's answer (the row-change bus, the start-up catch-up): wait for its count to move. */
  async function settledAfter(id: string, fireCount: number): Promise<LastResult> {
    const until = Date.now() + 10000;
    for (;;) {
      const t = await trigger(id);
      if (t.status.fireCount > fireCount && t.status.lastResult) return t.status.lastResult;
      if (Date.now() > until) throw new Error(`trigger ${id} never fired past ${fireCount}: ${JSON.stringify(t.status)}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async function make(def: Record<string, unknown>): Promise<TriggerBody> {
    const made = await admin<TriggerBody>('POST', '/admin/triggers', def);
    expect(made.status).toBe(201);
    return made.json;
  }

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p127-scheduleauth-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'digest.workflow.json'), JSON.stringify(DIGEST));
    fs.mkdirSync(path.join(dataDir, 'workflow-defs'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflow-defs', 'digest-flow.workflow-def.json'), JSON.stringify(DIGEST_FLOW));
    fs.writeFileSync(path.join(dataDir, 'triggers.json'), JSON.stringify(TRIGGERS_FILE, null, 2) + '\n');
    service = new BackendService({ dataDir, port: 0, backendId: BACKEND_ID, backendName: 'P127', authToken: ADMIN_TOKEN });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('the app’s own runs', () => {
    it('a schedule’s own fire (the start-up catch-up) runs the function', async () => {
      expect(await settledAfter(CATCH_UP, 1)).toEqual(expect.objectContaining({ ok: true }));
    });

    it('Studio’s "run now" runs the function', async () => {
      const { trigger: t } = await make({
        type: 'schedule',
        name: 'Run now',
        target: { kind: 'function', name: 'digest' },
        schedule: { cron: '0 8 * * 1', missedFirePolicy: 'skip' }
      });
      await admin('POST', `/admin/triggers/${t.id}/fire`, {});
      expect((await trigger(t.id)).status.lastResult).toEqual(expect.objectContaining({ ok: true }));
    });

    it('a row change runs the function', async () => {
      const { trigger: t } = await make({
        type: 'db-change',
        name: 'New book',
        target: { kind: 'function', name: 'digest' },
        dbChange: { collection: 'Book', actions: ['create'] }
      });
      const row = await admin('POST', '/classes/Book', { title: 'Middlemarch' });
      expect(row.status).toBe(201);
      expect(await settledAfter(t.id, 0)).toEqual(expect.objectContaining({ ok: true }));
    });

    it('a workflow the app runs gets its function step past the check', async () => {
      const ran = await admin<{ run: { status: string; error?: string } }>('POST', '/admin/workflow-defs/digest-flow/run', {});
      expect(ran.status).toBe(200);
      expect(ran.json.run).toEqual(expect.objectContaining({ status: 'success' }));
    });
  });

  describe('a request from outside is still a visitor', () => {
    it('a webhook’s run is refused, and says why', async () => {
      const made = await make({ type: 'webhook', target: { kind: 'function', name: 'digest' }, webhook: { slug: 'digest-hook', scheme: 'token' } });
      const res = await fetch(`${base}/hooks/${BACKEND_ID}/digest-hook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-webhook-token': made.secret! },
        body: '{}'
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      const last = (await trigger(made.trigger.id)).status.lastResult!;
      expect(last.ok).toBe(false);
      expect(last.error).toMatch(/Unauthenticated/);
    });

    it('a workflow a webhook starts gets its function step refused', async () => {
      const made = await make({
        type: 'webhook',
        target: { kind: 'workflow', name: 'digest-flow' },
        webhook: { slug: 'digest-flow-hook', scheme: 'token' },
        responseMode: 'sync'
      });
      await fetch(`${base}/hooks/${BACKEND_ID}/digest-flow-hook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-webhook-token': made.secret! },
        body: '{}'
      });
      const last = await settledAfter(made.trigger.id, 0);
      expect(last.ok).toBe(false);
    });

    it('a direct call with nobody signed in is refused — and claiming the mark in a header or the body does not help', async () => {
      const plain = await http.request('POST', '/functions/digest', { body: {} });
      expect(plain.status).toBeGreaterThanOrEqual(400);
      const claimed = await http.request<{ error?: string }>('POST', '/functions/digest', {
        body: { startedByApp: true },
        headers: { startedbyapp: 'true', 'x-started-by-app': 'true' }
      });
      expect(claimed.status).toBe(plain.status);
      expect(JSON.stringify(claimed.json)).toMatch(/Unauthenticated/);
    });
  });
});
