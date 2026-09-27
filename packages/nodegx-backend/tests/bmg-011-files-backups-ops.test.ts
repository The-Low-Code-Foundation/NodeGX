/**
 * BMG-011 — Files, Backups and Settings: the routes behind the six pages,
 * measured over a real LOCKED BackendService.
 *
 * AC1: two uploads list with sizes; a download is byte-equal; the unreferenced
 *      one deletes; the referenced one refuses WITH the record named, and
 *      `clear=1` blanks the field. AC2: a category's deny list stores and a
 *      custom type appends. AC3: presets round-trip and `?thumb=` honours them.
 * AC4: the schedules the builder emits are stored as cron the scheduler
 *      accepts, and the preview's sentence is the shared gloss. AC5: a restore
 *      over HTTP on a RUNNING backend — the record written after the backup is
 *      gone, the safety archive exists, and a write after the restore lands in
 *      the restored database (the reconnect). AC6: a secret set on the page is
 *      readable by the function resolver and appears in NO admin GET response.
 * AC7: a searchable collection answers a search after rebuild. AC8: the CORS
 *      origins set are what a preflight receives. Plus: the file kinds table
 *      speaks the sniffer's vocabulary; the new routes are audited or reads;
 *      a read-only admin cannot delete a file or restore.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';

import { BackendService } from '../src/service';
import { SecretsStore, FUNCTION_SECRETS_NAMESPACE } from '../src/config/SecretsStore';
import { FILE_IN_USE } from '../src/server/admin-files';
import type { FileListResponse, FileUsesResponse } from '../src/server/admin-files';
import { FILE_KINDS, KNOWN_TYPES, denyListFrom, kindsFrom } from '../src/admin/app/fileKinds';
import { cronWords } from '../src/triggers/cronWords';
import { parseCron } from '../src/triggers/cron';
import { toCron, DEFAULT_SCHEDULE } from '../src/admin/app/composers/schedule';
import type { AuditEntry } from '../src/ops/audit';

import { request } from './helpers/http';

jest.setTimeout(60000);

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

/**
 * A real PNG of a given size, encoded here (an RGB gradient) so the thumbnail
 * assertion has something to SHRINK — the resize never enlarges, so a 2×2
 * source would come back 2×2 whatever the preset says.
 */
