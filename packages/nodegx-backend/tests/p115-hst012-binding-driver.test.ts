/**
 * P115 HST-012 — files in a bucket the host hands in (`BackendServiceOptions.filesBucket`, `storage/BindingDriver.ts`).
 *
 * On a Cloudflare Worker the disk beside the data dir is the isolate's memory: an upload kept there is gone when the
 * isolate is replaced. The host binds an R2 bucket instead and hands it to the service. These specs run the whole
 * service over a fake bucket (a Map shaped as an `R2Bucket`) and grade what a person and the sweep see:
 *
 *   - an upload lands in the bucket, not on the disk, and its `_Files` row says `binding` (its own key space);
 *   - its link answers 200 signed out with the exact bytes, and a ranged GET asks the bucket for the slice only;
 *   - the orphan sweep walks the bucket: a file with a row is kept, an old blob without one is deleted, and an object
 *     that is not a file (a backup archive kept in the same bucket) is never listed, so never deleted;
 *   - a bucket typed on the Storage page still wins for the NEXT upload, and a `binding` row stays served from the
 *     host's bucket (the row names its store, BMG-015);
 *   - a backend started WITHOUT the binding refuses a `binding` row with a sentence, not a 404 or an empty file;
 *   - the Storage page's config names the host's bucket (`hostBucket`), not "this machine".
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { FileConfigResponse } from '../src/server/admin-files';
import type { FileUploadResult } from '../src/server/files';

import { fakeBucket, FakeBucket } from './helpers/fake-bucket';
import { request } from './helpers/http';

jest.setTimeout(30000);

const PDF = Buffer.from('%PDF-1.4\n%the campus timetable, 0123456789\n%%EOF', 'ascii');

interface Running {
  service: BackendService;
  base: string;
  dataDir: string;
  adminToken: string;
}

async function boot(dataDir: string, filesBucket: FakeBucket | null): Promise<Running> {
  const service = new BackendService({ dataDir, port: 0, backendId: 'hst012', backendName: 'HST-012', filesBucket });
  const base = (await service.start()).listen.url;
  const adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
  return { service, base, dataDir, adminToken };
}

async function upload(r: Running, name: string, bytes: Buffer): Promise<FileUploadResult> {
  const res = await request<FileUploadResult>(r.base, 'POST', `/files/${name}`, { body: bytes, raw: true });
  if (res.status !== 201) throw new Error(`upload ${name}: ${res.status} ${res.text}`);
  return res.json;
}

/** Every file under the data dir's blob folder (the disk store). */
function diskBlobs(dataDir: string): string[] {
  const root = path.join(dataDir, 'files', 'blobs');
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const n of fs.readdirSync(d)) {
      const f = path.join(d, n);
      if (fs.statSync(f).isDirectory()) walk(f);
      else out.push(f);
    }
  };
  walk(root);
  return out;
}

type FilesSubsystem = {
  runSweepNow(del?: boolean): Promise<{ orphanBlobs: string[]; orphanRows: string[]; tooNew: string[]; error?: string }>;
  metadata: { findByStoredName(n: string): Promise<{ driver: string; key: string } | null> };
};
const filesOf = (r: Running) => (r.service as unknown as { files: FilesSubsystem }).files;

