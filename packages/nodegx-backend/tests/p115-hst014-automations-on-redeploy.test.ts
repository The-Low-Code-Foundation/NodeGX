/**
 * P115 HST-014 §5.4 item 2 — a changed `nodegx.automations.json` carried to a RUNNING backend by a redeploy
 * (`cloudflare/applyAutomations.ts`), by the VM deploy's rule: the project's file replaces the backend's when it changed
 * since the last deploy, and an edit made on the backend lasts until then.
 *
 * Graded on a real `BackendService` started as the Worker starts it: rules enforced, the project's files in its
 * `projectDir`, so the backend SEEDS Fixture B's automations at its first start exactly as on Cloudflare. The known-
 * firing control is the first case: a backend seeded from the file reads as agreeing with it (if the comparison were
 * blind to a field the backend fills in, every later case would read as "differs" and replace for nothing).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { applyAutomations, automationsSha256 } from '../cloudflare/applyAutomations';
import type { AdminCall } from '../cloudflare/applyProject';
import { automationsFromBackend, diffAutomations, type ProjectAutomations } from '../src/automations/shape';
import { WEBHOOK_SECRETS_NAMESPACE, SecretsStore } from '../src/config/SecretsStore';
import { BackendService } from '../src/service';
import { adminToken } from './helpers/http';

jest.setTimeout(30000);

const FIXTURE_B = path.resolve(__dirname, '../../../dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/b-newsletter');
const B_TEXT = fs.readFileSync(path.join(FIXTURE_B, 'nodegx.automations.json'), 'utf8');
const B = JSON.parse(B_TEXT) as ProjectAutomations;

async function req<T = Record<string, unknown>>(base: string, method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + p, {
    method,
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null as T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    /* not JSON */
  }
  return { status: res.status, json, text };
}

const made: string[] = [];
const running: BackendService[] = [];
afterAll(async () => {
  for (const s of running) await s.stop().catch(() => undefined);
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

async function start(name: string, automationsText: string | null) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-hst014a-${name}-`));
  made.push(dataDir);
  let projectDir: string | null = null;
  if (automationsText) {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-hst014a-${name}-project-`));
    made.push(projectDir);
    fs.writeFileSync(path.join(projectDir, 'nodegx.automations.json'), automationsText);
  }
  const service = new BackendService({ dataDir, port: 0, backendId: `hst014a-${name}`, enforceRules: true, projectDir });
  running.push(service);
  const base = (await service.start()).listen.url;
  const admin = { authorization: `Bearer ${adminToken(dataDir)}` };
  const writes: string[] = [];
  const call: AdminCall = (method, p, body) => {
    if (method !== 'GET') writes.push(`${method} ${p}`);
    return req(base, method, p, body, admin);
  };
  /** What the backend runs now, in the project's shape. */
  const backend = async () => {
    const wf = await req<{ workflows: never[] }>(base, 'GET', '/admin/workflow-defs', undefined, admin);
    const tr = await req<{ triggers: never[] }>(base, 'GET', '/admin/triggers', undefined, admin);
    return automationsFromBackend(wf.json.workflows, tr.json.triggers);
  };
  return { dataDir, base, admin, call, writes, backend };
}

/** Fixture B, changed the way a person changes it: the digest moves to 07:30, a new workflow + webhook, and the
 *  subscribe workflow is gone from the project. */
function changedB(): ProjectAutomations {
  const next = JSON.parse(B_TEXT) as ProjectAutomations;
  next.triggers[0].schedule!.cron = '30 7 * * *';
  next.workflows = next.workflows.filter((w) => w.id !== 'subscribe');
  next.workflows.push({
    id: 'thank-you',
    name: 'Say thank you',
    entry: 'done',
    steps: [{ id: 'done', kind: 'return', params: { value: { thanked: true } } }]
  } as never);
  next.triggers.push({ id: 'trg_from_shop', type: 'webhook', name: 'From the shop', target: { kind: 'workflow', name: 'thank-you' }, webhook: { slug: 'from-shop' } } as never);
  return next;
}

