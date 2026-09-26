/**
 * BMG-017 row 5 — AWS-style (virtual-hosted) bucket addressing, proved.
 *
 * With *Path-style addressing* off, `S3Driver` sends `Host: <bucket>.<endpoint
 * host>` over a connection to the endpoint's own hostname, and signs over that
 * host. The BMG-015 fake was path-style only and checked nothing but the key
 * id, so no spec had ever sent one of these requests — the switch an AWS S3
 * user turns off. Here the fake routes by the Host header, refuses path-style,
 * and verifies the SigV4 signature over the request it RECEIVED; connect,
 * upload, serve, back up and restore must all pass through it.
 *
 * Two controls first, so a green here means something: the same fake refuses
 * a path-style request, and refuses a signature made with the wrong secret.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { FileConfigResponse, FileConfigTestResponse } from '../src/server/admin-files';
import { BackendService } from '../src/service';

import { request } from './helpers/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createS3Fake } = require('./helpers/s3-fake') as typeof import('./helpers/s3-fake');

jest.setTimeout(90000);

const KEY_ID = 'AKIAPUPPY';
const SECRET = 'puppy-secret-key-never-shown';
const BYTES = Buffer.from('stored through a virtual-hosted bucket\n', 'utf8');

describe('BMG-017 row 5 — virtual-hosted addressing against a fake that checks the signature', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let fake: ReturnType<typeof createS3Fake>;
  let endpoint: string;
  const T = { authorization: 'Bearer t0k' };
  const req = <R = any>(method: string, p: string, body?: unknown) => request<R>(base, method, p, { body, headers: T });
  const driver = (over: Record<string, unknown> = {}) => ({ type: 's3', endpoint, region: 'us-east-1', bucket: 'puppy', forcePathStyle: false, ...over });
  const creds = (secret = SECRET) => ({ accessKeyId: KEY_ID, secretAccessKey: secret });

  beforeAll(async () => {
    fake = createS3Fake({ bucket: 'puppy', accessKeyId: KEY_ID, secretAccessKey: SECRET, virtualHostedOnly: true });
    endpoint = await fake.listen();
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg017-vhost-'));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'bmg017vh', backendName: 'BMG-017', authToken: 't0k' });
    base = (await service.start()).listen.url;
    await req('POST', '/admin/schema', { action: 'createTable', table: 'Pet', columns: [{ name: 'name', type: 'String' }] });
  });

  afterAll(async () => {
    if (service) await service.stop();
    if (fake) await fake.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('control: a path-style request is refused by this fake', async () => {
    const res = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: driver({ forcePathStyle: true }), s3Credentials: creds() });
    expect(res.json.ok).toBe(false);
    expect(res.json.words).toMatch(/InvalidRequest|virtual-hosted/);
  });

  it('control: a signature made with the wrong secret is refused by this fake', async () => {
    const res = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: driver(), s3Credentials: creds('not-the-secret') });
    expect(res.json.ok).toBe(false);
    expect(res.json.words).toMatch(/SignatureDoesNotMatch/);
  });

  it('AC5: Test connection and Save pass with path-style off; every request went to Host: puppy.<endpoint>', async () => {
    const seenBefore = fake.seen.length;
    const test = await req<FileConfigTestResponse>('POST', '/admin/files/config/test', { driver: driver(), s3Credentials: creds() });
    expect(test.json).toMatchObject({ ok: true });
    const saved = await req<FileConfigResponse>('PUT', '/admin/files/config', { driver: driver(), s3Credentials: creds() });
    expect(saved.status).toBe(200);
    expect(saved.json.driverKind).toBe('s3');
    // Virtual-hosted: the path carries the key only, never `/puppy/…`.
    for (const line of fake.seen.slice(seenBefore)) expect(line).not.toMatch(/^\w+ \/puppy(\/|$)/);
  });

  let storedName = '';
  it('AC5: an upload lands in the bucket under its key and serves back byte-equal', async () => {
    const up = await request<{ name: string }>(base, 'POST', '/files/pet.txt', {
      body: BYTES as unknown as Record<string, unknown>,
      raw: true,
      headers: { ...T, 'content-type': 'text/plain', 'content-length': String(BYTES.length) }
    });
    expect(up.status).toBe(201);
    storedName = up.json.name;
    const keys = fake.keys().filter((k) => !k.startsWith('backups/'));
    expect(keys.length).toBe(1);
    expect(fake.objects.get(keys[0])!.body.equals(BYTES)).toBe(true);
    const res = await fetch(base + '/files/' + encodeURIComponent(storedName), { headers: T });
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(BYTES)).toBe(true);
  });

  it('AC5: Back up now writes into the bucket, the list reads it, and a restore from it brings the database back', async () => {
    expect((await req('PUT', '/admin/backups/config', { destination: { type: 's3' } })).status).toBe(200);
    expect((await req('POST', '/classes/Pet', { name: 'Before' })).status).toBe(201);
    const run = await req<{ archive: string }>('POST', '/admin/backups', {});
    expect(run.status).toBe(200);
    expect(run.json.archive).toMatch(/^s3:\/\/puppy\/backups\//);
    const archive = run.json.archive.split('/').pop()!;
    const list = await req<{ backups: Array<{ file: string; where: string }> }>('GET', '/admin/backups');
    expect(list.json.backups.map((b) => [b.file, b.where])).toContainEqual([archive, 's3']);

    expect((await req('POST', '/classes/Pet', { name: 'After' })).status).toBe(201);
    const restored = await req<{ ok: boolean }>('POST', '/admin/backups/restore', { archive, safetySnapshot: false });
    expect(restored.status).toBe(200);
    expect(restored.json.ok).toBe(true);
    const pets = await req<{ results: Array<{ name: string }> }>('GET', '/classes/Pet');
    expect(pets.json.results.map((p) => p.name)).toEqual(['Before']);
    // And the file uploaded before the backup still serves from the bucket.
    const res = await fetch(base + '/files/' + encodeURIComponent(storedName), { headers: T });
    expect(res.status).toBe(200);
  });
});
