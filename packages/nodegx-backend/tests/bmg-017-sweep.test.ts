/**
 * BMG-017 row 2 — the orphan sweep never deletes a file that is still arriving.
 *
 * An upload writes its bytes, THEN its `_Files` row; a move writes the bucket
 * copy, THEN re-points the row. The sweep read every row, then listed every
 * stored object, and deleted whatever had no row — so a blob landing between
 * the two was deleted, and its row then pointed at nothing. Here the upload and
 * the move are HELD between their blob and their row (the live driver's `put`
 * waits on a gate), *Delete orphans* runs in the gap, and both files must
 * serve afterwards. A blob younger than the grace window is reported as too
 * new to judge; an old orphan is still deleted.
 *
 * And, found while measuring this row: the bucket is shared with the backup
 * archives (BMG-015, `backups/`), and the sweep listed the WHOLE bucket — every
 * archive was an "orphan", deleted by *Delete orphans*. The file store's keys
 * are the ones `put` writes; nothing else in the bucket is the sweep's to judge.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { StorageDriver } from '../src/storage/types';

import { request } from './helpers/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createS3Fake } = require('./helpers/s3-fake') as typeof import('./helpers/s3-fake');

jest.setTimeout(90000);

const KEY_ID = 'AKIAPUPPY';
const SECRET = 'puppy-secret-key-never-shown';
const HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000);
/** A key of the shape `put` writes: two fan-out levels, the sha256, a random suffix. */
const putShaped = (lead: string) => `${lead.slice(0, 2)}/${lead.slice(2, 4)}/${lead.padEnd(64, '0')}-0badf00d`;

interface SweepReport {
  orphanBlobs: string[];
  orphanRows: string[];
  tooNew?: string[];
  graceMinutes?: number;
  deleted: boolean;
  error?: string;
}

/** Hold `driver.put` after the bytes land, until `release()` — the blob exists, the row does not. */
function holdPut(driver: StorageDriver) {
  const realPut = driver.put.bind(driver);
  let landed: (key: string) => void = () => undefined;
  let release: () => void = () => undefined;
  const whenLanded = new Promise<string>((r) => (landed = r));
  const gate = new Promise<void>((r) => (release = r));
  driver.put = async (hash: string, data: Buffer) => {
    const key = await realPut(hash, data);
    landed(key);
    await gate;
    return key;
  };
  return {
    whenLanded,
    release: () => {
      release();
      driver.put = realPut;
    }
  };
}