describe('a redeploy carries nodegx.automations.json to the running backend, by the VM rule', () => {
  let app: Awaited<ReturnType<typeof start>>;
  const sha = automationsSha256(B_TEXT);

  beforeAll(async () => {
    app = await start('b', B_TEXT);
  });

  test('control: a backend seeded from the file at its first start reads as running it (no write)', async () => {
    expect((await app.backend()).workflows.map((w) => w.id).sort()).toEqual(['daily-digest', 'subscribe']);
    const report = await applyAutomations(app.call, B_TEXT, { installedSha256: null });
    expect(report.action).toBe('agree');
    expect(report.sha256).toBe(sha);
    expect(app.writes).toEqual([]);
  });

  test('the same file again: unchanged, nothing written', async () => {
    const report = await applyAutomations(app.call, B_TEXT, { installedSha256: sha });
    expect(report.action).toBe('unchanged');
    expect(report.lines.join('\n')).toMatch(/unchanged since the last deploy, and the backend runs them \(2 and 1\)/);
    expect(app.writes).toEqual([]);
  });

  test('an edit made ON THE BACKEND lasts while the file is unchanged, and is named', async () => {
    const off = await req(app.base, 'POST', '/admin/triggers/trg_digest_daily/enabled', { enabled: false }, app.admin);
    expect(off.status).toBe(200);
    const report = await applyAutomations(app.call, B_TEXT, { installedSha256: sha });
    expect(report.action).toBe('unchanged');
    expect(report.lines.join('\n')).toMatch(/trigger "trg_digest_daily" differs between the project and the backend/);
    expect(app.writes).toEqual([]);
    expect((await app.backend()).triggers[0].enabled).toBe(false);
  });

  test('a CHANGED file replaces them: made, changed and deleted, the previous set handed back', async () => {
    const next = changedB();
    const text = JSON.stringify(next, null, 2);
    const before = await app.backend();
    const report = await applyAutomations(app.call, text, { installedSha256: sha });
    expect(report.action).toBe('replace');
    expect(report.sha256).toBe(automationsSha256(text));
    expect(report.before).toEqual({ ...before, apiCalls: [] }); // the backend has no saved calls
    expect(report.created.sort()).toEqual(['trigger "trg_from_shop"', 'workflow "thank-you"']);
    expect(report.updated).toEqual(['trigger "trg_digest_daily"']);
    expect(report.deleted).toEqual(['workflow "subscribe"']);
    expect(report.lines.join('\n')).toMatch(/"trg_from_shop" got a new secret/);
    // The backend now runs exactly the file (the trigger the backend switched off is on again: the file is the truth).
    expect(diffAutomations(next, await app.backend())).toEqual([]);
    const digest = await req<{ trigger: { schedule: { cron: string }; enabled: boolean } }>(app.base, 'GET', '/admin/triggers/trg_digest_daily', undefined, app.admin);
    expect(digest.json.trigger.schedule.cron).toBe('30 7 * * *');
    expect(digest.json.trigger.enabled).toBe(true);
  });

  test('a webhook updated by a later deploy keeps its secret (the sender is not cut off)', async () => {
    const secret = new SecretsStore(app.dataDir).get(WEBHOOK_SECRETS_NAMESPACE, 'trg_from_shop');
    expect(secret).toMatch(/^whsec_/);
    const next = changedB();
    (next.triggers[1] as { name: string }).name = 'From the shop (renamed)';
    const report = await applyAutomations(app.call, JSON.stringify(next), { installedSha256: 'an older one' });
    expect(report.updated).toEqual(['trigger "trg_from_shop"']);
    expect(report.lines.join('\n')).not.toMatch(/new secret/);
    expect(new SecretsStore(app.dataDir).get(WEBHOOK_SECRETS_NAMESPACE, 'trg_from_shop')).toBe(secret);
  });

  test('a refusal part-way writes NOTHING: what was made is unmade, what was changed is put back', async () => {
    const before = await app.backend();
    const next = changedB();
    next.workflows.push({ id: 'also-new', name: 'Also new', entry: 'done', steps: [{ id: 'done', kind: 'return', params: { value: 1 } }] } as never); // made …
    next.triggers[0].schedule!.cron = '15 6 * * *'; // … changed …
    next.triggers.push({ id: 'zz-bad', type: 'schedule', name: 'Bad', target: { kind: 'workflow', name: 'thank-you' }, schedule: { cron: 'not a cron' } } as never); // … then refused
    app.writes.length = 0;
    await expect(applyAutomations(app.call, JSON.stringify(next), { installedSha256: 'an older one' })).rejects.toThrow(
      /could not be carried to the backend, so none of it was/
    );
    // It did write before the refusal (else this grades nothing), and everything is as it was.
    expect(app.writes).toEqual(expect.arrayContaining(['POST /admin/workflow-defs', 'PUT /admin/triggers/trg_digest_daily']));
    expect(await app.backend()).toEqual(before);
  });

  test('no file: the backend keeps its own, nothing read or written', async () => {
    const report = await applyAutomations(app.call, null, { installedSha256: sha });
    expect(report.action).toBe('none');
    expect(report.sha256).toBeNull();
  });
});

describe('a backend that never had them: a first file arriving by a redeploy', () => {
  test('an empty backend is given every workflow and trigger the file holds', async () => {
    const app = await start('empty', null);
    const report = await applyAutomations(app.call, B_TEXT, { installedSha256: null });
    expect(report.action).toBe('replace');
    expect(report.created.sort()).toEqual(['trigger "trg_digest_daily"', 'workflow "daily-digest"', 'workflow "subscribe"']);
    expect(report.deleted).toEqual([]);
    expect(diffAutomations(B, await app.backend())).toEqual([]);
  });
});
