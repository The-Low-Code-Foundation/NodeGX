/**
 * BMG-015 — the two *where* cards under jsdom, over a stubbed backend.
 *
 * Storage: two tiles; choosing the bucket opens endpoint / region / bucket /
 * path-style / key id / secret (a password field); the key is a chip, never a
 * value; *Test connection* sends the unsaved draft to the test route and
 * *Save* stays disabled until the draft has tested OK; any edit after a test
 * disables it again; a failed test shows the endpoint's sentence; saving
 * sends `driver` + `s3Credentials` (or only `driver` when both key fields are
 * blank: keep the stored key). Backups: two tiles; the bucket tile is disabled
 * with the sentence while no bucket is connected, live with the bucket's name
 * once one is; saving sends `{type:'s3'}` or `{type:'local', path}`; the
 * archives sentence names where they live. AC9 still holds: no comma list
 * and no cron text on either page.
 */
import { mount, unmount, change, click, settle, q, qa, text, typeInto } from './dom';

import { session } from '../../src/admin/app/api';
import { ModalHost } from '../../src/admin/app/ui/modal';
import { FilesView, whereDraftFrom, wherePayload, whereProblem } from '../../src/admin/app/views/files';
import { BackupsView, whereWords } from '../../src/admin/app/views/backups';

interface Call {
  method: string;
  url: string;
  body?: Record<string, unknown>;
}
const calls: Call[] = [];
const answer = (status: number, json: unknown) => Promise.resolve(new Response(JSON.stringify(json), { status, headers: { 'content-type': 'application/json' } }));

let driver: Record<string, unknown> = { type: 'local' };
let credentialsConfigured = false;
let testAnswer: { ok: boolean; words: string } = { ok: true, words: 'Connected: a test file was written to "puppy" at http://127.0.0.1:9400 and removed again.' };
let bucket: { connected: boolean; name: string | null } = { connected: false, name: null };
let destination: Record<string, unknown> = { type: 'local', path: '/data/backups' };
let moveAnswers: unknown[] = [];

function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = (init && init.method) || 'GET';
  const body = init && init.body && typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
  calls.push({ method, url, body });
  const p = new URL(url, 'http://127.0.0.1').pathname;
  if (p === '/admin/files/config/test') return answer(200, testAnswer);
  if (p === '/admin/files/config') {
    if (method === 'PUT' && body) {
      if (body.driver) driver = body.driver as Record<string, unknown>;
      if (body.s3Credentials) credentialsConfigured = true;
    }
    return answer(200, {
      config: { maxUploadBytes: 1024 * 1024, driver, contentTypes: { allowList: null, denyList: [] }, signedUrlTtlSeconds: 300, thumbnails: { presets: {} }, orphanSweep: { enabled: false, cron: '0 3 * * *' }, sweepStatus: {} },
      driverKind: driver.type,
      s3CredentialsConfigured: credentialsConfigured,
      transformsAvailable: true
    });
  }
  if (p === '/admin/files') return answer(200, { count: 0, files: [] });
  if (p === '/admin/files/uses') return answer(200, { uses: {} });
  if (p === '/admin/files/move') return answer(method === 'POST' ? 202 : 200, moveAnswers.length > 1 ? moveAnswers.shift() : moveAnswers[0]);
  if (p === '/admin/backups') {
    return answer(200, {
      config: { schedule: null, retention: { keepLast: 7, keepDaily: 0, keepWeekly: 0 }, destination, includeSecrets: false, status: {} },
      backups: [{ file: 'backup-2026-09-25T10-00-00-000Z-abc.ngxbackup.tar.gz', path: 's3://puppy/backups/backup-2026-09-25T10-00-00-000Z-abc.ngxbackup.tar.gz', bytes: 4096, createdAt: '2026-09-25T10:00:00.000Z', where: 's3' }],
      bucket
    });
  }
  if (p === '/admin/backups/config') {
    if (method === 'PUT' && body && body.destination) destination = body.destination as Record<string, unknown>;
    return answer(200, { config: {} });
  }
  if (p === '/admin/triggers/preview') return answer(200, { valid: true, words: 'Every day at 03:00', next: [] });
  return answer(404, { error: 'unstubbed ' + method + ' ' + p });
}

const realFetch = globalThis.fetch;
beforeAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch as typeof fetch;
  session.set({ ...session.get(), whoami: { backend: { id: 'b', name: 'Puppy backend', host: '127.0.0.1', port: 8697 } } as never });
});
afterAll(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
});
beforeEach(() => {
  calls.length = 0;
  driver = { type: 'local' };
  credentialsConfigured = false;
  testAnswer = { ok: true, words: 'Connected: a test file was written to "puppy" at http://127.0.0.1:9400 and removed again.' };
  bucket = { connected: false, name: null };
  destination = { type: 'local', path: '/data/backups' };
  moveAnswers = [];
});

