/**
 * P112-OWN023-FILEURLHOST — a File field's address is the backend's address NOW,
 * not the one it had when the file was uploaded.
 *
 * Before: the upload answered `url: http://<listen host>:<port>/files/<name>` and
 * a File field was stored with that url and read back verbatim. Built on a laptop,
 * every song's audio and cover in OWN-023 arm B pointed at `127.0.0.1:8584`; on a
 * VM the listen host is `0.0.0.0` and the browser reaches the backend through a
 * domain, so neither old rows nor new uploads named a reachable address.
 *
 * Ruled by Richard (2026-10-25): the backend fills the address in. A File field
 * keeps the file's name; every answer builds the url from the address this
 * request reached the backend on (`Host`, and `https` when a proxy says it ended
 * TLS — the same `requestOrigin` the deployed app's config is answered with).
 * A url in a plain text field is not rescued, and a File that lives somewhere
 * else (a url whose path is not this backend's `/files/<name>`) is left alone.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import type { FileUploadResult, SignedUrlResult } from '../src/server/files';
import { BackendService } from '../src/service';

import { openStream } from './helpers/sse';

jest.setTimeout(30000);

const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000d4944415478da63fccfc0500f000485018084a98c210000000049454e44ae426082',
  'hex'
);

/** What a browser on the VM sends through Caddy. */
const VM = { host: 'songs.example.com', 'x-forwarded-proto': 'https' };
const VM_ORIGIN = 'https://songs.example.com';

interface Answer<T> {
  status: number;
  json: T;
}

