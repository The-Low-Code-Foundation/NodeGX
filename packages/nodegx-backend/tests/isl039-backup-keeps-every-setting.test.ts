/**
 * P109 ISL-039 — P100-UPG001-BACKUP: a restored backup brings back everything
 * the backend keeps about itself, not five of its settings files.
 *
 * Before: `BackupManager` archived `security.json`, `triggers.json`,
 * `email.json`, `config-params.json` and `backups.json`, and the `workflows/`
 * folder. A backend also keeps its sign-in (`auth.json`), search
 * (`search.json`), file settings (`files.json`), ops settings (`ops.json`),
 * saved table views (`views.json`) and its workflow definitions
 * (`workflow-defs/`). None of those were in the archive, so a restore left a
 * trigger aimed at a workflow that was gone and the server settings at their
 * defaults, and said nothing.
 *
 * Kept out ON PURPOSE, and asserted so it stays a decision:
 *   - `executions.sqlite`, the run history: a log of what ran, not data; the
 *     restore itself writes into it. The Backups page says so.
 *   - `config.json`: the backend's identity (its id and port). Restoring an
 *     archive onto another backend must not turn it into the first one.
 *
 * Three arms: the archive (every file back as it was backed up; a definition
 * made after the backup gone; an archive made before this fix leaves
 * `workflow-defs/` alone), each store's refusal (an invalid restored file keeps
 * the live settings and is written back), and a running backend (each setting
 * restored is the one it serves, with no restart).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackupConfigStore } from '../src/backup/config';
import { BackupManager } from '../src/backup/BackupManager';
import { readArchive, writeArchive } from '../src/backup/archive';
import { AuthConfigState } from '../src/auth/AuthConfigState';
import { createAdapter } from '../src/persistence/createAdapter';
import { ExecutionHistory } from '../src/execution/ExecutionStore';
import { FileConfigStore } from '../src/storage/config';
import { OpsState } from '../src/ops/OpsState';
import { SearchState } from '../src/search/SearchState';
import { ViewsStore } from '../src/server/admin-views';
import { WorkflowRegistry } from '../src/workflow/WorkflowRegistry';
import { BackendService } from '../src/service';
import type { WorkflowStep } from '../src/workflow/types';

import { request } from './helpers/http';

jest.setTimeout(60000);

const SETTINGS = ['auth.json', 'search.json', 'files.json', 'ops.json', 'views.json'];
const steps = (ref: string): WorkflowStep[] => [{ id: 'a', kind: 'call-function', ref }];

const made: string[] = [];
afterAll(() => {
  for (const d of made) fs.rmSync(d, { recursive: true, force: true });
});
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  made.push(d);
  return d;
}

function managerFor(dataDir: string): { manager: BackupManager; executions: ExecutionHistory } {
  const executions = new ExecutionHistory();
  executions.open(dataDir);
  const manager = new BackupManager({
    dataDir,
    dbPath: path.join(dataDir, 'data', 'local.db'),
    executions,
    config: new BackupConfigStore(dataDir),
    backendId: 'isl039',
    backendName: 'ISL-039'
  });
  return { manager, executions };
}

/** Each setting written through its own store, so every file is one the backend would read. */
function writeSettings(dataDir: string, variant: string): void {
  const auth = new AuthConfigState(dataDir);
  auth.config.redirectAllowList = [`https://${variant}.example.com`];
  auth.save();
  const search = new SearchState(dataDir);
  search.setCollection('Pet', { enabled: true, fields: [variant === 'before' ? 'name' : 'bio'] });
  new OpsState(dataDir).update({ cors: { origins: [`https://${variant}.example.com`] } });
  new FileConfigStore(dataDir).update({ maxUploadBytes: variant === 'before' ? 1111 : 2222 });
  new ViewsStore(dataDir).save('Pet', { name: 'mine', filter: null, sort: [], columns: [variant], savedAt: '2026-10-10T00:00:00.000Z' });
}

