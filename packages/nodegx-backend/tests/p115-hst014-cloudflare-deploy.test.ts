/**
 * P115 HST-014 — the deploy command's two halves that do not need Cloudflare to grade:
 *
 *   applyProject   a project's collections, rules and roles reach a RUNNING backend without a fresh boot, so a second
 *                  deploy keeps every record, account and role membership (AC2). Graded on a real `BackendService`
 *                  started as the Worker starts it (`enforceRules`), with Fixture C's own files.
 *   routeOf        the page and the backend share one origin by the service's OWN route table (AC4): every family of
 *                  the live table is the backend's for a GET, and the spike's hand list is shown to miss some.
 *
 * Plus the settings table (`dataDirTable`) on a real SQLite, and the Worker's wrangler config.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { applyProject, type AdminCall, type ProjectBackendState } from '../cloudflare/applyProject';
import { dataDirTable } from '../cloudflare/dataDirTable';
import { FAMILIES_PATH, isPageAddress, routeFamilies, routeOf } from '../cloudflare/routing';
import { domainProblem, workerNameFrom, workerNameProblem, wranglerConfig } from '../cloudflare/wranglerConfig';
import { BackendService } from '../src/service';
import { adminToken } from './helpers/http';

jest.setTimeout(30000);

const FIXTURE = path.resolve(__dirname, '../../../dev-docs/tasks/phase-115-online-on-your-own-account/fixtures/c-campus');

function fixtureState(): ProjectBackendState {
  const project = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'nodegx.project.json'), 'utf8'));
  return {
    policy: JSON.parse(fs.readFileSync(path.join(FIXTURE, 'nodegx.security.json'), 'utf8')),
    collections: project.metadata.dbCollections
  };
}

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

interface Running {
  dataDir: string;
  service: BackendService;
  base: string;
  admin: Record<string, string>;
  call: AdminCall;
}

const made: string[] = [];
const running: BackendService[] = [];
async function start(name: string): Promise<Running> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-hst014-${name}-`));
  made.push(dataDir);
  // As the Worker starts it: rules enforced from the first start.
  const service = new BackendService({ dataDir, port: 0, backendId: `hst014-${name}`, enforceRules: true });
  running.push(service);
  const base = (await service.start()).listen.url;
  const admin = { authorization: `Bearer ${adminToken(dataDir)}` };
  const call: AdminCall = (method, p, body) => req(base, method, p, body, admin);
  return { dataDir, service, base, admin, call };
}

afterAll(async () => {
  for (const s of running) await s.stop().catch(() => undefined);
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});

const READER = { objectId: '6f468bbd-4091-48c8-90a1-9232f4753a90', name: 'Ada', email: 'ada@example.com' };
const shape = (collection: string, columns: Array<{ name: string; type: string }>, records: unknown[]) =>
  JSON.stringify({ format: 'nodegx-collection', version: 1, collection, schema: { columns }, count: records.length, records });

describe('applyProject: a project reaches a running backend, and a second deploy keeps its data (AC2)', () => {
  let app: Running;
  let ownerId: string;

  beforeAll(async () => {
    app = await start('campus');
  });

  test('first deploy: the collections, the rules and the role the rules name', async () => {
    const report = await applyProject(app.call, fixtureState(), { firstDeploy: true });
    expect(report.tablesAdded.sort()).toEqual(['Answer', 'Reader']);
    expect(report.rulesChanged).toBe(true);
    expect(report.rolesMade).toEqual(['owner']);

    const rules = await req<{ config: Record<string, unknown>; enforced: boolean }>(app.base, 'GET', '/admin/permissions', undefined, app.admin);
    expect(rules.json.enforced).toBe(true);
    expect((rules.json.config as { collections: Record<string, { permissions: { get: string } }> }).collections.Reader.permissions.get).toBe('public');
    // A stranger reads what the rules say: a reader by id yes, the list of answers no.
    const h = { 'x-parse-application-id': 'campus' };
    expect((await req(app.base, 'GET', '/classes/Answer', undefined, h)).status).toBeGreaterThanOrEqual(401);
  });

  test('the data a person makes after it: an account in the role, a reader, an answer', async () => {
    const signUp = await req<{ objectId: string }>(app.base, 'POST', '/users', { username: 'owner', email: 'owner@example.com', password: 'hst014-owner-pw' });
    expect(signUp.status).toBeLessThan(300);
    ownerId = signUp.json.objectId;
    expect((await req(app.base, 'POST', '/admin/roles/owner/users', { userId: ownerId }, app.admin)).status).toBeLessThan(300);
    const S = (name: string) => ({ name, type: 'String' });
    const imp = await req(app.base, 'POST', '/admin/import/Reader', { format: 'json', content: shape('Reader', [S('name'), S('email')], [READER]) }, app.admin);
    expect(imp.status).toBeLessThan(300);
    const answer = await req(app.base, 'POST', '/classes/Answer', { readerId: READER.objectId, readerName: 'Ada', choice: 'yes' }, { 'x-parse-application-id': 'campus' });
    expect(answer.status).toBeLessThan(300);
  });

  test('second deploy of the SAME project: nothing to do, and nothing lost', async () => {
    const report = await applyProject(app.call, fixtureState(), { firstDeploy: false });
    expect(report.rulesChanged).toBe(false);
    expect(report.tablesAdded).toEqual([]);
    expect(report.columnsAdded).toEqual([]);
    expect(report.rolesMade).toEqual([]);
    await expectDataKept(app, ownerId);
  });

  test('a deploy of a CHANGED project: a new column and a new rule arrive, the data stays', async () => {
    const state = fixtureState();
    const answer = state.collections.find((c) => c.name === 'Answer')!;
    answer.columns = [...(answer.columns ?? []), { name: 'note', type: 'String' }];
    const policy = state.policy as { collections: Record<string, { permissions: Record<string, string> }> };
    policy.collections.Answer.permissions.find = 'authenticated';

    const report = await applyProject(app.call, state, { firstDeploy: false });
    expect(report.columnsAdded).toEqual(['Answer.note']);
    expect(report.rulesChanged).toBe(true);
    const rules = await req<{ config: typeof policy }>(app.base, 'GET', '/admin/permissions', undefined, app.admin);
    expect(rules.json.config.collections.Answer.permissions.find).toBe('authenticated');
    await expectDataKept(app, ownerId);
  });

  test('what the backend has and the project lacks is kept and named, never refused as destructive', async () => {
    // Made on the live app (an import with a column of its own, and a collection the project never declared).
    const extra = await req(app.base, 'POST', '/admin/import/Visit', { format: 'json', content: shape('Visit', [{ name: 'at', type: 'String' }], [{ objectId: 'v1', at: 'now' }]) }, app.admin);
    expect(extra.status).toBeLessThan(300);
    const report = await applyProject(app.call, fixtureState(), { firstDeploy: false });
    expect(report.kept.some((k) => k.startsWith('Visit '))).toBe(true);
    expect(report.kept.some((k) => k.startsWith('Answer.note'))).toBe(true);
    const visits = await req<{ results: unknown[] }>(app.base, 'GET', '/classes/Visit', undefined, { ...app.admin, 'x-parse-application-id': 'campus' });
    expect(visits.json.results).toHaveLength(1);
    await expectDataKept(app, ownerId);
  });

  test('a table in the database that no one declared (on a Worker: the execution history\'s) is not made a collection', async () => {
    // On a Worker `node:sqlite` is the object's one database, so the history's tables sit beside the records and
    // `GET /admin/schema` lists them. Made here the same way: a table written straight into the records' database.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(app.dataDir, 'data', 'local.db'));
    db.exec('CREATE TABLE IF NOT EXISTS workflow_executions (id TEXT PRIMARY KEY)');
    db.close();
    const listed = await req<{ tables: Array<{ name: string }> }>(app.base, 'GET', '/admin/schema', undefined, app.admin);
    expect(listed.json.tables.map((t) => t.name)).toContain('workflow_executions');
    const report = await applyProject(app.call, fixtureState(), { firstDeploy: false });
    expect(report.tablesAdded).not.toContain('workflow_executions');
    expect(report.kept.join('\n')).not.toMatch(/workflow_executions/);
  });

  test('a role the owner deleted is not made again by a redeploy, and the report says how to', async () => {
    expect((await req(app.base, 'DELETE', '/admin/roles/owner', undefined, app.admin)).status).toBeLessThan(300);
    const report = await applyProject(app.call, fixtureState(), { firstDeploy: false });
    expect(report.rolesMade).toEqual([]);
    expect(report.lines.join('\n')).toMatch(/lacks: owner\. Not made on a redeploy/);
  });
});

async function expectDataKept(app: Running, ownerId: string): Promise<void> {
  const h = { 'x-parse-application-id': 'campus' };
  const ada = await req<{ name: string }>(app.base, 'GET', `/classes/Reader/${READER.objectId}`, undefined, h);
  expect(ada.json.name).toBe('Ada');
  const login = await req<{ sessionToken: string; objectId: string }>(app.base, 'POST', '/login', { username: 'owner', password: 'hst014-owner-pw' }, h);
  expect(login.json.objectId).toBe(ownerId);
  const answers = await req<{ results: Array<{ readerName: string }> }>(app.base, 'GET', '/classes/Answer', undefined, {
    ...h,
    'x-parse-session-token': login.json.sessionToken
  });
  expect(answers.json.results.map((a) => a.readerName)).toEqual(['Ada']);
}

describe('routeOf: one origin, split by the service\'s own route table (AC4)', () => {
  let families: string[];
  beforeAll(async () => {
    const app = await start('routes');
    families = routeFamilies(app.service.getRouteTable());
  });

  test('every family of the live table is the backend\'s for a GET, a HEAD and a POST', () => {
    const known = new Set(families);
    expect(families.length).toBeGreaterThan(15);
    for (const f of families) {
      for (const method of ['GET', 'HEAD', 'POST']) expect([f, method, routeOf(method, `/${f}`, known)]).toEqual([f, method, 'backend']);
      expect(routeOf('GET', `/${f}/anything/below`, known)).toBe('backend');
    }
  });

  test('the spike\'s hand list missed families the table has (P115-S9-SITEROUTES); the table cannot', () => {
    const SPIKE_LIST_BEFORE_S9 = ['classes', 'users', 'login', 'logout', 'functions', 'files', 'roles', 'sessions', 'schemas', 'admin', '_admin', 'oauth', 'auth', 'health', 'config', 'batch', 'aggregate', 'workflows', 'hooks', 'realtime', 'requestPasswordReset', 'verificationEmailRequest', 'api', 'magic-link', 'email-code'];
    const missed = families.filter((f) => !SPIKE_LIST_BEFORE_S9.includes(f));
    expect(missed).toEqual(expect.arrayContaining(['mcp', 'metrics']));
  });

  test('the app\'s pages and files, and the host\'s own prefix', () => {
    const known = new Set(families);
    expect(routeOf('GET', '/', known)).toBe('asset');
    expect(routeOf('GET', '/home', known)).toBe('asset');
    expect(routeOf('GET', '/noodl.deploy.js', known)).toBe('asset');
    expect(routeOf('POST', '/home', known)).toBe('backend');
    expect(routeOf('GET', FAMILIES_PATH, known)).toBe('host');
    expect(isPageAddress('/owner')).toBe(true);
    expect(isPageAddress('/index-cf7e.js')).toBe(false);
  });
});

describe('dataDirTable: the settings beside the records', () => {
  test('list, get, put over a key, delete, on a real SQLite', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(':memory:');
    // Eager, as a Durable Object's `sql.exec` is: the statement runs when it is called, `toArray` only reads rows.
    const sql = {
      exec: (q: string, ...b: unknown[]) => {
        const rows = /^\s*SELECT/i.test(q) ? db.prepare(q).all(...b) : (db.prepare(q).run(...b), []);
        return { toArray: () => rows };
      }
    };
    const ledger = { puts: 0, deletes: 0 };
    const store = dataDirTable(sql, ledger);
    store.put('security.json', '{"a":1}');
    store.put('secrets.json', '{}');
    store.put('security.json', '{"a":2}');
    expect(store.list()).toEqual(['secrets.json', 'security.json']);
    expect(store.get('security.json')).toBe('{"a":2}');
    store.delete('secrets.json');
    expect(store.list()).toEqual(['security.json']);
    expect(store.get('secrets.json')).toBeUndefined();
    expect(ledger).toEqual({ puts: 3, deletes: 1 });
    // A second open of the same database finds what the first wrote (a redeploy).
    expect(dataDirTable(sql).get('security.json')).toBe('{"a":2}');
  });
});

describe('wranglerConfig', () => {
  test('a bucket binding only when there is a bucket; the object and the site always', () => {
    const withBucket = wranglerConfig({ name: 'campus', bucket: 'campus-files' });
    expect(withBucket).toMatch(/\[\[r2_buckets\]\]\nbinding = "FILES"\nbucket_name = "campus-files"/);
    expect(withBucket).toMatch(/class_name = "NodegxBackend"/);
    expect(withBucket).toMatch(/run_worker_first = true/);
    expect(wranglerConfig({ name: 'campus', bucket: null })).not.toMatch(/r2_buckets/);
  });
  test('names', () => {
    expect(workerNameFrom('Campus Sign-up!')).toBe('campus-sign-up');
    expect(workerNameProblem('campus-2')).toBeNull();
    expect(workerNameProblem('Campus')).toMatch(/lowercase/);
    expect(workerNameProblem('-x')).toMatch(/lowercase/);
  });
  test('HST-007: a domain is a Custom Domain route, only when there is one', () => {
    const withDomain = wranglerConfig({ name: 'campus', bucket: null, domain: 'campus.example.com' });
    expect(withDomain).toMatch(/\[\[routes\]\]\npattern = "campus.example.com"\ncustom_domain = true/);
    expect(wranglerConfig({ name: 'campus', bucket: null })).not.toMatch(/routes/);
    expect(domainProblem('campus.example.com')).toBeNull();
    expect(domainProblem('example.co.uk')).toBeNull();
    for (const bad of ['https://campus.example.com', 'campus.example.com/home', '*.example.com', 'Campus.Example.com', 'localhost', 'campus..example.com']) {
      expect(domainProblem(bad)).toMatch(/cannot be a domain/);
    }
  });
});
