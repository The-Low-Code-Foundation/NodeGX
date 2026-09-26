/**
 * BMG-015 — Storage off the disk: uploads AND backups in an S3-compatible
 * bucket, chosen on the page, measured over a real LOCKED BackendService and
 * the S3 fake (`tests/helpers/s3-fake.js`, path-style, SigV4 key id checked).
 *
 * AC1: *Test connection* answers connected against the fake (and the probe key
 *      is gone afterwards); a wrong key answers S3's own `InvalidAccessKeyId`
 *      sentence, a wrong bucket names it, an unreachable endpoint says so; a
 *      save with a failing bucket is 400 with the sentence and persists NOTHING
 *      (driver still local, no credential stored). AC2: after the save an
 *      upload lands in the bucket and not under `data/files/blobs`, its row
 *      says `s3`, and it serves back byte-equal through the driver. AC6: the
 *      file uploaded BEFORE the switch still serves (from this machine — the
 *      bucket sees no GET for it) and deletes from the right store; switching
 *      back to local makes the bucket file a loud sentence, not a 404, and
 *      reconnecting serves it again; the sweep walks BOTH stores. AC3: the
 *      bucket destination is refused until a bucket is connected; *Back up
 *      now* writes under `backups/`, the list shows it `where:'s3'`, the
 *      download is byte-equal to the object, a restore from it on the RUNNING
 *      backend reconnects (the record written after the backup is gone, a
 *      write after the restore lands), the safety copy goes to the bucket
 *      too, and a failed download is a 502 that leaves the running database
 *      untouched. AC4: retention deletes from the bucket; back on local it
 *      still deletes from the directory. AC5: no admin GET carries the secret.
 * AC7: the test route is a declared dry run; a read-only admin is refused.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { SecretsStore } from '../src/config/SecretsStore';
import { FILES_SECRETS_NAMESPACE } from '../src/storage/FileSubsystem';
import { BUCKET_NOT_SAVED } from '../src/server/admin-files';
import type { FileConfigResponse, FileConfigTestResponse } from '../src/server/admin-files';
import { NO_BUCKET_CONNECTED } from '../src/server/admin-backups';
import type { BackupListResponse } from '../src/server/admin-backups';
import { auditExemptionFor } from '../src/ops/audit-actions';
import type { AuditEntry } from '../src/ops/audit';

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

const KEY_ID = 'AKIAPUPPY';
const SECRET = 'puppy-secret-key-never-shown';
const BEFORE = Buffer.from('uploaded before the switch to the bucket\n', 'utf8');
const AFTER = Buffer.from('uploaded after the switch to the bucket — lives in the fake\n', 'utf8');

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

describe('BMG-015 storage off the disk', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let fake: ReturnType<typeof createS3Fake>;
  let endpoint: string;
  const T = { authorization: 'Bearer t0k' };
  const R = { authorization: 'Bearer r0k' };
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = T) =>
    request<T>(base, method, p, { body, headers });
  const upload = (name: string, bytes: Buffer, type: string) =>
    request<{ name: string; url: string }>(base, 'POST', '/files/' + encodeURIComponent(name), {
      body: bytes as unknown as Record<string, unknown>,
      raw: true,
      headers: { ...T, 'content-type': type, 'content-length': String(bytes.length) }
    });
  const bytesOf = async (p: string, headers: Record<string, string> = T) => {
    const res = await fetch(base + p, { headers });
    const json = res.headers.get('content-type')?.includes('json') ? await res.json().catch(() => null) : null;
    return { status: res.status, buf: json ? Buffer.alloc(0) : Buffer.from(await res.arrayBuffer()), json };
  };
  const s3Driver = (over: Record<string, unknown> = {}) => ({ type: 's3', endpoint, region: 'us-east-1', bucket: 'puppy', forcePathStyle: true, ...over });
  const creds = (id = KEY_ID, secret = SECRET) => ({ accessKeyId: id, secretAccessKey: secret });
  const blobs = () => walk(path.join(dataDir, 'files', 'blobs'));
  const entries = async (query: string) => (await req<{ entries: AuditEntry[] }>('GET', `/admin/audit?${query}`)).json.entries;

  let beforeName = '';
  let afterName = '';

  beforeAll(async () => {
    fake = createS3Fake({ bucket: 'puppy', accessKeyId: KEY_ID, secretAccessKey: SECRET });
    endpoint = await fake.listen();
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg015-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg015', backendName: 'BMG-015', authToken: 't0k', readonlyToken: 'r0k' });
    const started = await service.start();
    base = started.listen.url;
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
    const up = await upload('before.txt', BEFORE, 'text/plain');
    expect(up.status).toBe(201);
    beforeName = up.json.name;
  });

  afterAll(async () => {
    if (service) await service.stop();
    if (fake) await fake.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ------------------------------------------------------- before a bucket --

  describe('before a bucket is connected', () => {
    it('the config says local, no credential, and the backups refuse the bucket destination by sentence', async () => {
      const cfg = await req<FileConfigResponse>('GET', '/admin/files/config');
      expect(cfg.json.config.driver).toEqual({ type: 'local' });
      expect(cfg.json.driverKind).toBe('local');
      expect(cfg.json.s3CredentialsConfigured).toBe(false);
      const list = await req<BackupListResponse>('GET', '/admin/backups');
      expect(list.json.bucket).toEqual({ connected: false, name: null });
      const refused = await req<{ error: string }>('PUT', '/admin/backups/config', { destination: { type: 's3' } });
      expect(refused.status).toBe(400);
      expect(refused.json.error).toBe(NO_BUCKET_CONNECTED);
      expect((await req<BackupListResponse>('GET', '/admin/backups')).json.config.destination.type).toBe('local');
    });
  });

  // ----------------------------------------------------------------- AC1 --

  describe('AC1 — Test connection, and a save that refuses', () => {
    it('answers connected against the fake, and the probe key is gone afterwards', async () => {
      const seenBefore = fake.seen.length;
      const res = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: s3Driver(), s3Credentials: creds() });
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.words).toMatch(/^Connected: a test file was written to "puppy"/);
      const seen = fake.seen.slice(seenBefore);
      expect(seen[0]).toBe('HEAD /puppy');
      expect(seen[1]).toMatch(/^PUT \/puppy\/nodegx-probe-/);
      expect(seen[2]).toMatch(/^DELETE \/puppy\/nodegx-probe-/);
      expect(fake.keys()).toEqual([]);
    });

    it("a wrong key answers S3's own sentence; a wrong bucket is named; an unreachable endpoint says so", async () => {
      const wrongKey = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: s3Driver(), s3Credentials: creds('AKIANOBODY') });
      expect(wrongKey.json.ok).toBe(false);
      expect(wrongKey.json.words).toMatch(/^InvalidAccessKeyId: The Access Key Id you provided does not exist/);
      const wrongBucket = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: s3Driver({ bucket: 'kitten' }), s3Credentials: creds() });
      expect(wrongBucket.json.ok).toBe(false);
      expect(wrongBucket.json.words).toBe(`There is no bucket called "kitten" at ${endpoint}.`);
      const unreachable = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: s3Driver({ endpoint: 'http://127.0.0.1:1' }), s3Credentials: creds() });
      expect(unreachable.json.ok).toBe(false);
      expect(unreachable.json.words).toMatch(/^Could not reach http:\/\/127\.0\.0\.1:1: /);
      const noKey = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: s3Driver() });
      expect(noKey.json.ok).toBe(false);
      expect(noKey.json.words).toBe('The bucket needs an access key id and a secret access key.');
      const notUrl = await req<{ error: string }>('POST', '/admin/files/config/test', { driver: s3Driver({ endpoint: 'minio.local:9000' }) });
      expect(notUrl.status).toBe(400);
      expect(notUrl.json.error).toMatch(/must start with http/);
    });

    it('a local driver has nothing to test; a read-only admin is refused; the route is a declared dry run', async () => {
      const local = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: { type: 'local' } });
      expect(local.json).toEqual({ ok: true, words: 'Files stay on this machine; there is nothing to test.' });
      const ro = await req('POST', '/admin/files/config/test', { driver: s3Driver(), s3Credentials: creds() }, R);
      expect(ro.status).toBe(403);
      expect(auditExemptionFor('POST', 'admin/files/config/test')).toMatch(/dry run/);
    });

    it('a save with a failing bucket is 400 with the sentence and persists nothing', async () => {
      const refused = await req<{ error: string }>('PUT', '/admin/files/config', { driver: s3Driver(), s3Credentials: creds('AKIANOBODY') });
      expect(refused.status).toBe(400);
      expect(refused.json.error.startsWith(BUCKET_NOT_SAVED)).toBe(true);
      expect(refused.json.error).toMatch(/InvalidAccessKeyId/);
      const cfg = await req<FileConfigResponse>('GET', '/admin/files/config');
      expect(cfg.json.config.driver).toEqual({ type: 'local' });
      expect(cfg.json.s3CredentialsConfigured).toBe(false);
      const secrets = new SecretsStore(dataDir);
      expect(secrets.get(FILES_SECRETS_NAMESPACE, 's3AccessKeyId')).toBeUndefined();
      expect(fake.keys()).toEqual([]);
      // Still the store's own sentence for a driver with no endpoint (files-http pins it).
      const empty = await req<{ error: string }>('PUT', '/admin/files/config', { driver: { type: 's3', endpoint: '', bucket: '' } });
      expect(empty.status).toBe(400);
      expect(empty.json.error).toBe('an s3 driver requires endpoint and bucket');
    });

    it('a save with a working bucket switches the driver and stores the key (never echoed)', async () => {
      const saved = await req<FileConfigResponse>('PUT', '/admin/files/config', { driver: s3Driver(), s3Credentials: creds() });
      expect(saved.status).toBe(200);
      expect(saved.json.driverKind).toBe('s3');
      expect(saved.json.config.driver).toEqual(s3Driver());
      expect(saved.json.s3CredentialsConfigured).toBe(true);
      expect(JSON.stringify(saved.json)).not.toContain(SECRET);
      const onDisk = JSON.parse(fs.readFileSync(path.join(dataDir, 'files.json'), 'utf8'));
      expect(onDisk.driver.type).toBe('s3');
      expect(JSON.stringify(onDisk)).not.toContain(SECRET);
      expect(new SecretsStore(dataDir).get(FILES_SECRETS_NAMESPACE, 's3SecretAccessKey')).toBe(SECRET);
      expect(fake.keys()).toEqual([]); // the save's probe cleaned up too
      const trail = await entries('action=files.config.update');
      expect(trail.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------- AC2 --

  describe('AC2 — an upload lands in the bucket', () => {
    it('the object is in the fake and not under data/files/blobs; the row says s3; it serves back byte-equal', async () => {
      const localBefore = blobs().length;
      const up = await upload('after.txt', AFTER, 'text/plain');
      expect(up.status).toBe(201);
      afterName = up.json.name;
      expect(blobs().length).toBe(localBefore);
      const keys = fake.keys();
      expect(keys.length).toBe(1);
      expect(fake.objects.get(keys[0])!.body.equals(AFTER)).toBe(true);
      // The row names the store that holds it.
      const files = (service as unknown as { files: { metadata: { findByStoredName: (n: string) => Promise<{ driver: string; key: string } | null> } } }).files;
      const row = await files.metadata.findByStoredName(afterName);
      expect(row).not.toBeNull();
      expect(row!.driver).toBe('s3');
      expect(row!.key).toBe(keys[0]);
      const served = await bytesOf('/files/' + encodeURIComponent(afterName));
      expect(served.status).toBe(200);
      expect(served.buf.equals(AFTER)).toBe(true);
      expect(fake.seen.filter((s) => s === 'GET /puppy/' + keys[0]).length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------- AC6 --

  describe('AC6 — files stored before the switch still serve', () => {
    it('the earlier upload serves from this machine (the bucket sees no GET for it)', async () => {
      const seenBefore = fake.seen.length;
      const served = await bytesOf('/files/' + encodeURIComponent(beforeName));
      expect(served.status).toBe(200);
      expect(served.buf.equals(BEFORE)).toBe(true);
      expect(fake.seen.slice(seenBefore).filter((s) => s.startsWith('GET /puppy/'))).toEqual([]);
      const list = await req<{ files: Array<{ name: string }> }>('GET', '/admin/files');
      expect(list.json.files.map((f) => f.name).sort()).toEqual([afterName, beforeName].sort());
    });

    it('the sweep walks both stores: clean now, then one stray in each is reported and (on request) deleted', async () => {
      const clean = await req<{ report: { orphanBlobs: string[]; orphanRows: string[]; error?: string } }>('POST', '/admin/files/sweep', {});
      expect(clean.json.report.error).toBeUndefined();
      expect(clean.json.report.orphanBlobs).toEqual([]);
      expect(clean.json.report.orphanRows).toEqual([]);
      // BMG-017: an hour old (a younger blob may be an upload still writing its
      // row), and the bucket's stray has the shape `put` writes (the sweep
      // judges nothing else in a bucket it shares with the backups).
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const bucketStray = `ab/cd/abcd${'0'.repeat(60)}-0badf00d`;
      fake.objects.set(bucketStray, { body: Buffer.from('stray'), lastModified: hourAgo.toISOString() });
      const strayDir = path.join(dataDir, 'files', 'blobs', 'ff', 'ee');
      fs.mkdirSync(strayDir, { recursive: true });
      fs.writeFileSync(path.join(strayDir, 'stray-on-disk'), 'stray');
      fs.utimesSync(path.join(strayDir, 'stray-on-disk'), hourAgo, hourAgo);
      const found = await req<{ report: { orphanBlobs: string[]; orphanRows: string[] } }>('POST', '/admin/files/sweep', {});
      expect(found.json.report.orphanBlobs.sort()).toEqual([bucketStray, 'ff/ee/stray-on-disk']);
      expect(found.json.report.orphanRows).toEqual([]);
      const deleted = await req<{ report: { orphanBlobs: string[]; deleted: boolean } }>('POST', '/admin/files/sweep', { deleteOrphans: true });
      expect(deleted.json.report.deleted).toBe(true);
      expect(fake.objects.has(bucketStray)).toBe(false);
      expect(fs.existsSync(path.join(strayDir, 'stray-on-disk'))).toBe(false);
    });

    it('back on this machine, the bucket file is a loud sentence, not a 404; reconnecting serves it again', async () => {
      const back = await req<FileConfigResponse>('PUT', '/admin/files/config', { driver: { type: 'local' } });
      expect(back.status).toBe(200);
      expect(back.json.driverKind).toBe('local');
      expect(back.json.s3CredentialsConfigured).toBe(true); // the key is kept for the reconnect
      const still = await bytesOf('/files/' + encodeURIComponent(beforeName));
      expect(still.buf.equals(BEFORE)).toBe(true);
      const lost = await bytesOf('/files/' + encodeURIComponent(afterName));
      expect(lost.status).toBe(500);
      expect(String(lost.json && lost.json.error)).toMatch(/stored in a bucket this backend is no longer connected to/);
      // Reconnect with the STORED key: no credentials typed, the probe uses what is stored.
      const again = await req<FileConfigResponse>('PUT', '/admin/files/config', { driver: s3Driver() });
      expect(again.status).toBe(200);
      expect(again.json.driverKind).toBe('s3');
      const served = await bytesOf('/files/' + encodeURIComponent(afterName));
      expect(served.status).toBe(200);
      expect(served.buf.equals(AFTER)).toBe(true);
    });

    it('a delete goes to the store that holds the file', async () => {
      const localBefore = blobs().length;
      const delLocal = await req('DELETE', '/admin/files/' + encodeURIComponent(beforeName));
      expect(delLocal.status).toBe(200);
      expect(blobs().length).toBe(localBefore - 1);
      expect(fake.keys().length).toBe(1);
      const delBucket = await req('DELETE', '/admin/files/' + encodeURIComponent(afterName));
      expect(delBucket.status).toBe(200);
      expect(fake.keys()).toEqual([]);
    });
  });

  // ----------------------------------------------------------------- AC3 --

  describe('AC3 — backups in the bucket', () => {
    let firstArchive = '';
    let secondArchive = '';

    it('the destination can now be the bucket; Back up now writes under backups/ and the list shows it', async () => {
      const set = await req<{ config: { destination: unknown } }>('PUT', '/admin/backups/config', { destination: { type: 's3' } });
      expect(set.status).toBe(200);
      expect(set.json.config.destination).toEqual({ type: 's3', prefix: 'backups/' });
      const run = await req<{ ok: boolean; archive: string; bytes: number; deleted: string[] }>('POST', '/admin/backups', {});
      expect(run.status).toBe(200);
      expect(run.json.archive).toMatch(/^s3:\/\/puppy\/backups\/backup-.*\.ngxbackup\.tar\.gz$/);
      const keys = fake.keys('backups/');
      expect(keys.length).toBe(1);
      expect(fake.objects.get(keys[0])!.body.length).toBe(run.json.bytes);
      expect(fs.existsSync(path.join(dataDir, 'backups'))).toBe(false); // nothing landed on the disk
      const list = await req<BackupListResponse>('GET', '/admin/backups');
      expect(list.json.bucket).toEqual({ connected: true, name: 'puppy' });
      expect(list.json.backups.length).toBe(1);
      expect(list.json.backups[0].where).toBe('s3');
      expect(list.json.backups[0].bytes).toBe(run.json.bytes);
      expect(list.json.backups[0].path).toBe(run.json.archive);
      expect(list.json.backups[0].createdAt).toMatch(/^\d{4}-/);
      firstArchive = list.json.backups[0].file;
    });

    it('Download streams the object byte-equal', async () => {
      const res = await fetch(base + '/admin/backups/archive?file=' + encodeURIComponent(firstArchive), { headers: T });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toContain(firstArchive);
      const buf = Buffer.from(await res.arrayBuffer());
      expect(buf.equals(fake.objects.get('backups/' + firstArchive)!.body)).toBe(true);
      const unknown = await fetch(base + '/admin/backups/archive?file=not-there.ngxbackup.tar.gz', { headers: T });
      expect(unknown.status).toBe(404);
    });

    it('a failed download is a 502 that leaves the running database untouched', async () => {
      const before = await req<{ objectId: string }>('POST', '/classes/Pet', { name: 'Survives' });
      expect(before.status).toBe(201);
      fake.failNextGets(1);
      const res = await req<{ error: string }>('POST', '/admin/backups/restore', { archive: firstArchive, safetySnapshot: false });
      expect(res.status).toBe(502);
      expect(res.json.error).toMatch(/^Could not download ".*" from the bucket: /);
      expect(res.json.error).toMatch(/InternalError/);
      const pets = await req<{ results: Array<{ name: string }> }>('GET', '/classes/Pet');
      expect(pets.json.results.map((p) => p.name)).toContain('Survives');
      const written = await req<{ objectId: string }>('POST', '/classes/Pet', { name: 'Still writes' });
      expect(written.status).toBe(201);
    });

    it('Restore from the bucket on the running backend: the later record is gone, the safety copy is in the bucket, a later write lands', async () => {
      const run = await req<{ archive: string }>('POST', '/admin/backups', {});
      expect(run.status).toBe(200);
      secondArchive = run.json.archive.split('/').pop()!;
      const after = await req<{ objectId: string }>('POST', '/classes/Pet', { name: 'After the second backup' });
      expect(after.status).toBe(201);

      const restored = await req<{ ok: boolean; reconnected: boolean; restoredFrom: string; safetyArchive: string | null; integrity: { ok: boolean } }>(
        'POST',
        '/admin/backups/restore',
        { archive: secondArchive }
      );
      expect(restored.status).toBe(200);
      expect(restored.json.ok).toBe(true);
      expect(restored.json.reconnected).toBe(true);
      expect(restored.json.integrity.ok).toBe(true);
      expect(restored.json.restoredFrom).toBe('s3://puppy/backups/' + secondArchive);
      expect(restored.json.safetyArchive).toMatch(/^s3:\/\/puppy\/backups\/pre-restore-/);
      expect(fake.keys('backups/').some((k) => k.startsWith('backups/pre-restore-'))).toBe(true);

      const pets = await req<{ results: Array<{ name: string }> }>('GET', '/classes/Pet');
      const names = pets.json.results.map((p) => p.name);
      expect(names).toContain('Still writes');
      expect(names).not.toContain('After the second backup');
      const later = await req<{ objectId: string }>('POST', '/classes/Pet', { name: 'After the restore' });
      expect(later.status).toBe(201);
      expect((await req<{ results: Array<{ name: string }> }>('GET', '/classes/Pet')).json.results.map((p) => p.name)).toContain('After the restore');
      // No temp copy of the archive is left behind.
      expect(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('ngx-restore-'))).toEqual([]);
      const trail = await entries('action=backup.restore');
      expect(trail.length).toBeGreaterThan(0);
      expect((trail[0].detail as { where?: string }).where).toBe('s3');
    });
  });

  // ----------------------------------------------------------------- AC4 --

  describe('AC4 — retention', () => {
    it('deletes from the bucket: keep the last 1, and a new backup leaves exactly one object under backups/', async () => {
      expect(fake.keys('backups/').length).toBeGreaterThan(1);
      await req('PUT', '/admin/backups/config', { retention: { keepLast: 1, keepDaily: 0, keepWeekly: 0 } });
      const run = await req<{ archive: string; deleted: string[] }>('POST', '/admin/backups', {});
      expect(run.status).toBe(200);
      expect(run.json.deleted.length).toBeGreaterThan(0);
      expect(fake.keys('backups/')).toEqual(['backups/' + run.json.archive.split('/').pop()]);
      expect((await req<BackupListResponse>('GET', '/admin/backups')).json.backups.length).toBe(1);
    });

    it('back on this machine, retention still deletes from the directory', async () => {
      const dir = path.join(dataDir, 'archives-local');
      await req('PUT', '/admin/backups/config', { destination: { type: 'local', path: dir } });
      expect((await req<BackupListResponse>('GET', '/admin/backups')).json.config.destination).toEqual({ type: 'local', path: dir });
      const first = await req<{ archive: string }>('POST', '/admin/backups', {});
      expect(first.json.archive.startsWith(dir)).toBe(true);
      await new Promise((r) => setTimeout(r, 5)); // a later stamp
      const second = await req<{ archive: string; deleted: string[] }>('POST', '/admin/backups', {});
      expect(second.json.deleted).toEqual([path.basename(first.json.archive)]);
      expect(fs.readdirSync(dir).filter((f) => f.endsWith('.ngxbackup.tar.gz'))).toEqual([path.basename(second.json.archive)]);
      const list = await req<BackupListResponse>('GET', '/admin/backups');
      expect(list.json.backups.map((b) => b.where)).toEqual(['local']);
      // The bucket's one archive is untouched by a local run.
      expect(fake.keys('backups/').length).toBe(1);
    });
  });

  // ----------------------------------------------------------------- AC5 --

  describe('AC5 — the credential never round-trips', () => {
    it('no admin GET carries the secret; the config carries the boolean', async () => {
      for (const p of ['/admin/files/config', '/admin/backups', '/admin/secrets', '/admin/ops', '/admin/whoami']) {
        const res = await req(p === '/admin/whoami' ? 'GET' : 'GET', p);
        expect(JSON.stringify(res.json)).not.toContain(SECRET);
      }
      const cfg = await req<FileConfigResponse>('GET', '/admin/files/config');
      expect(cfg.json.s3CredentialsConfigured).toBe(true);
      expect(JSON.stringify(cfg.json)).not.toContain(KEY_ID);
    });
  });
});
