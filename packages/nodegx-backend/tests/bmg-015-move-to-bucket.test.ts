/**
 * BMG-015 §7 — *Move files to the bucket*, over the S3 fake.
 *
 * Files uploaded before a bucket was connected stay on this machine (AC6 of
 * `bmg-015-storage-off-the-disk.test.ts`). The move takes them there, one at a
 * time, in the background: a file's row names the bucket only once all of its
 * bytes are in it, and a file that cannot be moved stays where it is and keeps
 * serving.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { FileMoveResponse } from '../src/server/admin-files';
import type { AuditEntry } from '../src/ops/audit';
import { NO_BUCKET_TO_MOVE_TO, moveOneToBucket } from '../src/storage/moveToBucket';
import type { FileRecord } from '../src/storage/MetadataStore';
import type { StorageDriver } from '../src/storage/types';
import { moveWords } from '../src/admin/app/views/files';

import { request } from './helpers/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createS3Fake } = require('./helpers/s3-fake') as typeof import('./helpers/s3-fake');

jest.setTimeout(90000);

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'public', get: 'public', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: false
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'nobody'
};
const KEY_ID = 'AKIAMOVE';
const SECRET = 'move-secret-key';
const ONE = Buffer.from('the first file, on this machine\n', 'utf8');
const TWO = Buffer.from('the second file, a little longer, also on this machine\n', 'utf8');
const LOST = Buffer.from('this one loses its bytes before the move\n', 'utf8');

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('BMG-015 §7 — Move files to the bucket', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let fake: ReturnType<typeof createS3Fake>;
  let endpoint: string;
  const T = { authorization: 'Bearer t0k' };
  const R = { authorization: 'Bearer r0k' };
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = T) =>
    request<T>(base, method, p, { body, headers });
  const upload = async (name: string, bytes: Buffer) => {
    const res = await request<{ name: string }>(base, 'POST', '/files/' + encodeURIComponent(name), {
      body: bytes as unknown as Record<string, unknown>,
      raw: true,
      headers: { ...T, 'content-type': 'text/plain', 'content-length': String(bytes.length) }
    });
    expect(res.status).toBe(201);
    return res.json.name;
  };
  const served = async (name: string) => Buffer.from(await (await fetch(base + '/files/' + encodeURIComponent(name), { headers: T })).arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const files = () => (service as any).files as { metadata: { findByStoredName: (n: string) => Promise<FileRecord | null> }; mover: { whenDone: () => Promise<void> } };
  const blobs = () => walk(path.join(dataDir, 'files', 'blobs'));
  const names: Record<string, string> = {};

  beforeAll(async () => {
    fake = createS3Fake({ bucket: 'crate', accessKeyId: KEY_ID });
    endpoint = await fake.listen();
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg015-move-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg015move', backendName: 'BMG-015 move', authToken: 't0k', readonlyToken: 'r0k' });
    base = (await service.start()).listen.url;
    names.one = await upload('one.txt', ONE);
    names.two = await upload('two.txt', TWO);
    names.lost = await upload('lost.txt', LOST);
  });

  afterAll(async () => {
    if (service) await service.stop();
    if (fake) await fake.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('with no bucket there is nothing to move to: the count is there, the press is refused by sentence', async () => {
    const status = await req<FileMoveResponse>('GET', '/admin/files/move');
    expect(status.status).toBe(200);
    expect(status.json).toMatchObject({ onThisMachine: 3, bucketConnected: false, progress: { state: 'idle' } });
    const refused = await req<{ error: string }>('POST', '/admin/files/move', {});
    expect(refused.status).toBe(400);
    expect(refused.json.error).toBe(NO_BUCKET_TO_MOVE_TO);
  });

  it('moves every file it can into the bucket; the one whose bytes are gone stays, named, with a sentence', async () => {
    const saved = await req('PUT', '/admin/files/config', {
      driver: { type: 's3', endpoint, region: 'us-east-1', bucket: 'crate', forcePathStyle: true },
      s3Credentials: { accessKeyId: KEY_ID, secretAccessKey: SECRET }
    });
    expect(saved.status).toBe(200);
    const lostRow = (await files().metadata.findByStoredName(names.lost))!;
    fs.rmSync(path.join(dataDir, 'files', 'blobs', lostRow.key));
    expect((await req('POST', '/admin/files/move', {}, R)).status).toBe(403);

    const started = await req<FileMoveResponse>('POST', '/admin/files/move', {});
    expect(started.status).toBe(202);
    expect(started.json.progress.state).toBe('running');
    await files().mover.whenDone();

    const done = await req<FileMoveResponse>('GET', '/admin/files/move');
    expect(done.json.progress).toMatchObject({ state: 'done', total: 3, moved: 2, bytes: ONE.length + TWO.length });
    expect(done.json.progress.failed).toEqual([{ name: names.lost, error: 'Its bytes are not on this machine any more; the orphan sweep lists its row.' }]);
    expect(done.json.onThisMachine).toBe(1);

    for (const [name, bytes] of [[names.one, ONE], [names.two, TWO]] as const) {
      const row = (await files().metadata.findByStoredName(name))!;
      expect(row.driver).toBe('s3');
      expect(fake.objects.get(row.key)!.body.equals(bytes)).toBe(true);
      const seen = fake.seen.length;
      expect((await served(name)).equals(bytes)).toBe(true);
      expect(fake.seen.slice(seen)).toContain('GET /crate/' + row.key); // served FROM the bucket now
    }
    expect(blobs()).toEqual([]); // both local copies gone, and the lost one never existed
    expect((await files().metadata.findByStoredName(names.lost))!.driver).toBe('local');

    const trail = (await req<{ entries: AuditEntry[] }>('GET', '/admin/audit?action=files.move')).json.entries;
    expect(trail.map((e) => e.outcome)).toContain('success');
    expect(moveWords(done.json)).toBe('2 files moved to the bucket, 1 file left where it was. 1 file is still on this machine. They keep serving from here; new uploads go to the bucket.');
  });

  it('a file whose bytes do not all arrive, or whose row changed meanwhile, is left where it was — and the bucket copy is removed', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facade = (service as any).facade;
    const name = await upload('careful.txt', ONE);
    // Uploads go to the bucket now; put this one's row back on this machine by hand to have one to move.
    const inBucket = (await files().metadata.findByStoredName(name))!;
    const localDir = path.join(dataDir, 'files', 'blobs', 'zz');
    fs.mkdirSync(localDir, { recursive: true });
    fs.writeFileSync(path.join(localDir, 'careful'), ONE);
    await facade.rawSave('_Files', inBucket.objectId, { driver: 'local', key: 'zz/careful' });
    const row = (await files().metadata.findByStoredName(name))!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const local = (service as any).files.local as StorageDriver;
    const objects = new Map<string, Buffer>();
    const bucket = (statSize: (n: number) => number): StorageDriver => ({
      kind: 's3',
      put: async (hash, data) => {
        objects.set('k/' + hash, data);
        return 'k/' + hash;
      },
      get: async (key) => objects.get(key)!,
      createReadStream: () => {
        throw new Error('unused');
      },
      delete: async (key) => {
        objects.delete(key);
      },
      stat: async (key) => ({ exists: objects.has(key), size: statSize(objects.get(key)!.length) }),
      async *listKeys() {
        yield* objects.keys();
      }
    });

    await expect(moveOneToBucket(row, local, bucket((n) => n - 1), facade)).rejects.toThrow(/left on this machine/);
    expect(objects.size).toBe(0);
    expect((await files().metadata.findByStoredName(name))!).toMatchObject({ driver: 'local', key: 'zz/careful' });

    const stale = { ...row, key: 'zz/not-what-the-row-says-now' };
    fs.writeFileSync(path.join(localDir, 'not-what-the-row-says-now'), ONE);
    await expect(moveOneToBucket(stale, local, bucket((n) => n), facade)).rejects.toThrow(/^Precondition /);
    expect(objects.size).toBe(0);
    expect((await files().metadata.findByStoredName(name))!).toMatchObject({ driver: 'local', key: 'zz/careful' });
    expect((await served(name)).equals(ONE)).toBe(true);
  });

  it('the card says what is where, in words', () => {
    const idle = { state: 'idle' as const, total: 0, moved: 0, bytes: 0, failed: [] };
    expect(moveWords({ onThisMachine: 12, bucketConnected: true, progress: idle })).toBe('12 files are still on this machine. They keep serving from here; new uploads go to the bucket.');
    expect(moveWords({ onThisMachine: 0, bucketConnected: true, progress: { ...idle, state: 'done', total: 3, moved: 3 } })).toBe('3 files moved to the bucket. Every file is in the bucket.');
    expect(moveWords({ onThisMachine: 5, bucketConnected: true, progress: { ...idle, state: 'running', total: 5, moved: 2, bytes: 2048 } })).toMatch(/^Moving 3 of 5… 2(\.0)? KB so far/);
  });
});