describe('P112-OWN023-FILEURLHOST — a File field is answered at the address it was reached on', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let port: string;

  /** One request with headers fetch() will not let a test set (`Host`). */
  function call<T = Record<string, unknown>>(
    method: string,
    p: string,
    body?: Buffer | Record<string, unknown>,
    headers: Record<string, string> = {}
  ): Promise<Answer<T>> {
    const payload = body === undefined ? undefined : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
    const h: Record<string, string> = { ...headers };
    if (payload && !Buffer.isBuffer(body)) h['content-type'] = 'application/json';
    return new Promise((resolve, reject) => {
      const r = http.request({ hostname: '127.0.0.1', port, path: p, method, headers: h }, (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c: string) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode || 0, json: text ? JSON.parse(text) : null }));
      });
      r.on('error', reject);
      if (payload) r.write(payload);
      r.end();
    });
  }

  async function upload(name: string, headers: Record<string, string> = {}): Promise<FileUploadResult> {
    const res = await call<FileUploadResult>('POST', `/files/${name}`, PNG_BYTES, headers);
    expect(res.status).toBe(201);
    return res.json;
  }

  /** A row as OWN-023 arm B left it: the file uploaded on the laptop, its url baked in. */
  async function laptopRow(collection: string, extra: Record<string, unknown> = {}) {
    const file = await upload('cover.png');
    const baked = `http://127.0.0.1:8584/files/${encodeURIComponent(file.name)}`;
    const res = await call<{ objectId: string }>('POST', `/classes/${collection}`, {
      title: 'Song',
      cover: { __type: 'File', name: file.name, url: baked },
      ...extra
    });
    expect(res.status).toBe(201);
    return { id: res.json.objectId, name: file.name, baked };
  }

  const at = (origin: string, name: string) => `${origin}/files/${encodeURIComponent(name)}`;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-fileurlhost-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'fileurlhost', backendName: 'File URL host' });
    base = (await service.start()).listen.url;
    port = new URL(base).port;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('an upload answers the address the browser reached the backend on', async () => {
    const vm = await upload('song.png', VM);
    expect(vm.url).toBe(at(VM_ORIGIN, vm.name));

    const local = await upload('song.png');
    expect(local.url).toBe(at(`http://127.0.0.1:${port}`, local.name));
  });

  it('an old row with 127.0.0.1 baked in reads back at the VM address — get and find', async () => {
    const row = await laptopRow('Track');

    const one = await call<Record<string, { url: string; name: string }>>('GET', `/classes/Track/${row.id}`, undefined, VM);
    expect(one.status).toBe(200);
    expect(one.json.cover).toEqual({ __type: 'File', name: row.name, url: at(VM_ORIGIN, row.name) });

    const many = await call<{ results: Array<Record<string, { url: string }>> }>('GET', '/classes/Track', undefined, VM);
    expect(many.status).toBe(200);
    expect(many.json.results.map((r) => r.cover.url)).toEqual([at(VM_ORIGIN, row.name)]);

    // The same row asked for on the laptop is answered at the laptop's own address.
    const local = await call<Record<string, { url: string }>>('GET', `/classes/Track/${row.id}`);
    expect(local.json.cover.url).toBe(at(`http://127.0.0.1:${port}`, row.name));

    // And the url it hands out is one the backend actually serves.
    const served = await fetch(local.json.cover.url);
    expect(served.status).toBe(200);
  });

  it('a file saved on one address reads back at whichever address asks next', async () => {
    const file = await upload('fresh.png', VM);
    const created = await call<{ objectId: string }>(
      'POST',
      '/classes/Album',
      { cover: { __type: 'File', name: file.name, url: file.url } },
      VM
    );
    expect(created.status).toBe(201);
    const moved = { host: 'new-host.example.net' };
    const back = await call<Record<string, { url: string }>>('GET', `/classes/Album/${created.json.objectId}`, undefined, moved);
    expect(back.json.cover.url).toBe(at('http://new-host.example.net', file.name));
  });

  it('a File that lives somewhere else, and a url in a text field, are left as they are', async () => {
    const elsewhere = { __type: 'File', name: 'x.png', url: 'https://cdn.example.org/assets/x.png' };
    const row = await laptopRow('Mixed', { other: elsewhere });
    const got = await call<Record<string, unknown>>('GET', `/classes/Mixed/${row.id}`, undefined, VM);
    expect(got.json.other).toEqual(elsewhere);

    const text = await call<{ objectId: string }>('POST', '/classes/Plain', { audio: row.baked });
    const plain = await call<Record<string, unknown>>('GET', `/classes/Plain/${text.json.objectId}`, undefined, VM);
    expect(plain.json.audio).toBe(row.baked);
  });

  it('a File inside an Array or Object field is answered at the address too, at any depth', async () => {
    const two = await upload('back.png');
    const baked2 = `http://127.0.0.1:8584/files/${encodeURIComponent(two.name)}`;
    const elsewhere = { __type: 'File', name: 'x.png', url: 'https://cdn.example.org/assets/x.png' };
    const row = await laptopRow('Gallery', {
      photos: [{ __type: 'File', name: two.name, url: baked2 }, elsewhere, 'a caption'],
      meta: { hero: { __type: 'File', name: two.name, url: baked2 }, pages: [{ scan: { __type: 'File', name: two.name, url: baked2 } }] }
    });

    const got = await call<Record<string, any>>('GET', `/classes/Gallery/${row.id}`, undefined, VM);
    expect(got.status).toBe(200);
    expect(got.json.photos).toEqual([{ __type: 'File', name: two.name, url: at(VM_ORIGIN, two.name) }, elsewhere, 'a caption']);
    expect(got.json.meta.hero.url).toBe(at(VM_ORIGIN, two.name));
    expect(got.json.meta.pages[0].scan.url).toBe(at(VM_ORIGIN, two.name));

    // Read only: what is stored keeps the url it was saved with.
    const local = await call<Record<string, any>>('GET', `/classes/Gallery/${row.id}`);
    expect(local.json.meta.hero.url).toBe(at(`http://127.0.0.1:${port}`, two.name));
  });

  it('a signed url is minted at the address it was asked on', async () => {
    const file = await upload('private.png', { ...VM, 'x-nodegx-file-private': 'true' });
    const signed = await call<SignedUrlResult>('GET', `/files/${encodeURIComponent(file.name)}/sign`, undefined, VM);
    expect(signed.status).toBe(200);
    expect(signed.json.url.startsWith(`${at(VM_ORIGIN, file.name)}?exp=`)).toBe(true);
  });

  it('a live update carries the address the listening browser reached the backend on', async () => {
    const stream = await openStream(base, VM);
    try {
      const connected = await stream.waitFor('connected');
      const sub = await call('POST', '/realtime/subscriptions', {
        clientId: connected.data.clientId,
        subscriptions: [{ collection: 'Live' }]
      });
      expect(sub.status).toBe(200);

      const row = await laptopRow('Live', { extra: [{ __type: 'File', name: 'n.png', url: 'http://127.0.0.1:8584/files/n.png' }] });
      const change = await stream.waitFor('change', (d) => d.record.objectId === row.id);
      expect((change.data.record.cover as { url: string }).url).toBe(at(VM_ORIGIN, row.name));
      expect((change.data.record.extra as Array<{ url: string }>)[0].url).toBe(at(VM_ORIGIN, 'n.png'));
    } finally {
      stream.close();
    }
  });
});
