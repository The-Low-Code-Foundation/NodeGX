/**
 * P115 HST-010 (P115-HST006-LOOPBACK) — the backend's calls to itself go through the transport its host hands in.
 *
 * The service points its cloud runtime at its own address (`_noodl_cloudservices.endpoint`). Three callers fetch it:
 * a cloud function's Request node checking the caller (`GET /users/me`, userservice.js), the Record nodes inside a
 * function (`/classes`, ParseWireAdapter's cloud branch) and a workflow's record steps (`/classes`, steps/records.ts).
 * On a Cloudflare Worker nothing answers 127.0.0.1, and every signed-in call read as anonymous.
 *
 * This suite makes that condition in Node: while it runs, the global `fetch` REFUSES the backend's own address, as a
 * Worker's network does. The suite's own requests use the real `fetch` directly. Two services side by side:
 *   - `handed`: started with `loopbackFetch` (here the real fetch, counted) — every caller must arrive through it;
 *   - `control`: started without it — the same signed-in call must fail, or the refusal above is not biting and the
 *     `handed` arm's green would prove nothing.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { adminToken } from './helpers/http';

jest.setTimeout(30000);

const realFetch = globalThis.fetch.bind(globalThis);

/** Every request the backend sends to an address in this set is refused, as a Worker's network refuses 127.0.0.1. */
const refusedOrigins = new Set<string>();
const refusedCalls: string[] = [];

type Wire = { sourceId: string; sourcePort: string; targetId: string; targetPort: string };
const wire = (sourceId: string, sourcePort: string, targetId: string, targetPort: string): Wire => ({ sourceId, sourcePort, targetId, targetPort });

/** Signed in only: answers the caller's id. The Request node asks `GET /users/me` before the body runs. */
const whoAmI = {
  name: '/#__cloud__/who-am-i',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: false }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 100, parameters: { params: 'me' }, ports: [], children: [] }
  ],
  connections: [wire('req', 'userId', 'res', 'pm-me'), wire('req', 'receive', 'res', 'send')],
  roots: []
};

/** Signed in only, and counts the Plants with a Query Records node: `/classes` from inside a function. */
const countPlants = {
  name: '/#__cloud__/count-plants',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: false }, ports: [], children: [] },
    {
      id: 'q',
      type: 'DbCollection2',
      x: 0,
      y: 100,
      parameters: { collectionName: 'Plant', 'runOnChange-collectionName': false, 'runOnChange-querySettings': false },
      ports: [],
      children: []
    },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'count' }, ports: [], children: [] }
  ],
  connections: [wire('req', 'receive', 'q', 'storageFetch'), wire('q', 'count', 'res', 'pm-count'), wire('q', 'fetched', 'res', 'send')],
  roots: []
};

const FUNCTIONS = { components: [whoAmI, countPlants], settings: {}, metadata: {} };

interface Arm {
  dataDir: string;
  service: BackendService;
  base: string;
  token: string;
  admin: Record<string, string>;
  handed: string[];
}