describe('P115 HST-012: files in a bucket the host hands in', () => {
  let bucket: FakeBucket;
  let r: Running;

  beforeAll(async () => {
    bucket = fakeBucket(2);
    r = await boot(fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-hst012-')), bucket);
  });

  afterAll(async () => {
    await r.service.stop();
    fs.rmSync(r.dataDir, { recursive: true, force: true });
  });

  it('an upload lands in the bucket, not on the disk, and its row says `binding`', async () => {
    const before = bucket.objects.size;
    const up = await upload(r, 'timetable.pdf', PDF);
    expect(bucket.objects.size).toBe(before + 1);
    expect(diskBlobs(r.dataDir)).toEqual([]);
    const row = await filesOf(r).metadata.findByStoredName(up.name);
    expect(row?.driver).toBe('binding');
    expect(bucket.objects.has(row?.key as string)).toBe(true);
  });

  it('its link answers 200 signed out with the exact bytes; a ranged GET asks the bucket for the slice only', async () => {
    const up = await upload(r, 'ranged.pdf', PDF);
    const whole = await fetch(up.url);
    expect(whole.status).toBe(200);
    expect(Buffer.from(await whole.arrayBuffer()).equals(PDF)).toBe(true);

    bucket.ranges.length = 0;
    const part = await fetch(up.url, { headers: { range: 'bytes=10-19' } });
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe(`bytes 10-19/${PDF.length}`);
    expect(Buffer.from(await part.arrayBuffer()).toString()).toBe(PDF.subarray(10, 20).toString());
    expect(bucket.ranges).toEqual([{ offset: 10, length: 10 }]);
  });

  it('deleting the file removes the object from the bucket', async () => {
    const up = await upload(r, 'gone.pdf', PDF);
    const row = await filesOf(r).metadata.findByStoredName(up.name);
    const del = await request(r.base, 'DELETE', `/files/${up.name}`);
    expect(del.status).toBe(200);
    expect(bucket.objects.has(row?.key as string)).toBe(false);
    expect((await fetch(up.url)).status).toBe(404);
  });

  it('the sweep walks the bucket: keeps a file with a row, deletes an old blob without one, never lists a non-file object', async () => {
    const kept = await upload(r, 'kept.pdf', PDF);
    const keptRow = await filesOf(r).metadata.findByStoredName(kept.name);
    const old = new Date(Date.now() - 60 * 60 * 1000);
    const orphanKey = 'ab/cd/' + 'a'.repeat(64) + '-0badf00d';
    bucket.objects.set(orphanKey, { bytes: new Uint8Array([1, 2, 3]), uploaded: old });
    // A backup archive (BMG-015 keeps them under `backups/`) or anything else a person keeps in the same bucket.
    bucket.objects.set('backups/campus-2026-11-05.tar.gz', { bytes: new Uint8Array([9]), uploaded: old });

    const report = await filesOf(r).runSweepNow(false);
    expect(report.error).toBeUndefined();
    expect(report.orphanBlobs).toEqual([orphanKey]);
    expect(report.orphanRows).toEqual([]);

    await filesOf(r).runSweepNow(true);
    expect(bucket.objects.has(orphanKey)).toBe(false);
    expect(bucket.objects.has('backups/campus-2026-11-05.tar.gz')).toBe(true);
    expect(bucket.objects.has(keptRow?.key as string)).toBe(true);
    expect((await fetch(kept.url)).status).toBe(200);
  });

  it('a bucket typed on the Storage page wins for the NEXT upload; a `binding` row is still served from the host bucket', async () => {
    const up = await upload(r, 'before-switch.pdf', PDF);
    const files = (r.service as unknown as {
      files: {
        updateConfig(p: unknown): unknown;
        getDriver(): { kind: string };
        stores(): Array<{ kind: string }>;
        driverFor(rec: { driver: string; storedName: string }): { kind: string };
      };
    }).files;
    try {
      files.updateConfig({ driver: { type: 's3', endpoint: 'https://s3.invalid', region: 'auto', bucket: 'typed', forcePathStyle: true } });
      expect(files.getDriver().kind).toBe('s3');
      expect(files.stores().map((d) => d.kind)).toEqual(['local', 'binding', 's3']);
      expect(files.driverFor({ driver: 'binding', storedName: up.name }).kind).toBe('binding');
      expect((await fetch(up.url)).status).toBe(200);
    } finally {
      files.updateConfig({ driver: { type: 'local' } });
    }
    expect(files.getDriver().kind).toBe('binding');
  });

  it('the Storage page is told the host bound a bucket, and that uploads are stored there', async () => {
    const res = await request<FileConfigResponse>(r.base, 'GET', '/admin/files/config', { headers: { authorization: `Bearer ${r.adminToken}` } });
    expect(res.status).toBe(200);
    expect(res.json.hostBucket).toBe(true);
    expect(res.json.driverKind).toBe('binding');
  });
});

describe('P115 HST-012: a `binding` row on a backend started without the binding', () => {
  it('refuses with a sentence naming the bucket, and serves again once the binding is back', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-hst012-nobind-'));
    const bucket = fakeBucket(2);
    let r = await boot(dataDir, bucket);
    const up = await upload(r, 'there.pdf', PDF);
    await r.service.stop();

    r = await boot(dataDir, null);
    try {
      const res = await fetch(`${r.base}/files/${up.name}`);
      expect(res.status).toBeGreaterThanOrEqual(500);
      expect(await res.text()).toMatch(/stored in the bucket this app's host binds to it/);
      const cfg = await request<FileConfigResponse>(r.base, 'GET', '/admin/files/config', { headers: { authorization: `Bearer ${r.adminToken}` } });
      expect(cfg.json.hostBucket).toBe(false);
      expect(cfg.json.driverKind).toBe('local');
    } finally {
      await r.service.stop();
    }

    r = await boot(dataDir, bucket);
    try {
      const back = await fetch(`${r.base}/files/${up.name}`);
      expect(back.status).toBe(200);
      expect(Buffer.from(await back.arrayBuffer()).equals(PDF)).toBe(true);
    } finally {
      await r.service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
