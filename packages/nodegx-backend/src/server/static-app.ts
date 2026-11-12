/**
 * DEP-002 — `--serve-app <dir>`: this backend serves the app beside its API, on one origin.
 *
 * One process, one port, no Docker: the shape WF-003's nginx stack has in production, made by the
 * backend itself. `HttpServer.handle` asks this module only when NO route matched, so an API route
 * always wins by construction; and a path whose first segment is a route family (`/classes/…`,
 * `/admin/…`) keeps the JSON 404 a mistyped API call should get, rather than the app's page. The
 * families are read off the live route table (`HttpServer.appFamilies`), never a hand-written list —
 * the same names `deploy/nginx.conf` forwards and SELF-HOSTING.md reserves.
 *
 * 🔴 **One static server, not two.** The files are served by the handler every client-side deploy
 * already carries (`noodl-viewer-react/static/deploy/serve.js`): MIME types, the traversal and
 * dot-file refusals, the SPA fallback (a path with no extension is `index.html`). esbuild bundles it
 * into `dist/cli.js` from this relative require, so the folder and the backend cannot disagree about
 * which paths are refused.
 *
 * **The backend address the page reads** (`/nodegx-config.json`, DEP-001) is answered per request:
 * the app's own file, with `cloudservices.endpoint` set to the origin the browser asked — `Host`,
 * and `X-Forwarded-Proto` when a proxy in front terminates TLS. So the same folder works at
 * `http://localhost:3100`, on a VM's bare IP, and behind Caddy at `https://app.example.com`. A
 * client that forges either header changes only its own `no-store` answer. Not `''` (WF-003's
 * relative form): the runtime's `endpointBackendEntry` reads an empty endpoint as "no backend".
 *
 * @module nodegx-backend/server/static-app
 */

import * as fs from 'fs';
import type * as http from 'http';
import * as path from 'path';

import { isPlainPathPrefix } from '../storage/fileAddress';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const deployServe = require('../../../noodl-viewer-react/static/deploy/serve.js') as {
  createStaticHandler: (root: string, opts?: { deployConfig?: unknown }) => (req: http.IncomingMessage, res: http.ServerResponse) => void;
  resolveDeployConfig: (root: string, override: { endpoint?: string } | null) => { config: Record<string, unknown> };
  DEPLOY_CONFIG_FILE: string;
};

export interface ServedApp {
  /** Absolute path of the folder served. */
  root: string;
  /**
   * False when the folder's `index.html` never reads `nodegx-config.json` — a deploy made before
   * DEP-001, whose page calls the address baked into it whatever this backend answers.
   */
  readsDeployConfig: boolean;
  /** Answers a GET or HEAD the route table did not match. */
  handle(req: http.IncomingMessage, res: http.ServerResponse): void;
}

/**
 * The folder as a served app, or an Error whose message says what is wrong with it. Called at the
 * top of `BackendService.start`, before the database opens, so a wrong path is a one-line refusal.
 */
export function openServedApp(dir: string): ServedApp {
  const root = path.resolve(dir);
  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(root);
  } catch {
    stat = null;
  }
  if (!stat || !stat.isDirectory()) {
    throw new Error(`--serve-app: ${root} is not a folder. Give it the folder that holds the deployed app's index.html.`);
  }
  const indexFile = path.join(root, 'index.html');
  if (!fs.existsSync(indexFile)) {
    throw new Error(
      `--serve-app: ${root} has no index.html, so there is no app to serve. Give it the folder a deploy wrote ` +
        '(the one with index.html and noodl.deploy.js in it).'
    );
  }
  const readsDeployConfig = fs.readFileSync(indexFile, 'utf8').includes(deployServe.DEPLOY_CONFIG_FILE);
  const files = deployServe.createStaticHandler(root);
  const configPath = '/' + deployServe.DEPLOY_CONFIG_FILE;

  return {
    root,
    readsDeployConfig,
    handle(req, res) {
      const pathname = (req.url || '/').split('?')[0];
      if (pathname !== configPath) {
        files(req, res);
        return;
      }
      const { config } = deployServe.resolveDeployConfig(root, { endpoint: requestOrigin(req) });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(config, null, 2) + '\n');
    }
  };
}

/**
 * `http://host:port` as the browser asked it, `https` when a proxy says it terminated TLS, and the path a proxy says it
 * serves this backend under (`X-Forwarded-Prefix`), so a File's url leads back through that proxy.
 *
 * P112-OWN023-PHONEPREVIEW: a preview shared on the Wi-Fi carries its app's backend under `/__nodegx/backend` on its
 * own address (the phone cannot reach this machine's loopback); without the prefix a photo's url would name the
 * preview's own `/files/…`, which it does not serve. Like `Host`, the header only shapes the answer to the request that
 * sent it, so it needs no trust list; anything but a plain path is ignored.
 */
export function requestOrigin(req: http.IncomingMessage): string {
  const forwarded = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  const proto = forwarded === 'https' ? 'https' : 'http';
  // A Host that is not a plain host[:port] cannot be an origin; fall back to the socket's own.
  const host = String(req.headers.host || '');
  const safeHost = /^[A-Za-z0-9.\-[\]:]+$/.test(host) ? host : `127.0.0.1:${req.socket.localPort}`;
  const prefix = String(req.headers['x-forwarded-prefix'] || '').replace(/\/+$/, '');
  const safePrefix = isPlainPathPrefix(prefix) ? prefix : '';
  return `${proto}://${safeHost}${safePrefix}`;
}
