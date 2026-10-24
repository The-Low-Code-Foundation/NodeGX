/**
 * P125 CCN-001 s7 — one loopback origin for Studio, known before the first `initialize`.
 *
 * Why a proxy at all. Claude Desktop prefetches every `ui://` resource a tool names when the conversation loads
 * and caches it (run 5, 2026-10-23: `resources/read` at 09:22:57, the first `tools/call` at 09:23:07, no read
 * after). At that moment no project is open and no Studio is running, so whatever the resource says then is what
 * the panel shows for the rest of the conversation. Two things therefore cannot depend on a running Studio: the
 * panel's HTML, and the origin its CSP names (`connectDomains` is static per resource, and a port the kernel
 * chooses for Studio later is not known when the resource is read).
 *
 * So this server listens on a loopback port of its own at startup — the port is known before the MCP transport
 * connects — and forwards everything to whichever Studio `open_studio` has started. The resource names this
 * origin in its CSP and in the rewritten page, and the page asks `/api/hold` here until Studio answers.
 *
 * Plain HTTP forwarding: method, path, headers (minus `host`), the body streamed up, the answer streamed down,
 * which carries Studio's server-sent events (`/api/events`) as they are. No Studio yet → 503 with a JSON body the
 * bridge recognises as "starting". `unref()`, so an open listener never keeps this process alive after the host
 * closes stdio.
 *
 * CCN-006 — three paths are this server's own, not Studio's: `/__nodegx/status` (is the agent's server still here,
 * which agent, which folder, is the desktop app installed), `/__nodegx/companion.js` (the offer of the desktop app,
 * companion.ts) and `POST /__nodegx/open-app`. Studio's page (`GET /`) comes back with the companion added. With a
 * `portFile`, the proxy asks for the port it had last time before taking any free one, so a browser window left
 * open while the host restarted finds it again.
 *
 * CCN-008 — the mini editor's paths (`/__nodegx/mini/…`, `miniEditor/http.ts`) are this server's too, answered with
 * or without a Studio: `setOwnRoutes` puts them in front of the forwarding.
 */

import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as path from 'path';
import { COMPANION_JS, COMPANION_PATH, type CompanionStatus, injectCompanion, OPEN_APP_PATH, STATUS_PATH } from './companion';

export interface StudioProxy {
  origin: string;
  port: number;
  setTarget(origin: string | null): void;
  target(): string | null;
  /** What `/__nodegx/status` reports, and what `POST /__nodegx/open-app` does (true when the app was launched). */
  setCompanion(status: () => CompanionStatus, openApp: () => Promise<boolean>): void;
  /** P125 CCN-008 — paths this server answers itself (the mini editor's), asked before anything is forwarded. */
  setOwnRoutes(handle: (req: http.IncomingMessage, res: http.ServerResponse) => boolean): void;
  close(): void;
}

export interface StudioProxyOptions {
  /** A file holding the port this proxy had last time. Read before listening, written after. */
  portFile?: string;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

function lastPort(file: string | undefined): number {
  if (!file) return 0;
  try {
    const n = Number(fs.readFileSync(file, 'utf8').trim());
    return Number.isInteger(n) && n > 1024 && n < 65536 ? n : 0;
  } catch {
    return 0;
  }
}

export function startStudioProxy(options: StudioProxyOptions = {}): Promise<StudioProxy> {
  let target: string | null = null;
  let companion: { status: () => CompanionStatus; openApp: () => Promise<boolean> } | null = null;
  let ownRoutes: ((req: http.IncomingMessage, res: http.ServerResponse) => boolean) | null = null;
  const server = http.createServer((req, res) => {
    if (ownRoutes?.(req, res)) return;
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end();
      return;
    }
    const pathname = (req.url ?? '/').split('?')[0];
    if (pathname === STATUS_PATH) {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS });
      res.end(JSON.stringify({ ok: true, studio: target !== null, ...(companion ? companion.status() : {}) }));
      return;
    }
    if (pathname === COMPANION_PATH) {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
      res.end(COMPANION_JS);
      return;
    }
    if (pathname === OPEN_APP_PATH && req.method === 'POST') {
      req.resume();
      const answer = (opened: boolean) => {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS });
        res.end(JSON.stringify({ opened }));
      };
      (companion ? companion.openApp() : Promise.resolve(false)).then(answer, () => answer(false));
      return;
    }
    if (target === null) {
      res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS });
      res.end(JSON.stringify({ starting: true, error: 'Studio is not running yet: the agent has not called open_studio.' }));
      return;
    }
    const t = new URL(target);
    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    // Studio's page, which gets the companion: asked for unencoded, so it can be read and written as text.
    const page = req.method === 'GET' && (pathname === '/' || pathname === '/index.html');
    if (page) delete headers['accept-encoding'];
    const up = http.request({ host: t.hostname, port: Number(t.port), method: req.method, path: req.url, headers }, (ur) => {
      if (page && /text\/html/i.test(String(ur.headers['content-type'] ?? ''))) {
        const chunks: Buffer[] = [];
        ur.on('data', (c: Buffer) => chunks.push(c));
        ur.on('end', () => {
          const body = injectCompanion(Buffer.concat(chunks).toString('utf8'));
          const out = { ...ur.headers };
          delete out['content-length'];
          delete out['content-encoding'];
          res.writeHead(ur.statusCode ?? 502, out);
          res.end(body);
        });
        return;
      }
      res.writeHead(ur.statusCode ?? 502, ur.headers);
      ur.pipe(res);
    });
    up.on('error', (err) => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json', ...CORS });
      res.end(JSON.stringify({ error: `Studio at ${target} did not answer: ${err.message}` }));
    });
    req.pipe(up);
  });
  server.unref();
  const listen = (port: number) =>
    new Promise<number>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.removeListener('error', reject);
        resolve((server.address() as AddressInfo).port);
      });
    });
  const wanted = lastPort(options.portFile);
  return (wanted ? listen(wanted).catch(() => listen(0)) : listen(0)).then((port) => {
    if (options.portFile) {
      try {
        fs.mkdirSync(path.dirname(options.portFile), { recursive: true });
        fs.writeFileSync(options.portFile, String(port));
      } catch {
        /* the next start takes any free port, as it would without the file */
      }
    }
    return {
      origin: `http://127.0.0.1:${port}`,
      port,
      setTarget: (origin) => {
        target = origin;
      },
      target: () => target,
      setCompanion: (status, openApp) => {
        companion = { status, openApp };
      },
      setOwnRoutes: (handle) => {
        ownRoutes = handle;
      },
      close: () => server.close()
    };
  });
}