const sent = (method: string, re: RegExp) => calls.filter((c) => c.method === method && re.test(c.url));
const noListOrCron = (root: HTMLElement) => {
  for (const el of qa<HTMLInputElement>(root, 'input, textarea')) {
    const hint = (el.placeholder + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
    expect(hint).not.toMatch(/comma/);
    expect(hint).not.toMatch(/cron/);
  }
};

// ---------------------------------------------------------------- pure --

describe('the storage draft', () => {
  it('reads a local config as the machine tile and an s3 one as the bucket tile with its fields', () => {
    expect(whereDraftFrom({}).where).toBe('local');
    const d = whereDraftFrom({ driver: { type: 's3', endpoint: 'http://127.0.0.1:9400', region: 'eu-west-1', bucket: 'puppy', forcePathStyle: false } });
    expect(d).toEqual({ where: 's3', endpoint: 'http://127.0.0.1:9400', region: 'eu-west-1', bucket: 'puppy', pathStyle: false, accessKeyId: '', secretAccessKey: '' });
  });

  it('names what is missing, in words, before anything is sent', () => {
    const base = whereDraftFrom({});
    expect(whereProblem(base, false)).toBeNull();
    const s3 = { ...base, where: 's3' as const };
    expect(whereProblem(s3, false)).toMatch(/needs an endpoint/);
    expect(whereProblem({ ...s3, endpoint: 'minio:9000' }, false)).toMatch(/starts with https:\/\//);
    expect(whereProblem({ ...s3, endpoint: 'http://minio:9000' }, false)).toMatch(/needs a name/);
    expect(whereProblem({ ...s3, endpoint: 'http://minio:9000', bucket: 'puppy' }, false)).toMatch(/access key id and a secret/);
    expect(whereProblem({ ...s3, endpoint: 'http://minio:9000', bucket: 'puppy' }, true)).toBeNull();
    expect(whereProblem({ ...s3, endpoint: 'http://minio:9000', bucket: 'puppy', accessKeyId: 'K' }, true)).toMatch(/both/);
  });

  it('sends the driver, and the credentials only when both were typed', () => {
    const s3 = { ...whereDraftFrom({}), where: 's3' as const, endpoint: ' http://minio:9000 ', bucket: ' puppy ', region: '' };
    expect(wherePayload(s3)).toEqual({ driver: { type: 's3', endpoint: 'http://minio:9000', region: 'us-east-1', bucket: 'puppy', forcePathStyle: true } });
    expect(wherePayload({ ...s3, accessKeyId: 'K', secretAccessKey: 'S' }).s3Credentials).toEqual({ accessKeyId: 'K', secretAccessKey: 'S' });
    expect(wherePayload(whereDraftFrom({}))).toEqual({ driver: { type: 'local' } });
  });

  it('says where archives live', () => {
    expect(whereWords({ type: 'local', path: '/data/backups' }, undefined)).toBe('Archives live in /data/backups.');
    expect(whereWords({ type: 's3', prefix: 'backups/' }, { connected: true, name: 'puppy' })).toBe('Archives live in the bucket "puppy" under backups/.');
  });
});

// --------------------------------------------------------------- storage --

describe('the Storage page — where files are stored', () => {
  it('shows the machine tile chosen, opens the bucket form on the bucket tile, and keeps Save off until a test passes', async () => {
    const root = mount(<FilesView params={[]} />);
    await settle(20);
    const tiles = qa<HTMLInputElement>(root, 'input[name="where"]');
    expect(tiles.map((t) => t.value)).toEqual(['local', 's3']);
    expect(tiles[0].checked).toBe(true);
    expect(root.querySelector('#bucket-form')).toBeNull();
    expect(root.querySelector('#s3-test')).toBeNull();
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(false); // local needs no test

    click(tiles[1]);
    await settle();
    expect(root.querySelector('#bucket-form')).not.toBeNull();
    expect((q<HTMLInputElement>(root, '#s3-secret')).type).toBe('password');
    expect(text(q(root, '#where-card'))).toContain('key: not configured');
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(true);
    expect((q<HTMLButtonElement>(root, '#s3-test')).disabled).toBe(true); // nothing typed yet

    typeInto(q<HTMLInputElement>(root, '#s3-endpoint'), 'http://127.0.0.1:9400');
    typeInto(q<HTMLInputElement>(root, '#s3-bucket'), 'puppy');
    typeInto(q<HTMLInputElement>(root, '#s3-access-key-id'), 'AKIAPUPPY');
    typeInto(q<HTMLInputElement>(root, '#s3-secret'), 'shh');
    await settle();
    expect((q<HTMLButtonElement>(root, '#s3-test')).disabled).toBe(false);
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(true);

    click(q(root, '#s3-test'));
    await settle(20);
    const test = sent('POST', /\/admin\/files\/config\/test$/);
    expect(test.length).toBe(1);
    expect(test[0].body).toEqual({
      driver: { type: 's3', endpoint: 'http://127.0.0.1:9400', region: 'us-east-1', bucket: 'puppy', forcePathStyle: true },
      s3Credentials: { accessKeyId: 'AKIAPUPPY', secretAccessKey: 'shh' }
    });
    expect(q(root, '#s3-test-result').className).toContain('ok');
    expect(text(q(root, '#s3-test-result'))).toContain('Connected');
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(false);

    // Any edit after the test disables Save again.
    typeInto(q<HTMLInputElement>(root, '#s3-bucket'), 'puppy2');
    await settle();
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(true);
    expect(root.querySelector('#s3-test-result')).toBeNull();

    typeInto(q<HTMLInputElement>(root, '#s3-bucket'), 'puppy');
    click(q(root, '#s3-test'));
    await settle(20);
    click(q(root, '#save-where'));
    await settle(20);
    const saved = sent('PUT', /\/admin\/files\/config$/);
    expect(saved.length).toBe(1);
    expect(saved[0].body).toEqual({
      driver: { type: 's3', endpoint: 'http://127.0.0.1:9400', region: 'us-east-1', bucket: 'puppy', forcePathStyle: true },
      s3Credentials: { accessKeyId: 'AKIAPUPPY', secretAccessKey: 'shh' }
    });
    // After the reload the page reads the stored config: bucket tile on, key configured, fields blank.
    expect(text(q(root, '#where-card'))).toContain('key: configured');
    expect((q<HTMLInputElement>(root, '#s3-secret')).value).toBe('');
    expect(text(root)).toContain('stored in S3');
    noListOrCron(root);
    unmount(root);
  });

  it('a failed test shows the endpoint\'s sentence and Save stays off; the path-style switch is sent', async () => {
    testAnswer = { ok: false, words: 'InvalidAccessKeyId: The Access Key Id you provided does not exist in our records. (HTTP 403)' };
    const root = mount(<FilesView params={[]} />);
    await settle(20);
    click(qa<HTMLInputElement>(root, 'input[name="where"]')[1]);
    await settle();
    typeInto(q<HTMLInputElement>(root, '#s3-endpoint'), 'https://s3.example.com');
    typeInto(q<HTMLInputElement>(root, '#s3-bucket'), 'puppy');
    typeInto(q<HTMLInputElement>(root, '#s3-access-key-id'), 'AKIANOBODY');
    typeInto(q<HTMLInputElement>(root, '#s3-secret'), 'shh');
    change(q<HTMLInputElement>(root, '#s3-path-style'), false);
    await settle();
    click(q(root, '#s3-test'));
    await settle(20);
    expect(sent('POST', /config\/test$/)[0].body).toMatchObject({ driver: { forcePathStyle: false } });
    expect(q(root, '#s3-test-result').className).toContain('bad');
    expect(text(q(root, '#s3-test-result'))).toContain('InvalidAccessKeyId');
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(true);
    unmount(root);
  });

  it('with a key already stored, blank key fields test and save with the driver only', async () => {
    driver = { type: 's3', endpoint: 'http://127.0.0.1:9400', region: 'us-east-1', bucket: 'puppy', forcePathStyle: true };
    credentialsConfigured = true;
    const root = mount(<FilesView params={[]} />);
    await settle(20);
    expect(qa<HTMLInputElement>(root, 'input[name="where"]')[1].checked).toBe(true);
    expect((q<HTMLInputElement>(root, '#s3-bucket')).value).toBe('puppy');
    expect(text(q(root, '#where-card'))).toContain('key: configured');
    expect((q<HTMLButtonElement>(root, '#s3-test')).disabled).toBe(false);
    click(q(root, '#s3-test'));
    await settle(20);
    expect(sent('POST', /config\/test$/)[0].body).toEqual({ driver });
    click(q(root, '#save-where'));
    await settle(20);
    expect(sent('PUT', /\/admin\/files\/config$/)[0].body).toEqual({ driver });
    // Back to this machine: no test needed, the driver alone is sent.
    click(qa<HTMLInputElement>(root, 'input[name="where"]')[0]);
    await settle();
    expect((q<HTMLButtonElement>(root, '#save-where')).disabled).toBe(false);
    click(q(root, '#save-where'));
    await settle(20);
    expect(sent('PUT', /\/admin\/files\/config$/)[1].body).toEqual({ driver: { type: 'local' } });
    unmount(root);
  });
});

// --------------------------------------------------------------- backups --

describe('the Backups page — where archives go', () => {
  it('the bucket tile is disabled with the sentence while no bucket is connected; the folder is a field', async () => {
    const root = mount(<BackupsView params={[]} />);
    await settle(20);
    const tiles = qa<HTMLInputElement>(root, 'input[name="backup-where"]');
    expect(tiles.map((t) => t.value)).toEqual(['local', 's3']);
    expect(tiles[0].checked).toBe(true);
    expect(tiles[1].disabled).toBe(true);
    expect(text(q(root, '#backup-where'))).toContain('Connect a bucket on the Storage page first');
    expect((q<HTMLInputElement>(root, '#backup-dest')).value).toBe('/data/backups');
    expect(text(root)).toContain('Archives live in /data/backups.');
    typeInto(q<HTMLInputElement>(root, '#backup-dest'), '/srv/archives');
    click(q(root, '#backup-where #save-where'));
    await settle(20);
    expect(sent('PUT', /\/admin\/backups\/config$/)[0].body).toEqual({ destination: { type: 'local', path: '/srv/archives' } });
    expect(text(root)).toContain('Archives live in /srv/archives.'); // the reload reads what was saved
    noListOrCron(root);
    unmount(root);
  });

  it('with a bucket connected the tile is live and names it; saving sends the bucket; the list says where each archive is', async () => {
    bucket = { connected: true, name: 'puppy' };
    const root = mount(<BackupsView params={[]} />);
    await settle(20);
    const tiles = qa<HTMLInputElement>(root, 'input[name="backup-where"]');
    expect(tiles[1].disabled).toBe(false);
    expect(text(q(root, '#backup-where'))).toContain('Archives go to "puppy" under backups/');
    click(tiles[1]);
    await settle();
    expect(root.querySelector('#backup-dest')).toBeNull();
    click(q(root, '#backup-where #save-where'));
    await settle(20);
    expect(sent('PUT', /\/admin\/backups\/config$/)[0].body).toEqual({ destination: { type: 's3' } });
    expect(text(q(root, 'tr[data-archive]'))).toContain('in the bucket');
    unmount(root);
  });

  it('with the bucket as the destination the sentence names it', async () => {
    bucket = { connected: true, name: 'puppy' };
    destination = { type: 's3', prefix: 'backups/' };
    const root = mount(<BackupsView params={[]} />);
    await settle(20);
    expect(qa<HTMLInputElement>(root, 'input[name="backup-where"]')[1].checked).toBe(true);
    expect(text(root)).toContain('Archives live in the bucket "puppy" under backups/.');
    unmount(root);
  });
});

// ------------------------------------------------------------------ move --

describe('the Storage page — Move files to the bucket (BMG-015 §7)', () => {
  const progress = (over: Record<string, unknown>) => ({ state: 'idle', total: 0, moved: 0, bytes: 0, failed: [], ...over });

  it('is not there while uploads go to this machine', async () => {
    const root = mount(<FilesView params={[]} />);
    await settle(20);
    expect(root.querySelector('#move-card')).toBeNull();
    expect(sent('GET', /\/admin\/files\/move$/)).toHaveLength(0);
    unmount(root);
  });

  it('with the bucket in use: says how many are still here, asks, starts, shows progress, then what happened', async () => {
    driver = { type: 's3', endpoint: 'http://127.0.0.1:9400', region: 'us-east-1', bucket: 'puppy', forcePathStyle: true };
    credentialsConfigured = true;
    moveAnswers = [
      { onThisMachine: 2, bucketConnected: true, progress: progress({}) },
      { onThisMachine: 2, bucketConnected: true, progress: progress({ state: 'running', total: 2 }) },
      { onThisMachine: 0, bucketConnected: true, progress: progress({ state: 'done', total: 2, moved: 2, bytes: 100 }) }
    ];
    const root = mount(
      <div>
        <FilesView params={[]} />
        <ModalHost />
      </div>
    );
    await settle(20);
    expect(text(q(root, '#move-words'))).toBe('2 files are still on this machine. They keep serving from here; new uploads go to the bucket.');
    click(q(root, '#move-start'));
    await settle();
    expect(text(q(root, '.modal'))).toContain('Move 2 files to the bucket?');
    click(qa(root, '.modal .foot button').find((b) => text(b).trim() === 'Move')!);
    await settle(20);
    expect(sent('POST', /\/admin\/files\/move$/)).toHaveLength(1);
    expect(q<HTMLProgressElement>(root, '#move-progress').max).toBe(2);
    expect(root.querySelector('#move-start')).toBeNull(); // no second press while it runs
    await new Promise((r) => setTimeout(r, 1100));
    await settle(20);
    expect(text(q(root, '#move-words'))).toBe('2 files moved to the bucket. Every file is in the bucket.');
    expect(root.querySelector('#move-progress')).toBeNull();
    unmount(root);
  });
});
