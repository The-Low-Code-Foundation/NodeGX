/**
 * P115 HST-011 — the data dir's own files are kept in a store the host hands in.
 *
 * On a Cloudflare Worker `node:fs` is the isolate's memory: a redeploy or an eviction starts the service in an EMPTY
 * data dir, while the records (in the Durable Object's SQLite) stay. This suite makes that condition in Node: every
 * arm sets an app up over HTTP (a collection's rule, a function secret, a schedule, a cloud function), stops, deletes
 * its data dir, and starts a second service in a NEW, empty one.
 *   - `control`: no store handed in — the rule, the secret, the schedule and the function must be gone, or the wipe is
 *     not biting and the `handed` arm's green would prove nothing;
 *   - `handed`: the same with `dataDirStore` (a Map here, the object's storage on a Worker) — all four are back, and
 *     the admin credential minted by the FIRST service still opens the second (secrets.json came back too).
 * Then: a removal reaches the store, a store that refuses a write fails that request loudly, and the census gate —
 * every file under `src/` that still writes the disk directly is one this ticket names, with its reason.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { DataDirStore } from '../src/config/dataDirStore';
import { BackendService } from '../src/service';
import { adminToken } from './helpers/http';

jest.setTimeout(30000);

class MapStore implements DataDirStore {
  readonly files = new Map<string, string>();
  refuse = false;
  list(): string[] {
    return [...this.files.keys()];
  }
  get(rel: string): string | undefined {
    return this.files.get(rel);
  }
  put(rel: string, contents: string): void {
    if (this.refuse) throw new Error('HST-011 suite: the store refused the write');
    this.files.set(rel, contents);
  }
  delete(rel: string): void {
    this.files.delete(rel);
  }
}

/** Public: answers a fixed word, so a deployed function is visible by calling it. */
const hello = {
  name: '/#__cloud__/hello',
  nodes: [
    { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] },
    { id: 'res', type: 'noodl.cloud.response', x: 0, y: 100, parameters: { params: 'word', 'pm-word': 'kept' }, ports: [], children: [] }
  ],
  connections: [{ sourceId: 'req', sourcePort: 'receive', targetId: 'res', targetPort: 'send' }],
  roots: []
};
const BUNDLE = { components: [hello], settings: {}, metadata: {} };

async function req<T = Record<string, unknown>>(base: string, method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + p, {
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
  return { status: res.status, json, text };
}

interface Running {
  dataDir: string;
  service: BackendService;
  base: string;
}

const made: string[] = [];
async function start(name: string, store?: DataDirStore): Promise<Running> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `nodegx-hst011-${name}-`));
  made.push(dataDir);
  const service = new BackendService({ dataDir, port: 0, backendId: `hst011-${name}`, ...(store ? { dataDirStore: store } : {}) });
  const base = (await service.start()).listen.url;
  return { dataDir, service, base };
}

/** What a Worker does to the disk between two isolates. */
async function evict(run: Running): Promise<void> {
  await run.service.stop();
  fs.rmSync(run.dataDir, { recursive: true, force: true });
}

async function setUp(run: Running, admin: Record<string, string>): Promise<void> {
  expect((await req(run.base, 'PUT', '/admin/permissions/collections/Answer', { permissions: { find: 'public', create: 'authenticated' } }, admin)).status).toBe(200);
  expect((await req(run.base, 'PUT', '/admin/secrets/MAILCHIMP_KEY', { value: 'hst011-not-a-real-key' }, admin)).status).toBeLessThan(300);
  const trigger = await req(run.base, 'POST', '/admin/triggers', {
    type: 'schedule',
    name: 'Digest',
    enabled: false,
    target: { kind: 'function', name: 'hello' },
    schedule: { cron: '0 8 * * *', missedFirePolicy: 'skip' }
  }, admin);
  expect(trigger.status).toBe(201);
  expect((await req(run.base, 'PUT', '/admin/workflows/campus', BUNDLE, admin)).status).toBe(200);
  expect((await req<{ result?: { word?: string } }>(run.base, 'POST', '/functions/hello', {})).json.result?.word).toBe('kept');
}

/** What the second service still has, read over HTTP with the FIRST service's admin credential. */
async function readBack(run: Running, admin: Record<string, string>) {
  const permissions = await req<{ config?: { collections?: Record<string, { permissions?: { find?: string } }> } }>(run.base, 'GET', '/admin/permissions', undefined, admin);
  const secrets = await req<{ secrets?: Array<{ name: string } | string> }>(run.base, 'GET', '/admin/secrets', undefined, admin);
  const triggers = await req<{ triggers?: Array<{ name: string }> }>(run.base, 'GET', '/admin/triggers', undefined, admin);
  const fn = await req<{ result?: { word?: string } }>(run.base, 'POST', '/functions/hello', {});
  const names = (secrets.json.secrets || []).map((s) => (typeof s === 'string' ? s : s.name));
  return {
    adminStatus: permissions.status,
    answerFind: permissions.json.config?.collections?.Answer?.permissions?.find ?? null,
    secret: names.includes('MAILCHIMP_KEY'),
    trigger: (triggers.json.triggers || []).some((t) => t.name === 'Digest'),
    fn: fn.json.result?.word ?? null
  };
}

afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

// `_noodl_cloudservices` is one per process (see HST-010's suite): services run one after the other.
describe('P115 HST-011 — the data dir kept in a store the host hands in', () => {
  it('control: with no store, a service started in an empty data dir has lost the rule, the secret, the schedule and the function', async () => {
    const first = await start('control-1');
    const admin = { authorization: `Bearer ${adminToken(first.dataDir)}` };
    await setUp(first, admin);
    await evict(first);

    const second = await start('control-2');
    const own = { authorization: `Bearer ${adminToken(second.dataDir)}` };
    // The first service's credential is gone with its dir: a fresh one was minted.
    expect((await readBack(second, admin)).adminStatus).toBe(401);
    const back = await readBack(second, own);
    expect(back).toEqual({ adminStatus: 200, answerFind: null, secret: false, trigger: false, fn: null });
    await second.service.stop();
  });

  it('handed a store, a service started in an empty data dir has all four back, and the first credential still opens it', async () => {
    const store = new MapStore();
    const first = await start('handed-1', store);
    const admin = { authorization: `Bearer ${adminToken(first.dataDir)}` };
    await setUp(first, admin);
    expect(store.list().sort()).toEqual(expect.arrayContaining(['secrets.json', 'security.json', 'triggers.json', 'workflows/campus.workflow.json']));
    // Only the data dir's own files: never the records, the history or a temporary file.
    expect(store.list().filter((rel) => !rel.endsWith('.json'))).toEqual([]);
    await evict(first);

    const second = await start('handed-2', store);
    expect(second.service.dataDirFilesRestored).toBe(store.list().length);
    expect(await readBack(second, admin)).toEqual({ adminStatus: 200, answerFind: 'public', secret: true, trigger: true, fn: 'kept' });

    // A removal reaches the store: gone after the next eviction too.
    expect((await req(second.base, 'DELETE', '/admin/secrets/MAILCHIMP_KEY', undefined, admin)).status).toBeLessThan(300);
    expect((await req(second.base, 'DELETE', '/admin/workflows/campus', undefined, admin)).status).toBe(200);
    expect(store.list()).not.toContain('workflows/campus.workflow.json');
    await evict(second);

    const third = await start('handed-3', store);
    const after = await readBack(third, admin);
    expect(after).toEqual({ adminStatus: 200, answerFind: 'public', secret: false, trigger: true, fn: null });

    // A store that refuses a write fails that request, loudly, instead of keeping the setting in memory only.
    store.refuse = true;
    const refused = await req(third.base, 'PUT', '/admin/secrets/LATER', { value: 'x' }, admin);
    expect(refused.status).toBeGreaterThanOrEqual(500);
    store.refuse = false;
    await third.service.stop();

    // After stop() the store is let go: a write to that dir no longer reaches it.
    const before = store.list().length;
    const { writeDataJSON } = await import('../src/config/dataDirStore');
    writeDataJSON(path.join(third.dataDir, 'late.json'), { late: true });
    expect(store.list().length).toBe(before);
  });

  it("census: every file under src/ that still writes the disk directly is one HST-011 names, with its reason", () => {
    const OUT_OF_SCOPE: Record<string, string> = {
      'config/dataDirStore.ts': 'the seam itself',
      'backup/archive.ts': 'backup archives, written to their destination (not the data dir on a Worker)',
      'backup/snapshot.ts': "a database snapshot into a backup's work folder",
      'backup/BackupManager.ts': 'restore swaps data/local.db, a stopped-service operation; on a Worker the records are the object\'s SQLite',
      'cli.ts': 'the command line: a machine with a disk',
      'migrate/move.ts': 'moving records between stores (command line)',
      'migrate/verify.ts': 'checking a move (command line)',
      'server/files.ts': 'the thumbnail cache, rebuilt on a miss',
      'storage/FileSubsystem.ts': 'clears the thumbnail cache',
      'storage/LocalDriver.ts': 'file bytes: the file driver (HST-012)',
      'storage/S3Driver.ts': 'file bytes in a bucket (HST-012)'
    };
    const src = path.join(__dirname, '..', 'src');
    const writes = /\b(writeFileSync|renameSync|unlinkSync|rmSync|appendFileSync|copyFileSync|createWriteStream)\(|fs\.(promises\.)?(writeFile|unlink|rename|rm|appendFile|copyFile)\(/;
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (path.relative(src, full) !== path.join('admin', 'app')) walk(full);
        } else if (/\.tsx?$/.test(e.name) && writes.test(fs.readFileSync(full, 'utf-8'))) {
          found.push(path.relative(src, full).split(path.sep).join('/'));
        }
      }
    };
    walk(src);
    const unnamed = found.filter((f) => !(f in OUT_OF_SCOPE));
    // A file here writes the disk without `writeDataFile`: on a Worker that write is lost at the next restart.
    expect(unnamed).toEqual([]);
    // And the list does not keep a name that no longer writes (a stale exemption hides the next writer).
    expect(Object.keys(OUT_OF_SCOPE).filter((f) => !found.includes(f))).toEqual([]);
  });
});
