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
 */

import * as http from 'http';
import type { AddressInfo } from 'net';

export interface StudioProxy {
  origin: string;
  port: number;
  setTarget(origin: string | null): void;
  target(): string | null;
  close(): void;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

export function startStudioProxy(): Promise<StudioProxy> {
  let target: string | null = null;
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end();
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
    const up = http.request({ host: t.hostname, port: Number(t.port), method: req.method, path: req.url, headers }, (ur) => {
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
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        port,
        setTarget: (origin) => {
          target = origin;
        },
        target: () => target,
        close: () => server.close()
      });
    });
  });
}