async function req<T = Record<string, unknown>>(base: string, method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await realFetch(base + p, {
    method,
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = {} as T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    /* not JSON */
  }
  return { status: res.status, json };
}

async function startArm(name: string, withTransport: boolean): Promise<Arm> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-hst010-${name}-`));
  fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'workflows', 'main.workflow.json'), JSON.stringify(FUNCTIONS));
  const handed: string[] = [];
  const loopbackFetch = (input: string, init?: RequestInit) => {
    const u = new URL(input);
    handed.push(`${init?.method || 'GET'} ${u.pathname}`);
    return realFetch(input, init);
  };
  const service = new BackendService({
    dataDir,
    port: 0,
    backendId: `hst010-${name}`,
    backendName: `HST-010 ${name}`,
    ...(withTransport ? { loopbackFetch } : {})
  });
  const base = (await service.start()).listen.url;
  refusedOrigins.add(new URL(base).origin);
  const admin = { authorization: `Bearer ${adminToken(dataDir)}` };
  expect((await req(base, 'POST', '/admin/schema', { action: 'createTable', table: 'Plant', columns: [{ name: 'name', type: 'String' }] }, admin)).status).toBeLessThan(300);
  for (const plant of ['Fern', 'Ivy']) expect((await req(base, 'POST', '/classes/Plant', { name: plant }, admin)).status).toBe(201);
  const signedUp = await req<{ sessionToken: string; objectId: string }>(base, 'POST', '/users', { username: `ada-${name}`, password: 'a-long-password-9' });
  expect(signedUp.status).toBe(201);
  return { dataDir, service, base, token: signedUp.json.sessionToken, admin, handed };
}

async function stopArm(arm: Arm | undefined): Promise<void> {
  if (!arm) return;
  await arm.service.stop();
  fs.rmSync(arm.dataDir, { recursive: true, force: true });
}

const call = (arm: Arm, fn: string) =>
  req<{ result?: Record<string, unknown>; error?: string }>(arm.base, 'POST', `/functions/${fn}`, {}, { 'x-parse-session-token': arm.token });

// `_noodl_cloudservices` is one per process (service.ts step 4: one process serves one backend), so the two arms run
// one after the other, each with its own service, never side by side.
describe('P115 HST-010 — the backend reaches itself through the transport its host hands in', () => {
  beforeAll(() => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (refusedOrigins.has(url.origin)) {
        refusedCalls.push(`${init?.method || 'GET'} ${url.pathname}`);
        throw new TypeError(`HST-010 suite: nothing answers ${url.origin} here (a Worker's network)`);
      }
      return realFetch(input, init);
    }) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  describe('control: no transport handed in', () => {
    let control: Arm;
    beforeAll(async () => {
      control = await startArm('control', false);
    });
    afterAll(() => stopArm(control));

    it('the signed-in caller is lost, because the global fetch to its own address is refused', async () => {
      refusedCalls.length = 0;
      const r = await call(control, 'who-am-i');
      expect(r.status).not.toBe(200);
      expect(refusedCalls).toContain('GET /users/me');
    });
  });

  describe('a transport handed in as loopbackFetch', () => {
    let handed: Arm;
    beforeAll(async () => {
      handed = await startArm('handed', true);
    });
    afterAll(() => stopArm(handed));

    it('a Request node sees the signed-in caller: GET /users/me went through it', async () => {
      handed.handed.length = 0;
      refusedCalls.length = 0;
      const me = await req<{ objectId: string }>(handed.base, 'GET', '/users/me', undefined, { 'x-parse-session-token': handed.token });
      const r = await call(handed, 'who-am-i');
      expect({ status: r.status, json: r.json }).toEqual({ status: 200, json: { result: { me: me.json.objectId } } });
      expect(handed.handed).toContain('GET /users/me');
      expect(refusedCalls).toEqual([]);
    });

    it('a Query Records node inside a function reads /classes through it', async () => {
      handed.handed.length = 0;
      refusedCalls.length = 0;
      const r = await call(handed, 'count-plants');
      expect({ status: r.status, json: r.json }).toEqual({ status: 200, json: { result: { count: 2 } } });
      expect(handed.handed.some((c) => /^(GET|POST) \/classes\/Plant/.test(c))).toBe(true);
      expect(refusedCalls).toEqual([]);
    });

    it("a workflow's record step creates through it", async () => {
      handed.handed.length = 0;
      refusedCalls.length = 0;
      const def = { id: 'plant-one', entry: 'make', steps: [{ id: 'make', kind: 'create-record', params: { table: 'Plant', fields: { name: 'Aloe' } } }] };
      expect((await req(handed.base, 'POST', '/admin/workflow-defs', def, handed.admin)).status).toBe(201);
      const run = await req<{ run: { status: string; output: { record: { name: string } } } }>(handed.base, 'POST', '/admin/workflow-defs/plant-one/run', { payload: {} }, handed.admin);
      expect({ status: run.json.run.status, name: run.json.run.output?.record?.name }).toEqual({ status: 'success', name: 'Aloe' });
      expect(handed.handed).toContain('POST /classes/Plant');
      expect(refusedCalls).toEqual([]);
    });
  });
});
