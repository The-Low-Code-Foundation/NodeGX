/**
 * P112-OWN023-PHONEPREVIEW — a preview shared on the Wi-Fi carries the app's backend, so a phone gets data.
 *
 * `noodl-preview --host 0.0.0.0` served the page to a phone, and the page called its backend at `127.0.0.1:<port>`:
 * on a phone, the phone. Now a SHARED preview answers the page's `nodegx-config.json` (DEP-001's re-pointing) with
 * `/__nodegx/backend` on the address the page came from, and forwards that path to the backend on loopback, behind its
 * own token gate. Not shared, nothing changes.
 *
 * The backend here is a stand-in that records what reaches it (a plain HTTP server on the port the project names), so
 * every row reads the request the backend got. `--no-backend` keeps the preview from starting a real one. The phone is
 * a `Host` header: the claim is about the address the page is given and what the backend is told, both of which follow
 * `Host` (the backend's `requestOrigin` is graded in `nodegx-backend`).
 *
 * 🔴 The gate is not graded here: these requests come from loopback, which the gate lets through by design. It runs
 * before `handle` for every path (server.ts constructor), the proxy included.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

import { assertPrerequisites, get, scratchCopy, startPreview, writeJson, type RunningPreview } from './helpers';

beforeAll(() => assertPrerequisites());

interface Seen {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** A backend stand-in: answers JSON naming the request, streams on `/realtime`. */
function fakeBackend(): Promise<{ port: number; seen: Seen[]; close: () => Promise<void> }> {
  const seen: Seen[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push({ method: req.method || '', url: req.url || '', headers: req.headers, body });
      if ((req.url || '').startsWith('/realtime')) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write('data: first\n\n');
        return; // held open, as an event stream is
      }
      res.writeHead(201, { 'content-type': 'application/json', 'x-backend': 'yes' });
      res.end(JSON.stringify({ path: req.url }));
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        port: (server.address() as { port: number }).port,
        seen,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections();
            server.close(() => done());
          })
      })
    )
  );
}

/** The project names a backend on this machine at `port`, as `provision_backend` writes it. */
function appWithBackend(port: number): string {
  const dir = scratchCopy('hello-world');
  writeJson<{ metadata?: unknown }>(path.join(dir, 'nodegx.project.json'), (p) => {
    p.metadata = { cloudservices: { instanceId: 'phonepreview', endpoint: `http://127.0.0.1:${port}`, appId: 'phonepreview', type: 'nodegx' } };
  });
  return dir;
}

function request(
  port: number,
  urlPath: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method: opts.method || 'GET', headers: opts.headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const PHONE = { host: '192.168.1.158:5102' };

describe('a shared preview carries its backend', () => {
  let backend: Awaited<ReturnType<typeof fakeBackend>>;
  let dir: string;
  let preview: RunningPreview;

  beforeAll(async () => {
    backend = await fakeBackend();
    dir = appWithBackend(backend.port);
    preview = await startPreview(dir, ['--no-watch', '--no-backend', '--host', '0.0.0.0', '--token', 'phone-token']);
  });
  afterAll(async () => {
    await preview?.stop();
    await backend?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('(the control) the project names its backend on this machine, and the preview is shared', () => {
    expect(preview.stdout).toContain('phone-token');
  });

  it('tells the page its backend is on the address the page came from, under /__nodegx/backend', async () => {
    const res = await get(preview.port, '/nodegx-config.json', PHONE);
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ cloudservices: { endpoint: 'http://192.168.1.158:5102/__nodegx/backend' } });
  });

  it('forwards the path, the query, the method and the body to the backend, and its answer back', async () => {
    const before = backend.seen.length;
    const res = await request(preview.port, '/__nodegx/backend/classes/Song?where=%7B%7D', {
      method: 'POST',
      headers: { ...PHONE, 'content-type': 'application/json', 'x-parse-session-token': 'r:abc' },
      body: '{"title":"Blue"}'
    });
    expect(res.status).toBe(201);
    expect(res.headers['x-backend']).toBe('yes');
    const got = backend.seen[before];
    expect(got.method).toBe('POST');
    expect(got.url).toBe('/classes/Song?where=%7B%7D');
    expect(got.body).toBe('{"title":"Blue"}');
    expect(got.headers['x-parse-session-token']).toBe('r:abc');
  });

  it('tells the backend where the page reached it, so a File url leads back through the preview', async () => {
    const before = backend.seen.length;
    await request(preview.port, '/__nodegx/backend/health', { headers: PHONE });
    const got = backend.seen[before];
    expect(got.headers.host).toBe('192.168.1.158:5102');
    expect(got.headers['x-forwarded-prefix']).toBe('/__nodegx/backend');
  });

  it("does not pass the preview's own token on; the page's other cookies go", async () => {
    const before = backend.seen.length;
    await request(preview.port, '/__nodegx/backend/health', {
      headers: { ...PHONE, cookie: 'nodegx_token=phone-token; theme=dark', 'x-nodegx-token': 'phone-token' }
    });
    const got = backend.seen[before];
    expect(got.headers.cookie).toBe('theme=dark');
    expect(got.headers['x-nodegx-token']).toBeUndefined();
  });

  it('streams: an event the backend sends arrives while the stream is still open (realtime)', async () => {
    const first = await new Promise<string>((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port: preview.port, path: '/__nodegx/backend/realtime', headers: { ...PHONE, accept: 'text/event-stream' } }, (res) => {
        res.once('data', (c) => {
          resolve(String(c));
          req.destroy();
        });
      });
      req.on('error', (e) => (String(e).includes('socket hang up') ? undefined : reject(e)));
      setTimeout(() => reject(new Error('no event arrived while the stream was open')), 5000);
    });
    expect(first).toContain('data: first');
  });

  it('a backend that is not running is a 502 that says so, not a hang', async () => {
    const down = await fakeBackend();
    const dir2 = appWithBackend(down.port);
    await down.close();
    const p2 = await startPreview(dir2, ['--no-watch', '--no-backend', '--host', '0.0.0.0', '--token', 't2']);
    try {
      const res = await request(p2.port, '/__nodegx/backend/health', { headers: PHONE });
      expect(res.status).toBe(502);
      expect(res.body).toContain("The app's backend on this computer");
    } finally {
      await p2.stop();
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });
});

describe('a preview that is not shared is as it was', () => {
  let backend: Awaited<ReturnType<typeof fakeBackend>>;
  let dir: string;
  let preview: RunningPreview;

  beforeAll(async () => {
    backend = await fakeBackend();
    dir = appWithBackend(backend.port);
    preview = await startPreview(dir, ['--no-watch', '--no-backend']);
  });
  afterAll(async () => {
    await preview?.stop();
    await backend?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('answers nodegx-config.json with nothing to apply, and carries no backend', async () => {
    expect(JSON.parse((await get(preview.port, '/nodegx-config.json', PHONE)).body)).toEqual({});
    const before = backend.seen.length;
    await request(preview.port, '/__nodegx/backend/health', { headers: PHONE });
    expect(backend.seen.length).toBe(before);
  });
});