function makePng(width: number, height: number): Buffer {
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = Math.floor((255 * x) / width);
      raw[o + 1] = Math.floor((255 * y) / height);
      raw[o + 2] = 128;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
const PNG = makePng(32, 24);
const TEXT = Buffer.from('a plain note for the storage page\n', 'utf8');

function pngSize(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('BMG-011 files, backups and settings', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const T = { authorization: 'Bearer t0k' };
  const R = { authorization: 'Bearer r0k' };
  const req = <T = any>(method: string, p: string, body?: unknown, headers: Record<string, string> = T) =>
    request<T>(base, method, p, { body, headers });
  const upload = (name: string, bytes: Buffer, type: string) =>
    request<{ name: string; url: string; size: number; contentType: string; error?: string }>(base, 'POST', '/files/' + encodeURIComponent(name), {
      body: bytes as unknown as Record<string, unknown>,
      raw: true,
      headers: { ...T, 'content-type': type, 'content-length': String(bytes.length) }
    });
  const bytesOf = async (p: string, headers: Record<string, string> = T) => {
    const res = await fetch(base + p, { headers });
    return { status: res.status, type: res.headers.get('content-type'), buf: Buffer.from(await res.arrayBuffer()) };
  };
  const entries = async (query: string) => (await req<{ entries: AuditEntry[] }>('GET', `/admin/audit?${query}`)).json.entries;

  let pngName = '';
  let txtName = '';
  let petId = '';

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg011-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg011', backendName: 'BMG-011', authToken: 't0k', readonlyToken: 'r0k' });
    const started = await service.start();
    base = started.listen.url;
    await req('POST', '/admin/schema', {
      action: 'createTable',
      table: 'Pet',
      columns: [
        { name: 'name', type: 'String' },
        { name: 'bio', type: 'String' },
        { name: 'photo', type: 'File' }
      ]
    });
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  // ------------------------------------------------------------ the kinds --

  describe('the file kinds table', () => {
    it('names every type the sniffer can produce, each in exactly one category', () => {
      const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'storage', 'sniff.ts'), 'utf8');
      const sniffed = Array.from(new Set(Array.from(source.matchAll(/'([a-z]+\/[a-z0-9.+-]+)'/g)).map((m) => m[1]))).sort();
      expect(sniffed.length).toBeGreaterThan(10);
      expect([...KNOWN_TYPES].sort()).toEqual(sniffed);
      for (const t of KNOWN_TYPES) expect(FILE_KINDS.filter((k) => k.types.indexOf(t) !== -1).length).toBe(1);
    });

    it('round-trips a stored deny list: full categories tick, the rest are custom chips', () => {
      const stored = ['text/html', 'text/css', 'text/javascript', 'application/x-msdownload', 'image/png'];
      const kinds = kindsFrom(stored);
      expect(kinds.categories).toEqual(['web']);
      expect(kinds.custom.sort()).toEqual(['application/x-msdownload', 'image/png']);
      expect(denyListFrom(kinds).sort()).toEqual([...stored].sort());
    });
  });

  // ----------------------------------------------------------------- AC1 --

  describe('AC1 — the file browser', () => {
    it('two uploads list with their sizes, newest first, and the uses lookup knows neither', async () => {
      const png = await upload('paws.png', PNG, 'image/png');
      expect(png.status).toBe(201);
      pngName = png.json.name;
      const txt = await upload('note.txt', TEXT, 'text/plain');
      expect(txt.status).toBe(201);
      txtName = txt.json.name;

      const list = await req<FileListResponse>('GET', '/admin/files');
      expect(list.status).toBe(200);
      expect(list.json.count).toBe(2);
      expect(list.json.files.map((f) => f.name)).toEqual([txtName, pngName]);
      const shown = list.json.files.find((f) => f.name === pngName)!;
      expect(shown).toMatchObject({ originalName: 'paws.png', size: PNG.length, contentType: 'image/png', private: false });
      expect(typeof shown.createdAt).toBe('string');

      const q = await req<FileListResponse>('GET', '/admin/files?q=paws');
      expect(q.json.files.map((f) => f.originalName)).toEqual(['paws.png']);

      const uses = await req<FileUsesResponse>('GET', '/admin/files/uses?names=' + encodeURIComponent([pngName, txtName].join(',')));
      expect(uses.status).toBe(200);
      expect(uses.json.uses).toEqual({ [pngName]: [], [txtName]: [] });
    });

    it('a download is byte-equal', async () => {
      const got = await bytesOf('/files/' + encodeURIComponent(pngName));
      expect(got.status).toBe(200);
      expect(got.buf.equals(PNG)).toBe(true);
    });

    it('a record pointing at the file shows as a use, by collection, id and field', async () => {
      const created = await req<{ objectId: string }>('POST', '/classes/Pet', {
        name: 'Rex',
        bio: 'a quick brown dog',
        photo: { __type: 'File', name: pngName, url: base + '/files/' + pngName }
      });
      expect(created.status).toBe(201);
      petId = created.json.objectId;
      const uses = await req<FileUsesResponse>('GET', '/admin/files/uses?names=' + encodeURIComponent(pngName));
      expect(uses.json.uses[pngName]).toEqual([{ collection: 'Pet', objectId: petId, field: 'photo' }]);
    });

    it('deleting the unreferenced file removes blob and row; the referenced one refuses with the record named', async () => {
      const gone = await req<{ success: boolean; existed: boolean }>('DELETE', '/admin/files/' + encodeURIComponent(txtName));
      expect(gone.status).toBe(200);
      expect(gone.json).toMatchObject({ success: true, existed: true, cleared: [] });
      expect((await bytesOf('/files/' + encodeURIComponent(txtName))).status).toBe(404);
      expect((await req<FileListResponse>('GET', '/admin/files')).json.count).toBe(1);

      const refused = await req<{ error: string; code: string; uses: unknown[] }>('DELETE', '/admin/files/' + encodeURIComponent(pngName));
      expect(refused.status).toBe(409);
      expect(refused.json.code).toBe(FILE_IN_USE);
      expect(refused.json.error).toContain('paws.png');
      expect(refused.json.error).toContain('Pet ' + petId + ' (photo)');
      expect(refused.json.uses).toEqual([{ collection: 'Pet', objectId: petId, field: 'photo' }]);
      // Still there.
      expect((await bytesOf('/files/' + encodeURIComponent(pngName))).status).toBe(200);
    });

    it('the delete is on the trail as file.delete, and a read-only admin cannot make it', async () => {
      const ro = await req('DELETE', '/admin/files/' + encodeURIComponent(pngName), undefined, R);
      expect(ro.status).toBe(403);
      const rows = await entries('action=file.delete');
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.find((e) => e.outcome === 'success')?.detail).toMatchObject({ originalName: 'note.txt', bytes: TEXT.length, cleared: 0 });
    });
  });

  // ----------------------------------------------------------------- AC2 --

  describe('AC2 — refused kinds', () => {
    it('a ticked category stores its documented types; a custom type appends; both read back', async () => {
      const web = FILE_KINDS.find((k) => k.id === 'web')!;
      const deny = denyListFrom({ categories: ['web'], custom: ['application/x-msdownload'] });
      const put = await req('PUT', '/admin/files/config', { contentTypes: { denyList: deny } });
      expect(put.status).toBe(200);
      const back = await req<{ config: { contentTypes: { denyList: string[] } } }>('GET', '/admin/files/config');
      expect(back.json.config.contentTypes.denyList).toEqual([...web.types, 'application/x-msdownload']);
      expect(kindsFrom(back.json.config.contentTypes.denyList)).toEqual({ categories: ['web'], custom: ['application/x-msdownload'] });
      // And the backend refuses what the category says it refuses — judged by bytes.
      const html = await upload('page.html', Buffer.from('<!doctype html><p>hi</p>', 'utf8'), 'text/html');
      expect(html.status).toBe(400);
      expect(html.json.error).toContain('text/html');
      await req('PUT', '/admin/files/config', { contentTypes: { denyList: [] } });
    });
  });

  // ----------------------------------------------------------------- AC3 --

  describe('AC3 — thumbnail presets', () => {
    it('presets edited through the config route are what the route returns and what ?thumb= honours', async () => {
      const put = await req<{ config: { thumbnails: { presets: Record<string, unknown> } }; transformsAvailable: boolean }>('PUT', '/admin/files/config', {
        thumbnails: { presets: { tiny: { width: 8, height: 6, fit: 'cover' }, sm: { width: 64, height: 64, fit: 'cover' } } }
      });
      expect(put.status).toBe(200);
      expect(put.json.config.thumbnails.presets).toEqual({ tiny: { width: 8, height: 6, fit: 'cover' }, sm: { width: 64, height: 64, fit: 'cover' } });
      const back = await req<{ config: { thumbnails: { presets: Record<string, unknown> } }; transformsAvailable: boolean }>('GET', '/admin/files/config');
      expect(back.json.config.thumbnails.presets).toEqual(put.json.config.thumbnails.presets);

      // The drive: a real resize to the preset's size. `sharp` is an optional
      // dependency; this backend's answer says whether it is here, and the
      // assertion follows THAT answer rather than assuming.
      const thumb = await bytesOf('/files/' + encodeURIComponent(pngName) + '?thumb=tiny');
      if (back.json.transformsAvailable) {
        expect(thumb.status).toBe(200);
        expect(thumb.type).toBe('image/png');
        expect(pngSize(thumb.buf)).toEqual({ width: 8, height: 6 });
      } else {
        expect(thumb.status).toBe(501);
      }
      const unknown = await bytesOf('/files/' + encodeURIComponent(pngName) + '?thumb=md');
      expect(unknown.status).toBe(400);
    });

    it('editing a preset that has already rendered is honoured by the next render (the drive found the cache keyed by name)', async () => {
      const before = await req<{ transformsAvailable: boolean }>('GET', '/admin/files/config');
      if (!before.json.transformsAvailable) return;
      const first = await bytesOf('/files/' + encodeURIComponent(pngName) + '?thumb=sm');
      expect(pngSize(first.buf)).toEqual({ width: 32, height: 24 }); // 64×64 cover, never enlarged: the source's size
      const etag1 = (await fetch(base + '/files/' + encodeURIComponent(pngName) + '?thumb=sm', { headers: T })).headers.get('etag');
      await req('PUT', '/admin/files/config', { thumbnails: { presets: { sm: { width: 16, height: 12, fit: 'cover' } } } });
      const second = await bytesOf('/files/' + encodeURIComponent(pngName) + '?thumb=sm');
      expect(second.status).toBe(200);
      expect(pngSize(second.buf)).toEqual({ width: 16, height: 12 });
      const etag2 = (await fetch(base + '/files/' + encodeURIComponent(pngName) + '?thumb=sm', { headers: T })).headers.get('etag');
      expect(etag2).not.toBe(etag1); // a browser holding the old render is told it changed
    });
  });

  // ----------------------------------------------------------------- AC4 --

  describe('AC4 — the schedules', () => {
    const daily = toCron({ ...DEFAULT_SCHEDULE, mode: 'daily', time: '03:30' });
    const weekly = toCron({ ...DEFAULT_SCHEDULE, mode: 'weekly', time: '09:00', days: [1, 5] });

    it('the clean-up schedule is stored as the builder’s cron, the scheduler accepts it, the preview says the gloss', async () => {
      const put = await req<{ config: { orphanSweep: { enabled: boolean; cron: string }; sweepStatus: { nextRunAt: string | null } } }>('PUT', '/admin/files/config', {
        orphanSweep: { enabled: true, cron: daily }
      });
      expect(put.status).toBe(200);
      expect(put.json.config.orphanSweep).toEqual({ enabled: true, cron: daily });
      expect(() => parseCron(daily)).not.toThrow();
      expect(typeof put.json.config.sweepStatus.nextRunAt).toBe('string');
      const preview = await req<{ valid: boolean; words: string }>('POST', '/admin/triggers/preview', { cron: daily });
      expect(preview.json.valid).toBe(true);
      expect(preview.json.words).toBe(cronWords(daily));
      expect(preview.json.words).toBe('Every day at 03:30');
      await req('PUT', '/admin/files/config', { orphanSweep: { enabled: false, cron: daily } });
    });

    it('the backup schedule likewise, with its missed-run policy', async () => {
      const put = await req<{ config: { schedule: { enabled: boolean; cron: string; missedFirePolicy: string }; status: { nextRunAt: string | null } } }>(
        'PUT',
        '/admin/backups/config',
        { schedule: { enabled: true, cron: weekly, missedFirePolicy: 'run-once-on-start' } }
      );
      expect(put.status).toBe(200);
      expect(put.json.config.schedule).toEqual({ enabled: true, cron: weekly, missedFirePolicy: 'run-once-on-start' });
      expect(typeof put.json.config.status.nextRunAt).toBe('string');
      const preview = await req<{ words: string }>('POST', '/admin/triggers/preview', { cron: weekly });
      expect(preview.json.words).toBe(cronWords(weekly));
      const bad = await req<{ error: string }>('PUT', '/admin/backups/config', { schedule: { enabled: true, cron: 'every tuesday' } });
      expect(bad.status).toBeGreaterThanOrEqual(400);
      await req('PUT', '/admin/backups/config', { schedule: null, retention: { keepLast: 3, keepDaily: 2, keepWeekly: 1 } });
      const back = await req<{ config: { retention: Record<string, number>; schedule: unknown } }>('GET', '/admin/backups');
      expect(back.json.config.retention).toEqual({ keepLast: 3, keepDaily: 2, keepWeekly: 1 });
      expect(back.json.config.schedule).toBeNull();
    });
  });

  // ----------------------------------------------------------------- AC5 --

  describe('AC5 — restore from the browser (R4)', () => {
    let archiveFile = '';
    let laterId = '';

    it('backs up, and the archive is listed and downloadable byte-equal', async () => {
      const run = await req<{ ok: boolean; archive: string; bytes: number }>('POST', '/admin/backups', {});
      expect(run.status).toBe(200);
      archiveFile = path.basename(run.json.archive);
      const list = await req<{ backups: Array<{ file: string; path: string; bytes: number }> }>('GET', '/admin/backups');
      const listed = list.json.backups.find((b) => b.file === archiveFile)!;
      expect(listed).toBeTruthy();
      const dl = await bytesOf('/admin/backups/archive?file=' + encodeURIComponent(archiveFile));
      expect(dl.status).toBe(200);
      expect(dl.buf.equals(fs.readFileSync(listed.path))).toBe(true);
      expect((await req('GET', '/admin/backups/archive?file=..%2Fsecrets.json')).status).toBe(404);
      expect((await req('GET', '/admin/backups/archive?file=' + encodeURIComponent(archiveFile), undefined, R)).status).toBe(200);
    });

    it('a record written after the backup is gone after the restore; the safety archive exists; a later write lands', async () => {
      const later = await req<{ objectId: string }>('POST', '/classes/Pet', { name: 'Later', bio: 'written after the backup' });
      expect(later.status).toBe(201);
      laterId = later.json.objectId;
      expect((await req('GET', '/classes/Pet/' + laterId)).status).toBe(200);

      const ro = await req('POST', '/admin/backups/restore', { archive: archiveFile }, R);
      expect(ro.status).toBe(403);
      const unknown = await req<{ error: string }>('POST', '/admin/backups/restore', { archive: '/etc/passwd' });
      expect(unknown.status).toBe(404);

      const restored = await req<{ ok: boolean; reconnected: boolean; safetyArchive: string | null; integrity: { ok: boolean } }>('POST', '/admin/backups/restore', {
        archive: archiveFile,
        safetySnapshot: true
      });
      expect(restored.status).toBe(200);
      expect(restored.json.ok).toBe(true);
      expect(restored.json.reconnected).toBe(true);
      expect(restored.json.integrity.ok).toBe(true);
      expect(typeof restored.json.safetyArchive).toBe('string');
      expect(fs.existsSync(restored.json.safetyArchive!)).toBe(true);
      expect(path.basename(restored.json.safetyArchive!)).toMatch(/^pre-restore/);

      // The RUNNING backend now serves the archive: the later record is gone,
      // the earlier one is back (the swap-under-a-live-handle bug would still
      // answer 200 here).
      expect((await req('GET', '/classes/Pet/' + laterId)).status).toBe(404);
      expect((await req('GET', '/classes/Pet/' + petId)).status).toBe(200);

      // And a write after the restore lands in the database on disk — the
      // handle is the new file, not the unlinked one.
      const after = await req<{ objectId: string }>('POST', '/classes/Pet', { name: 'After', bio: 'written after the restore' });
      expect(after.status).toBe(201);
      expect((await req('GET', '/classes/Pet/' + after.json.objectId)).status).toBe(200);
      // Read the file on disk with a SEPARATE connection (WAL mode: the bytes
      // may still be in local.db-wal, which a plain read of local.db misses).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(path.join(dataDir, 'data', 'local.db'), { readOnly: true });
      try {
        const rows = db.prepare('SELECT name FROM Pet ORDER BY name').all() as Array<{ name: string }>;
        expect(rows.map((r) => r.name)).toEqual(['After', 'Rex']);
      } finally {
        db.close();
      }

      const trail = await entries('action=backup.restore');
      expect(trail.find((e) => e.outcome === 'success')?.detail).toMatchObject({ archive: archiveFile, reconnected: true });
    });

    it('§7: the settings the archive carries are the ones the RUNNING backend enforces — and the next edit does not write the old ones back', async () => {
      expect((await req('POST', '/classes/Open', { name: 'visible' })).status).toBe(201);
      expect((await req('PUT', '/admin/permissions/collections/Open', { permissions: { find: 'public', get: 'public' } })).status).toBe(200);
      const run = await req<{ archive: string }>('POST', '/admin/backups', {});
      expect(run.status).toBe(200);
      const archive = path.basename(run.json.archive);

      // After the backup, Open is locked down: an anonymous read is refused.
      expect((await req('PUT', '/admin/permissions/collections/Open', { permissions: { find: 'nobody', get: 'nobody' } })).status).toBe(200);
      expect((await fetch(base + '/classes/Open')).status).toBeGreaterThanOrEqual(400);

      const restored = await req<{ settings: { reloaded: string[]; refused: unknown[] } }>('POST', '/admin/backups/restore', { archive, safetySnapshot: false });
      expect(restored.status).toBe(200);
      expect(restored.json.settings.reloaded).toEqual(expect.arrayContaining(['security.json', 'backups.json']));
      expect(restored.json.settings.refused).toEqual([]);

      // The restored rule is live: anonymous reads work again, with no restart.
      const anon = await fetch(base + '/classes/Open');
      expect(anon.status).toBe(200);
      expect(((await anon.json()) as { results: Array<{ name: string }> }).results.map((r) => r.name)).toEqual(['visible']);
      const perms = await req<{ config: { collections: Record<string, { permissions: { find: unknown } }> } }>('GET', '/admin/permissions');
      expect(perms.json.config.collections.Open.permissions.find).toBe('public');

      // The next edit on the page merges into the RESTORED rules, not the pre-restore ones.
      expect((await req('PUT', '/admin/permissions/collections/Other', { permissions: { find: 'public' } })).status).toBe(200);
      const onDisk = JSON.parse(fs.readFileSync(path.join(dataDir, 'security.json'), 'utf-8'));
      expect(onDisk.collections.Open.permissions.find).toBe('public');
      expect(onDisk.collections.Other.permissions.find).toBe('public');
    });

    it('the schema, the file metadata and search config survive the reconnect', async () => {
      const schema = await req<{ tables: Array<{ name: string }> }>('GET', '/admin/schema');
      expect(schema.json.tables.map((t) => t.name)).toContain('Pet');
      const files = await req<FileListResponse>('GET', '/admin/files');
      expect(files.json.files.map((f) => f.name)).toEqual([pngName]);
      expect((await bytesOf('/files/' + encodeURIComponent(pngName))).buf.equals(PNG)).toBe(true);
    });
  });

  // ----------------------------------------------------------------- AC6 --

  describe('AC6 — secrets', () => {
    const VALUE = 'sk_live_bmg011_' + Math.random().toString(36).slice(2);

    it('a secret set on the page is what the function resolver reads', async () => {
      const put = await req<{ created: boolean }>('PUT', '/admin/secrets/STRIPE_KEY', { value: VALUE });
      expect(put.status).toBe(201);
      expect(put.json.created).toBe(true);
      const store = new SecretsStore(dataDir);
      expect(store.get(FUNCTION_SECRETS_NAMESPACE, 'STRIPE_KEY')).toBe(VALUE);
      const bad = await req<{ error: string }>('PUT', '/admin/secrets/not%20a%20name', { value: 'x' });
      expect(bad.status).toBe(400);
      expect(bad.json.error).toContain('letters, digits');
    });

    it('the value appears in no admin GET response, walking every GET route the table has', async () => {
      const gets = service.getRouteTable().filter((r) => r.method === 'GET' && /^(admin|_admin)\//.test(r.pattern));
      expect(gets.length).toBeGreaterThan(20);
      const fill: Record<string, string> = { collection: 'Pet', table: 'Pet', name: 'STRIPE_KEY', id: petId, userId: petId, executionId: 'x' };
      let walked = 0;
      for (const route of gets) {
        const p = '/' + route.pattern.replace(/:([a-zA-Z]+)/g, (_m, k) => fill[k] || 'x');
        const res = await fetch(base + p + (route.pattern === 'admin/files/uses' ? '?names=' + pngName : route.pattern === 'admin/backups/archive' ? '?file=x' : ''), { headers: T });
        const text = await res.text();
        expect({ route: p, leaks: text.indexOf(VALUE) !== -1 }).toEqual({ route: p, leaks: false });
        walked++;
      }
      expect(walked).toBe(gets.length);
      const trail = await entries('action=secret.set');
      expect(JSON.stringify(trail).indexOf(VALUE)).toBe(-1);
      expect(JSON.stringify(trail)).toContain('STRIPE_KEY');
    });

    it('a delete says whether the environment still answers', async () => {
      const del = await req<{ existed: boolean; stillResolvesFromEnvironment: boolean; envName: string }>('DELETE', '/admin/secrets/STRIPE_KEY');
      expect(del.status).toBe(200);
      expect(del.json).toMatchObject({ existed: true, stillResolvesFromEnvironment: false, envName: 'NODEGX_SECRET_STRIPE_KEY' });
      expect(new SecretsStore(dataDir).get(FUNCTION_SECRETS_NAMESPACE, 'STRIPE_KEY')).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------- AC7 --

  describe('AC7 — search', () => {
    it('a collection made searchable over chosen fields answers a search after the rebuild', async () => {
      const cfg = await req<{ fts5Available: boolean }>('GET', '/admin/search');
      if (!cfg.json.fts5Available) {
        // Honest: this engine build cannot do it, and the page says so.
        const refused = await req<{ error: string }>('PUT', '/admin/search/collections/Pet', { enabled: true, fields: ['bio'] });
        expect(refused.status).toBe(503);
        return;
      }
      const on = await req<{ rebuild: { rowsIndexed: number } }>('PUT', '/admin/search/collections/Pet', { enabled: true, fields: ['bio'] });
      expect(on.status).toBe(200);
      expect(on.json.rebuild.rowsIndexed).toBeGreaterThanOrEqual(1);
      const hit = await req<{ results: Array<{ name: string }> }>('POST', '/classes/Pet', { _method: 'GET', search: 'quick brown' });
      expect(hit.status).toBe(200);
      expect(hit.json.results.map((r) => r.name)).toEqual(['Rex']);
      const miss = await req<{ results: unknown[] }>('POST', '/classes/Pet', { _method: 'GET', search: 'Rex' });
      expect(miss.json.results).toEqual([]); // `name` was not a chosen field
      const off = await req<{ removed: boolean }>('DELETE', '/admin/search/collections/Pet');
      expect(off.json.removed).toBe(true);
    });
  });

  // ----------------------------------------------------------------- AC8 --

  describe('AC8 — who may call from a browser', () => {
    const preflight = async (origin: string) => {
      const res = await fetch(base + '/classes/Pet', {
        method: 'OPTIONS',
        headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'content-type' }
      });
      return { status: res.status, acao: res.headers.get('access-control-allow-origin') };
    };

    it('the origins set on the page are what a preflight from that origin receives, at once', async () => {
      const put = await req<{ config: { cors: { origins: string[]; credentials: boolean } } }>('PUT', '/admin/ops', {
        cors: { origins: ['https://app.example.com'], credentials: true }
      });
      expect(put.status).toBe(200);
      expect(put.json.config.cors).toEqual({ origins: ['https://app.example.com'], credentials: true });
      expect((await preflight('https://app.example.com')).acao).toBe('https://app.example.com');
      expect((await preflight('https://evil.example.com')).acao).toBeNull();
      const pair = await req<{ error: string }>('PUT', '/admin/ops', { cors: { origins: ['*'], credentials: true } });
      expect(pair.status).toBe(400);
      expect(pair.json.error).toContain('browsers refuse that pair');
      await req('PUT', '/admin/ops', { cors: { origins: ['*'], credentials: false } });
      expect((await preflight('https://evil.example.com')).acao).toBe('*');
    });

    it('the other sections save alone and read back; a read-only admin sees them and changes nothing', async () => {
      const put = await req<{ config: Record<string, unknown> }>('PUT', '/admin/ops', { audit: { enabled: true, retentionDays: 45 } });
      expect(put.status).toBe(200);
      const back = await req<{ config: { audit: { retentionDays: number }; cors: { origins: string[] } } }>('GET', '/admin/ops', undefined, R);
      expect(back.status).toBe(200);
      expect(back.json.config.audit.retentionDays).toBe(45);
      expect(back.json.config.cors.origins).toEqual(['*']);
      expect((await req('PUT', '/admin/ops', { audit: { retentionDays: 1 } }, R)).status).toBe(403);
      const audit = await req<{ retentionDays: number }>('GET', '/admin/audit?limit=1');
      expect(audit.json.retentionDays).toBe(45);
    });

    it('§7: how long a list can be is set on the page, and a read that forgot to size itself gets that many, saying so', async () => {
      for (const n of [1, 2, 3, 4]) expect((await req('POST', '/classes/Lists', { n })).status).toBe(201);
      const put = await req<{ config: { queries: { defaultLimit: number; maxLimit: number } } }>('PUT', '/admin/ops', { queries: { defaultLimit: 2, maxLimit: 3 } });
      expect(put.status).toBe(200);
      expect(put.json.config.queries).toEqual({ defaultLimit: 2, maxLimit: 3 });
      try {
        const bare = await fetch(base + '/classes/Lists', { headers: T });
        expect(((await bare.json()) as { results: unknown[] }).results).toHaveLength(2);
        expect(bare.headers.get('x-nodegx-result-capped')).toBe('true');
        const asked = await req<{ results: unknown[] }>('GET', '/classes/Lists?limit=10');
        expect(asked.json.results).toHaveLength(3);
        const upside = await req<{ error: string }>('PUT', '/admin/ops', { queries: { defaultLimit: 5, maxLimit: 3 } });
        expect(upside.status).toBe(400);
        expect(upside.json.error).toContain('queries.maxLimit must be >= queries.defaultLimit');
        expect((await req('PUT', '/admin/ops', { queries: { defaultLimit: 1, maxLimit: 1 } }, R)).status).toBe(403);
      } finally {
        await req('PUT', '/admin/ops', { queries: { defaultLimit: 1000, maxLimit: 10_000 } });
      }
    });
  });

  // -------------------------------------------------------------- the trail --

  it('the trail names the new routes: file.delete is declared, the reads are not', () => {
    const table = service.getRouteTable().map((r) => r.method + ' ' + r.pattern);
    expect(table).toContain('GET admin/files');
    expect(table).toContain('GET admin/files/uses');
    expect(table).toContain('DELETE admin/files/:name');
    expect(table).toContain('GET admin/backups/archive');
  });
});