describe('ISL-039 P100-UPG001-BACKUP — the archive', () => {
  it('a restore puts back every settings file and the workflow definitions as they were backed up', async () => {
    const dir = tmp('isl039-arch-');
    const handle = await createAdapter({ dataDir: dir });
    await handle.adapter.disconnect();
    writeSettings(dir, 'before');
    new WorkflowRegistry(dir).upsert({ id: 'nightly', entry: 'a', steps: steps('tidy') });
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ id: 'isl039', port: 1 }));

    const { manager, executions } = managerFor(dir);
    const backup = await manager.createBackup({ triggerType: 'test', source: 'isl039' });
    const backedUp = new Map(SETTINGS.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf-8')]));
    const defBefore = fs.readFileSync(path.join(dir, 'workflow-defs', 'nightly.workflow-def.json'), 'utf-8');

    const names = [...readArchive(backup.archivePath).entries.keys()];
    for (const f of SETTINGS) expect(names).toContain(`config/${f}`);
    expect(names).toContain('workflow-defs/nightly.workflow-def.json');
    expect(backup.manifest.folders).toEqual(['files', 'workflows', 'workflow-defs']);
    // Kept out on purpose (module doc).
    expect(names.some((n) => n.includes('executions'))).toBe(false);
    expect(names.some((n) => n.endsWith('config.json') && !n.endsWith('-params.json'))).toBe(false);

    // After the backup: every setting changes, the definition changes, and a second one appears.
    writeSettings(dir, 'after');
    const reg = new WorkflowRegistry(dir);
    reg.upsert({ id: 'nightly', entry: 'a', steps: steps('changed') });
    reg.upsert({ id: 'later', entry: 'a', steps: steps('later') });
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ id: 'isl039', port: 2 }));

    await manager.restore(backup.archivePath, { safetySnapshot: false });
    executions.close();

    for (const f of SETTINGS) expect([f, fs.readFileSync(path.join(dir, f), 'utf-8')]).toEqual([f, backedUp.get(f)]);
    expect(fs.readdirSync(path.join(dir, 'workflow-defs'))).toEqual(['nightly.workflow-def.json']);
    expect(fs.readFileSync(path.join(dir, 'workflow-defs', 'nightly.workflow-def.json'), 'utf-8')).toBe(defBefore);
    // The identity is this backend's, not the archive's.
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf-8')).port).toBe(2);
  });

  it('an archive made before the fix (no folders list) leaves workflow-defs/ as it is', async () => {
    const dir = tmp('isl039-old-');
    const handle = await createAdapter({ dataDir: dir });
    await handle.adapter.disconnect();
    const { manager, executions } = managerFor(dir);
    const backup = await manager.createBackup({ triggerType: 'test', source: 'isl039-old' });
    // Rewrite it as the old code wrote it: no `folders`, no workflow-defs entries.
    const { manifest, entries } = readArchive(backup.archivePath);
    const old = path.join(dir, 'old.ngxbak.tar.gz');
    const { entries: _e, format: _f, version: _v, folders: _d, ...base } = manifest;
    writeArchive(old, [...entries.values()].filter((e) => !e.name.startsWith('workflow-defs/')), base);
    expect(readArchive(old).manifest.folders).toBeUndefined();

    new WorkflowRegistry(dir).upsert({ id: 'kept', entry: 'a', steps: steps('kept') });
    await manager.restore(old, { safetySnapshot: false });
    executions.close();
    expect(fs.readdirSync(path.join(dir, 'workflow-defs'))).toEqual(['kept.workflow-def.json']);
  });
});

