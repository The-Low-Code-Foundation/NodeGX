/**
 * DEP-002 — `--serve-app <dir>`: the backend serves a deployed app beside its API, on one origin.
 *
 * The rows that matter most are the first: with an app mounted, EVERY route in the live route table
 * answers exactly as it does without one, and none of them answers with the app's page. The table is
 * read from a running service (`getRouteTable()`), the same input deploy-assets.test.ts grades
 * nginx.conf with, so a route family added tomorrow is graded here tomorrow without anyone
 * remembering this file.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { BackendService, StartedService } from '../src/service';
import { requestOrigin } from '../src/server/static-app';

jest.setTimeout(60000);

const APP_MARKER = 'dep002-the-app-shell';
const SECRET = 'dep002-the-secret-above-the-app';

function appFolder(): string {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-app-'));
  fs.writeFileSync(path.join(parent, 'secret.txt'), SECRET);
  const root = path.join(parent, 'app');
  fs.mkdirSync(path.join(root, 'noodl_bundles'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'index.html'),
    `<html><body>${APP_MARKER}<script>fetch('nodegx-config.json')</script></body></html>`
  );
  fs.writeFileSync(path.join(root, 'noodl.deploy.js'), 'console.log("bundle")');
  fs.writeFileSync(path.join(root, 'noodl_bundles', 'b1.json'), '{"nodes":[]}');
  fs.writeFileSync(
    path.join(root, 'nodegx-config.json'),
    JSON.stringify({ cloudservices: { endpoint: 'http://localhost:51234', appId: 'baked-app-id', type: 'nodegx' } })
  );
  return root;
}

interface Answer {
  status: number;
  type: string;
  body: string;
}

/** One request, its status and at most a second of body (an SSE route never ends on its own). */
function ask(port: number, method: string, rawPath: string, headers: Record<string, string> = {}): Promise<Answer> {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: rawPath, headers }, (res) => {
      let body = '';
      const done = () => {
        clearTimeout(cap);
        res.destroy();
        resolve({ status: res.statusCode || 0, type: String(res.headers['content-type'] || ''), body });
      };
      const cap = setTimeout(done, 1000);
      res.on('data', (d) => (body += d));
      res.on('end', done);
    });
    req.setTimeout(5000, () => req.destroy(new Error('no answer')));
    req.on('error', (error) => resolve({ status: 0, type: '', body: String(error.message) }));
    req.end();
  });
}

/** A concrete path for a route pattern: each `:param` becomes a plausible value. */
function concrete(pattern: string): string {
  return '/' + pattern.replace(/:[A-Za-z0-9_]+/g, 'x');
}

