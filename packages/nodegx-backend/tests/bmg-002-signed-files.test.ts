/**
 * BMG-002 — a signed file URL works when files are locked.
 *
 * The Collections drawer shows a File field's thumbnail and Download link
 * through `GET /files/:name/sign`, because an `<img>` or a link cannot send
 * the admin credential. Measured on a backend whose `files.read` is
 * `authenticated`: `/sign` answered 200 and the URL it minted answered 403 —
 * the coarse route gate refused it before the handler could read the
 * signature. `files-http.test.ts` covers signing under the default
 * `read: public`, where the gate never stood in the way.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import type { FileUploadResult, SignedUrlResult } from '../src/server/files';

import { request } from './helpers/http';

jest.setTimeout(30000);

const LOCKED_FILES = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: true
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

const BYTES = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

describe('BMG-002 signed file URLs on a backend with files.read = authenticated', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let admin: Record<string, string>;
  let name: string;
  const path0 = (url: string) => new URL(url).pathname + new URL(url).search;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-bmg002f-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED_FILES));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_bmg002f', backendName: 'BMG-002 files' });
    base = (await service.start()).listen.url;
    admin = { authorization: 'Bearer ' + JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken };
    const up = await request<FileUploadResult>(base, 'POST', '/files/pic.png', { body: BYTES, headers: { ...admin, 'content-type': 'image/png' }, raw: true });
    expect(up.status).toBe(201);
    name = up.json.name;
  });

  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('refuses the plain URL without a credential (the lock holds)', async () => {
    expect((await fetch(base + '/files/' + encodeURIComponent(name))).status).toBe(403);
  });

  it('serves the signed URL with no credential at all — the <img src> case', async () => {
    const sign = await request<SignedUrlResult>(base, 'GET', '/files/' + encodeURIComponent(name) + '/sign', { headers: admin });
    expect(sign.status).toBe(200);
    const res = await fetch(base + path0(sign.json.url));
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(BYTES)).toBe(true);
  });

  it('refuses a forged signature, an expired one, and one replayed against another file', async () => {
    const sign = await request<SignedUrlResult>(base, 'GET', '/files/' + encodeURIComponent(name) + '/sign', { headers: admin });
    const good = path0(sign.json.url);
    expect((await fetch(base + good.replace(/sig=[0-9a-f]+/, 'sig=' + '0'.repeat(64)))).status).toBe(403);
    expect((await fetch(base + good.replace(/exp=\d+/, 'exp=1000'))).status).toBe(403);
    const other = await request<FileUploadResult>(base, 'POST', '/files/other.png', { body: BYTES, headers: { ...admin, 'content-type': 'image/png' }, raw: true });
    expect((await fetch(base + good.replace(encodeURIComponent(name), encodeURIComponent(other.json.name)))).status).toBe(403);
  });
});