describe('ISL-039 P100-UPG001-BACKUP — a restored file the store refuses', () => {
  const refuse = (dir: string, file: string) => fs.writeFileSync(path.join(dir, file), '{ not json');

  it('auth, search, ops, files: the live settings stay and are written back', () => {
    const dir = tmp('isl039-refuse-');
    writeSettings(dir, 'before');
    const stores = {
      'auth.json': new AuthConfigState(dir),
      'search.json': new SearchState(dir),
      'ops.json': new OpsState(dir),
      'files.json': new FileConfigStore(dir)
    };
    // A valid restored file is taken up in place.
    const auth = stores['auth.json'];
    const held = auth.config;
    fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ ...auth.config, redirectAllowList: ['https://restored.example.com'] }));
    auth.reload();
    expect(held.redirectAllowList).toEqual(['https://restored.example.com']);

    for (const [file, store] of Object.entries(stores)) {
      const live = JSON.stringify('get' in store ? store.get() : store.config);
      refuse(dir, file);
      expect(() => store.reload()).toThrow();
      expect([file, JSON.stringify('get' in store ? store.get() : store.config)]).toEqual([file, live]);
      expect(() => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))).not.toThrow();
    }
  });

  it('workflow definitions: one invalid restored file keeps every live definition, written back', () => {
    const dir = tmp('isl039-wf-');
    const reg = new WorkflowRegistry(dir);
    reg.upsert({ id: 'one', entry: 'a', steps: steps('one') });
    const restoredDir = path.join(dir, 'workflow-defs');
    fs.rmSync(restoredDir, { recursive: true });
    fs.mkdirSync(restoredDir);
    fs.writeFileSync(path.join(restoredDir, 'bad.workflow-def.json'), '{ not json');
    expect(() => reg.reload()).toThrow(/bad\.workflow-def\.json/);
    expect(reg.list().map((d) => d.id)).toEqual(['one']);
    expect(fs.readdirSync(restoredDir)).toEqual(['one.workflow-def.json']);
    expect(() => new WorkflowRegistry(dir)).not.toThrow();
  });
});

describe('ISL-039 P100-UPG001-BACKUP — a running backend', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const T = { authorization: 'Bearer t0k' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = <R = any>(method: string, p: string, body?: unknown) => request<R>(base, method, p, { body, headers: T });

  beforeAll(async () => {
    dataDir = tmp('isl039-live-');
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'isl039', backendName: 'ISL-039', authToken: 't0k' });
    base = (await service.start()).listen.url;
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }, { name: 'bio', type: 'String' }] });
  });
  afterAll(async () => {
    if (service) await service.stop();
  });

  const set = async (v: string) => {
    for (const [m, p, body] of [
      ['PUT', '/admin/ops', { cors: { origins: [`https://${v}.example.com`] } }],
      ['PUT', '/admin/auth', { redirectAllowList: [`https://${v}.example.com`] }],
      ['PUT', '/admin/files/config', { maxUploadBytes: v === 'before' ? 1111 : 2222 }],
      ['PUT', '/admin/search/collections/Pet', { enabled: true, fields: [v === 'before' ? 'name' : 'bio'] }],
      ['PUT', '/admin/views/Pet/mine', { filter: null, sort: [], columns: [v] }],
      ['PUT', '/admin/workflow-defs/nightly', { name: v, entry: 'a', steps: steps(v) }]
    ] as const) {
      const res = await req(m, p, body);
      expect([p, res.status]).toEqual([p, 200]);
    }
  };
  const read = async () => ({
    ops: (await req('GET', '/admin/ops')).json.config.cors.origins,
    auth: (await req('GET', '/admin/auth')).json.config.redirectAllowList,
    files: (await req('GET', '/admin/files/config')).json.config.maxUploadBytes,
    search: (await req('GET', '/admin/search')).json.config.collections.Pet.fields,
    view: (await req('GET', '/admin/views/Pet')).json.views.map((x: { columns: string[] }) => x.columns),
    workflow: (await req('GET', '/admin/workflow-defs/nightly')).json.workflow.steps[0].ref
  });

  it('every setting the archive restores is the one served, with no restart, and each is named as taken up', async () => {
    await set('before');
    const before = await read();
    expect(before).toEqual({
      ops: ['https://before.example.com'],
      auth: ['https://before.example.com'],
      files: 1111,
      search: ['name'],
      view: [['before']],
      workflow: 'before'
    });
    const run = await req<{ archive: string }>('POST', '/admin/backups', {});
    expect(run.status).toBe(200);

    await set('after');
    expect(await read()).not.toEqual(before);

    const restored = await req<{ settings: { reloaded: string[]; refused: unknown[] } }>('POST', '/admin/backups/restore', {
      archive: path.basename(run.json.archive),
      safetySnapshot: false
    });
    expect(restored.status).toBe(200);
    expect(restored.json.settings.refused).toEqual([]);
    expect(restored.json.settings.reloaded).toEqual(expect.arrayContaining(['auth.json', 'search.json', 'files.json', 'ops.json', 'workflow-defs']));
    expect(await read()).toEqual(before);
  });
});