describe('DEP-002 --serve-app', () => {
  let withAppService: BackendService;
  let withApp: StartedService;
  let without: StartedService;
  let appRoot: string;

  beforeAll(async () => {
    appRoot = appFolder();
    withAppService = new BackendService({
      dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-data-a-')),
      port: 0,
      serveApp: appRoot
    });
    withApp = await withAppService.start();
    without = await new BackendService({
      dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-data-b-')),
      port: 0
    }).start();
  });

  afterAll(async () => {
    await withApp?.stop();
    await without?.stop();
  });

  it('every route in the live table answers as it does with no app, and never with the app', async () => {
    const table = withAppService.getRouteTable();
    expect(table.length).toBeGreaterThanOrEqual(35);

    const differs: string[] = [];
    const servedTheApp: string[] = [];
    for (const route of table) {
      const p = concrete(route.pattern);
      const a = await ask(withApp.listen.port, route.method, p);
      const b = await ask(without.listen.port, route.method, p);
      if (a.status !== b.status) differs.push(`${route.method} ${p}: ${a.status} with the app, ${b.status} without`);
      if (a.body.includes(APP_MARKER)) servedTheApp.push(`${route.method} ${p}`);
    }
    expect({ differs, servedTheApp }).toEqual({ differs: [], servedTheApp: [] });
  });

  it('a path under a route family that matches no route keeps its JSON 404', async () => {
    for (const p of ['/classes/A/b/c/d/e', '/admin/no/such/thing/here', '/functions/a/b/c', '/files']) {
      const a = await ask(withApp.listen.port, 'GET', p);
      expect({ p, status: a.status, app: a.body.includes(APP_MARKER) }).toEqual({ p, status: 404, app: false });
      expect(a.type).toContain('application/json');
    }
  });

  it('/_admin is still the dashboard', async () => {
    const a = await ask(withApp.listen.port, 'GET', '/_admin');
    expect(a.status).toBe(200);
    expect(a.body).not.toContain(APP_MARKER);
  });

  it('the app: its page at /, its files, and its page again for a deep path (a refresh on a client route)', async () => {
    const root = await ask(withApp.listen.port, 'GET', '/');
    expect([root.status, root.body.includes(APP_MARKER)]).toEqual([200, true]);

    const bundle = await ask(withApp.listen.port, 'GET', '/noodl.deploy.js');
    expect([bundle.status, bundle.type, bundle.body]).toEqual([200, 'text/javascript; charset=utf-8', 'console.log("bundle")']);

    const data = await ask(withApp.listen.port, 'GET', '/noodl_bundles/b1.json');
    expect([data.status, data.body]).toEqual([200, '{"nodes":[]}']);

    const deep = await ask(withApp.listen.port, 'GET', '/lessons/3/edit?tab=2');
    expect([deep.status, deep.body.includes(APP_MARKER)]).toEqual([200, true]);

    const missing = await ask(withApp.listen.port, 'GET', '/no-such-file.js');
    expect([missing.status, missing.body.includes(APP_MARKER)]).toEqual([404, false]);
  });

  it('a write to a path the API does not have is a 404, not the page', async () => {
    const a = await ask(withApp.listen.port, 'POST', '/lessons/3');
    expect([a.status, a.body.includes(APP_MARKER)]).toEqual([404, false]);
  });

  it('nodegx-config.json points the page at the address the browser used, keeping the rest of the file', async () => {
    const local = await ask(withApp.listen.port, 'GET', '/nodegx-config.json');
    expect(local.status).toBe(200);
    expect(JSON.parse(local.body)).toEqual({
      cloudservices: { endpoint: `http://127.0.0.1:${withApp.listen.port}`, appId: 'baked-app-id', type: 'nodegx' }
    });

    const proxied = await ask(withApp.listen.port, 'GET', '/nodegx-config.json', {
      Host: 'app.example.com',
      'X-Forwarded-Proto': 'https'
    });
    expect(JSON.parse(proxied.body).cloudservices.endpoint).toBe('https://app.example.com');
  });

  it('a Host that is not a host name falls back to the socket address', () => {
    const req = { headers: { host: 'evil.example"><script>' }, socket: { localPort: 4321 } } as unknown as http.IncomingMessage;
    expect(requestOrigin(req)).toBe('http://127.0.0.1:4321');
  });

  it.each(['/../secret.txt', '/..%2fsecret.txt', '/%2e%2e%2fsecret.txt', '/x/..%2f..%2fsecret.txt', '/a%00b'])(
    '%s reaches nothing outside the folder, and the backend keeps serving',
    async (rawPath) => {
      const a = await ask(withApp.listen.port, 'GET', rawPath);
      expect(a.status).not.toBe(200);
      expect(a.body).not.toContain(SECRET);
      expect((await ask(withApp.listen.port, 'GET', '/health')).status).toBe(200);
    }
  );

  it('refuses to start on a folder with no app in it, and names the folder', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-empty-'));
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-data-c-'));
    await expect(new BackendService({ dataDir, port: 0, serveApp: empty }).start()).rejects.toThrow(
      `--serve-app: ${empty} has no index.html`
    );
    const nowhere = path.join(empty, 'not-here');
    await expect(new BackendService({ dataDir, port: 0, serveApp: nowhere }).start()).rejects.toThrow(
      `--serve-app: ${nowhere} is not a folder`
    );
    // Refused before anything opened: the data dir holds no database.
    expect(fs.readdirSync(dataDir).filter((f) => f.endsWith('.db') || f.endsWith('.sqlite'))).toEqual([]);
  });
});