describe('BMG-017 row 2 — the sweep never deletes the young', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let fake: ReturnType<typeof createS3Fake>;
  let endpoint: string;
  const T = { authorization: 'Bearer t0k' };
  const req = <R = any>(method: string, p: string, body?: unknown) => request<R>(base, method, p, { body, headers: T });
  const upload = (name: string, bytes: Buffer) =>
    request<{ name: string }>(base, 'POST', '/files/' + encodeURIComponent(name), {
      body: bytes as unknown as Record<string, unknown>,
      raw: true,
      headers: { ...T, 'content-type': 'text/plain', 'content-length': String(bytes.length) }
    });
  const bytesOf = async (name: string) => {
    const res = await fetch(base + '/files/' + encodeURIComponent(name), { headers: T });
    return { status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
  };
  const sweep = async (deleteOrphans: boolean) => (await req<{ report: SweepReport }>('POST', '/admin/files/sweep', { deleteOrphans })).json.report;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const files = () => (service as any).files as { getDriver(): StorageDriver; bucketDriver(): StorageDriver | null; mover: { whenDone(): Promise<void> } };

  beforeAll(async () => {
    fake = createS3Fake({ bucket: 'puppy', accessKeyId: KEY_ID, secretAccessKey: SECRET });
    endpoint = await fake.listen();
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg017-sweep-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg017sweep', backendName: 'BMG-017', authToken: 't0k' });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    if (service) await service.stop();
    if (fake) await fake.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('AC2: an upload held between its blob and its row survives Delete orphans, is counted too new, and serves', async () => {
    const BYTES = Buffer.from('arriving while the sweep runs\n');
    const held = holdPut(files().getDriver());
    const pending = upload('arriving.txt', BYTES);
    const key = await held.whenLanded;

    let report: SweepReport;
    try {
      report = await sweep(true);
    } finally {
      held.release(); // a red assertion must not leave the next upload gated
    }
    expect(report.error).toBeUndefined();
    expect(report.orphanBlobs).not.toContain(key);
    expect(report.tooNew).toEqual([key]);
    expect(report.graceMinutes).toBe(5);

    const up = await pending;
    expect(up.status).toBe(201);
    const served = await bytesOf(up.json.name);
    expect(served.status).toBe(200);
    expect(served.buf.equals(BYTES)).toBe(true);
  });

  it('an OLD orphan on this machine is still deleted', async () => {
    const key = putShaped('ffee');
    const full = path.join(dataDir, 'files', 'blobs', ...key.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, 'stray');
    fs.utimesSync(full, HOUR_AGO(), HOUR_AGO());
    const report = await sweep(true);
    expect(report.orphanBlobs).toEqual([key]);
    expect(report.deleted).toBe(true);
    expect(fs.existsSync(full)).toBe(false);
  });

  describe('with a bucket', () => {
    let movedName = '';
    const MOVED = Buffer.from('on this machine until the move\n');

    beforeAll(async () => {
      const up = await upload('to-move.txt', MOVED);
      expect(up.status).toBe(201);
      movedName = up.json.name;
      const saved = await req('PUT', '/admin/files/config', {
        driver: { type: 's3', endpoint, region: 'us-east-1', bucket: 'puppy', forcePathStyle: true },
        s3Credentials: { accessKeyId: KEY_ID, secretAccessKey: SECRET }
      });
      expect(saved.status).toBe(200);
    });

    it('AC2: a move held between its bucket copy and its row survives Delete orphans, and serves from the bucket', async () => {
      const bucket = files().bucketDriver();
      expect(bucket).not.toBeNull();
      const held = holdPut(bucket!);
      expect((await req('POST', '/admin/files/move', {})).status).toBe(202);
      const key = await held.whenLanded;

      let report: SweepReport;
      try {
        report = await sweep(true);
      } finally {
        held.release();
      }
      expect(report.orphanBlobs).not.toContain(key);
      expect(report.tooNew).toContain(key);
      await files().mover.whenDone();
      const moved = await req<{ progress: { moved: number; failed: unknown[] } }>('GET', '/admin/files/move');
      expect(moved.json.progress.failed).toEqual([]);
      const served = await bytesOf(movedName);
      expect(served.status).toBe(200);
      expect(served.buf.equals(MOVED)).toBe(true);
      expect(fake.objects.has(key)).toBe(true);
    });

    it('a backup archive and a foreign object in the bucket are not the sweep’s: neither listed nor deleted; an old stray file is', async () => {
      await req('PUT', '/admin/backups/config', { destination: { type: 's3' } });
      const run = await req<{ archive: string }>('POST', '/admin/backups', {});
      expect(run.status).toBe(200);
      const archives = fake.keys('backups/');
      expect(archives.length).toBe(1);
      // Old enough that the grace window is not what spares them.
      for (const k of archives) fake.objects.get(k)!.lastModified = HOUR_AGO().toISOString();
      fake.objects.set('photos/holiday.jpg', { body: Buffer.from('not ours'), lastModified: HOUR_AGO().toISOString() });
      const stray = putShaped('abcd');
      fake.objects.set(stray, { body: Buffer.from('stray'), lastModified: HOUR_AGO().toISOString() });

      const report = await sweep(true);
      expect(report.error).toBeUndefined();
      expect(report.orphanBlobs).toEqual([stray]);
      expect(fake.objects.has(stray)).toBe(false);
      expect(fake.keys('backups/')).toEqual(archives);
      expect(fake.objects.has('photos/holiday.jpg')).toBe(true);
    });
  });
});