/**
 * P100-UPG001-ARRAYEQ and -PTREQ over the wire, on a collection a Parse client made by writing to it
 * (nothing declared): the contract cases `filters/equality-on-an-array-matches-an-element` and
 * `filters/a-pointer-written-as-a-parse-pointer-is-a-value` declare their columns.
 */
describe('ISL-039 ARRAYEQ and PTREQ — a Parse client on /classes', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const T = { authorization: 'Bearer t0k' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = <R = any>(method: string, p: string, body?: unknown) => request<R>(base, method, p, { body, headers: T });
  const names = async (where: unknown) => {
    const res = await req<{ results: Array<{ name: string }> }>('GET', `/classes/Book?where=${encodeURIComponent(JSON.stringify(where))}`);
    expect([JSON.stringify(where), res.status]).toEqual([JSON.stringify(where), 200]);
    return res.json.results.map((r) => r.name).sort();
  };

  beforeAll(async () => {
    dataDir = tmp('isl039-wire-');
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'isl039w', backendName: 'ISL-039 wire', authToken: 't0k' });
    base = (await service.start()).listen.url;
    const author = (id: string) => ({ __type: 'Pointer', className: '_User', objectId: id });
    for (const [name, tags, by] of [
      ['ada', ['fantasy', 'sea'], 'u1'],
      ['bo', ['crime'], 'u2'],
      ['cy', ['fantasy'], 'u2']
    ] as const) {
      expect((await req('POST', '/classes/Book', { name, tags, author: author(by) })).status).toBe(201);
    }
  });
  afterAll(async () => {
    if (service) await service.stop();
  });

  it('an equality filter on an array field matches the rows whose array holds the value', async () => {
    expect(await names({ name: 'bo' })).toEqual(['bo']); // control: the route answers
    expect(await names({ tags: 'fantasy' })).toEqual(['ada', 'cy']);
    expect(await names({ tags: { $eq: 'crime' } })).toEqual(['bo']);
  });

  it('ADDUNIQUE: an array operator is applied on a create, refused by name on an update, and never stored as the object', async () => {
    const made = await req<{ objectId: string }>('POST', '/classes/Book', {
      name: 'ops',
      tags: { __op: 'AddUnique', objects: ['x', 'x', 'y'] },
      n: { __op: 'Increment', amount: 2 },
      gone: { __op: 'Delete' }
    });
    expect(made.status).toBe(201);
    const url = `/classes/Book/${made.json.objectId}`;
    const read = async () => (await req<Record<string, unknown>>('GET', url)).json;
    expect(await read()).toEqual(expect.objectContaining({ tags: ['x', 'y'], n: 2 }));

    for (const op of ['AddUnique', 'Add', 'Remove']) {
      const res = await req<{ error: string }>('PUT', url, { tags: { __op: op, objects: ['z'] } });
      expect([op, res.status, res.json.error]).toEqual([op, 400, expect.stringContaining(op)]);
    }
    const unknown = await req<{ error: string }>('PUT', url, { tags: { __op: 'Shuffle' } });
    expect([unknown.status, unknown.json.error]).toEqual([400, expect.stringContaining('"Shuffle"')]);
    expect((await read()).tags).toEqual(['x', 'y']); // nothing written by a refusal

    // Control: the operators the wire always knew still work beside it.
    expect((await req('PUT', url, { n: { __op: 'Increment', amount: 3 } })).status).toBe(200);
    expect((await read()).n).toBe(5);
    expect((await req('PUT', url, { tags: { __op: 'Delete' } })).status).toBe(200);
    expect((await read()).tags ?? null).toBeNull();
  });

  it('a pointer written as a Parse pointer matches like its id', async () => {
    expect(await names({ author: 'u2' })).toEqual(['bo', 'cy']); // control: the bare id
    expect(await names({ author: { __type: 'Pointer', className: '_User', objectId: 'u2' } })).toEqual(['bo', 'cy']);
  });
});
