/**
 * P125 CCN-006 — the offer of the desktop app in a browser window of Studio (src/studio/companion.ts), served by the
 * proxy (src/studio/studioProxy.ts), and where the app is found (src/studio/studioApp.ts).
 */

import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as os from 'os';
import * as path from 'path';
import { clientLabel, COMPANION_JS, COMPANION_PATH, injectCompanion } from '../src/studio/companion';
import { findStudioApp } from '../src/studio/studioApp';
import { startStudioProxy, type StudioProxy } from '../src/studio/studioProxy';

const PAGE = '<!doctype html><html><head><title>Studio</title></head><body><main>studio</main></body></html>';

function fakeStudio(): Promise<{ origin: string; close: () => void }> {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': Buffer.byteLength(PAGE) });
      res.end(PAGE);
    } else if (req.url === '/api/hold') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"held":false}');
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() })
    )
  );
}

describe('the companion script', () => {
  it('parses as JavaScript', () => {
    expect(() => new Function(COMPANION_JS)).not.toThrow();
  });

  it('is added once to a whole page, before </body>', () => {
    const once = injectCompanion(PAGE);
    expect(once).toContain(`<script src="${COMPANION_PATH}" defer></script></body>`);
    expect(injectCompanion(once)).toBe(once);
    expect(injectCompanion('{"not":"html"}')).toBe('{"not":"html"}');
  });

  it('names the agent the way a person does', () => {
    expect(clientLabel('claude-code')).toBe('Claude Code');
    expect(clientLabel('claude-ai')).toBe('Claude');
    expect(clientLabel('local-agent-mode-abc')).toBe('Claude');
    expect(clientLabel('Cline')).toBe('Cline');
    expect(clientLabel(undefined)).toBe('your AI agent');
  });
});

describe('the proxy serves the companion', () => {
  let studio: Awaited<ReturnType<typeof fakeStudio>>;
  let proxy: StudioProxy;
  let opened = 0;

  beforeAll(async () => {
    studio = await fakeStudio();
    proxy = await startStudioProxy();
    proxy.setTarget(studio.origin);
    proxy.setCompanion(
      () => ({ client: 'Claude Code', projectDir: '/tmp/Puppy', app: null, download: 'https://nodegx.io/studio/', scheme: 'nodegx-studio' }),
      async () => {
        opened += 1;
        return true;
      }
    );
  });
  afterAll(() => {
    proxy.close();
    studio.close();
  });

  it("adds it to Studio's page and leaves the length to the new body", async () => {
    const r = await fetch(`${proxy.origin}/`);
    const body = await r.text();
    expect(body).toContain(COMPANION_PATH);
    expect(body).toContain('<main>studio</main>');
    expect(r.headers.get('content-length')).not.toBe(String(Buffer.byteLength(PAGE)));
  });

  it('passes everything else through untouched', async () => {
    expect(await (await fetch(`${proxy.origin}/api/hold`)).json()).toEqual({ held: false });
  });

  it('answers status itself, with Studio running or not', async () => {
    const s = await (await fetch(`${proxy.origin}/__nodegx/status`)).json();
    expect(s).toMatchObject({ ok: true, studio: true, client: 'Claude Code', projectDir: '/tmp/Puppy', app: null });
    proxy.setTarget(null);
    expect(await (await fetch(`${proxy.origin}/__nodegx/status`)).json()).toMatchObject({ ok: true, studio: false });
    proxy.setTarget(studio.origin);
  });

  it('serves the script and opens the app on a POST', async () => {
    const js = await (await fetch(`${proxy.origin}${COMPANION_PATH}`)).text();
    expect(js).toBe(COMPANION_JS);
    const r = await (await fetch(`${proxy.origin}/__nodegx/open-app`, { method: 'POST' })).json();
    expect(r).toEqual({ opened: true });
    expect(opened).toBe(1);
  });
});

describe('the proxy asks for its last port first', () => {
  it('takes the remembered port, and any free one when that is taken', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccn006-'));
    const portFile = path.join(dir, 'nested', 'port');
    const first = await startStudioProxy({ portFile });
    expect(fs.readFileSync(portFile, 'utf8')).toBe(String(first.port));
    // Still listening: the same port is taken, so the second gets another and remembers that one.
    const second = await startStudioProxy({ portFile });
    expect(second.port).not.toBe(first.port);
    first.close();
    second.close();
    await new Promise((r) => setTimeout(r, 50));
    const third = await startStudioProxy({ portFile });
    expect(third.port).toBe(second.port);
    third.close();
  });
});

describe('the desktop app is found where its installer puts it', () => {
  const saved = process.env.NODEGX_STUDIO_APP;
  afterEach(() => {
    if (saved === undefined) delete process.env.NODEGX_STUDIO_APP;
    else process.env.NODEGX_STUDIO_APP = saved;
  });

  it('says none when told so', () => {
    process.env.NODEGX_STUDIO_APP = 'none';
    expect(findStudioApp()).toBeNull();
  });

  it('reads whether the app declares nodegx-studio:// links', () => {
    const app = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ccn006-app-')), 'NodeGX Studio.app');
    fs.mkdirSync(path.join(app, 'Contents'), { recursive: true });
    fs.writeFileSync(path.join(app, 'Contents', 'Info.plist'), '<plist><dict></dict></plist>');
    process.env.NODEGX_STUDIO_APP = app;
    expect(findStudioApp()).toEqual({ path: app, opensLinks: false });
    fs.writeFileSync(
      path.join(app, 'Contents', 'Info.plist'),
      '<plist><dict><key>CFBundleURLSchemes</key><array><string>nodegx-studio</string></array></dict></plist>'
    );
    expect(findStudioApp()).toEqual({ path: app, opensLinks: process.platform === 'darwin' });
  });
});
