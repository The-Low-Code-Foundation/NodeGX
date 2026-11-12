/**
 * The preview server.
 *
 * Serves the same file set `deployToFolder` writes — the deployed runtime
 * bundle, `index.html` with the modules injected, `index.js` carrying
 * `window.projectData`, and `noodl_bundles/<id>.json` — except it holds the
 * generated parts in memory and swaps them atomically when the project changes.
 * Anything it does not recognise is served from the project directory, which is
 * how a real deploy resolves project assets (deployToFolder copies the project
 * folder alongside the runtime).
 *
 * Plus one route the deploy path has no equivalent of: `/__preview/events`, an
 * SSE channel the injected client listens on for reloads and diagnostics.
 *
 * @module noodl-preview/server
 */

import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

import { type Access, authoriseRequest, resolveAccess, TOKEN_COOKIE, TOKEN_HEADER } from '../../nodegx-export/src/serve/access';

import { buildIgnoreMatcher } from '@noodl-utils/compilation/build/ignore';

import { bootstrapPage, injectClient } from './client';
import { DEPLOY_ASSETS, deployAssetPath, type PreviewBuild } from './loader';
import type { PreviewReport } from './validate';

/** What the server currently believes about the project on disk. */
export type PreviewState =
  // NPMAUDIT-PREVIEWWARNINGS: a good build keeps its validation report, so a poller sees the warnings the cli prints.
  | { kind: 'ok'; report?: PreviewReport }
  | { kind: 'invalid'; report: PreviewReport }
  | { kind: 'error'; message: string };

/**
 * The body of `GET /__preview/state` — the server's machine-readable status.
 * The CLI polls this in `--once` mode and the tests assert against it, so it is
 * a public contract rather than an implementation detail.
 */
export interface PreviewStatus {
  state: PreviewState;
  hasBuild: boolean;
  warnings: string[];
  projectDir: string;
}

/**
 * NPMAUDIT-PREVIEWWARNINGS — the validation warnings of a build that rendered, one line each, as `warnings` carries
 * them. The cli printed "! 3 validation warning(s) — rendering anyway" while this endpoint said `warnings: []`, so a
 * tool polling it read a clean project.
 */
function validationWarningLines(state: PreviewState): string[] {
  if (state.kind !== 'ok' || !state.report) return [];
  return state.report.diagnostics
    .filter((d) => d.severity === 'warning')
    .map((d) => `${d.code} in ${d.component}${d.nodeLabel || d.nodeId ? ` (${d.nodeLabel ?? d.nodeId})` : ''}: ${d.message}`);
}

/** One frame pushed down the SSE channel at `/__preview/events`. */
export type PreviewEvent =
  | { type: 'ok' }
  | { type: 'reload' }
  | { type: 'diagnostics'; diagnostics: PreviewReport['diagnostics']; summary: PreviewReport['summary'] }
  | { type: 'error'; message: string };

export interface PreviewServerOptions {
  projectDir: string;
  port: number;
  host?: string;
  /**
   * HLS-006 — the access decision, from the one module that makes it
   * (`@nodegx/export/serve/access`). Optional so an in-repo caller that has
   * always run on loopback keeps working unchanged; absent means loopback and
   * no gate, which is what `resolveAccess()` returns for an empty request.
   */
  access?: Access;
  /**
   * P112-OWN023-PHONEPREVIEW — the port of the app's own backend on this machine (`namedBackend`), when the project
   * names one. A shared preview carries it under {@link BACKEND_PREFIX} and tells the page so; see `handle`.
   */
  backendPort?: number;
}

/**
 * P112-OWN023-PHONEPREVIEW — where a shared preview carries the app's backend, on its own address.
 *
 * Shared on the Wi-Fi (`--host`), the page reached a phone and still called its backend at `127.0.0.1:<port>`, which on
 * a phone is the phone: no records, no sign-in. So the preview answers the page's `nodegx-config.json` (DEP-001, the
 * deploy's own re-pointing) with this path on the address the page came from, and forwards it to the backend. It sits
 * behind the preview's own gate, the token cookie the page already holds, so sharing opens nothing on the network that
 * the shared page did not; the backend itself stays on loopback. Not on a preview that is not shared: there the page
 * and the backend are on the same machine and the address it was built with is right.
 */
export const BACKEND_PREFIX = '/__nodegx/backend';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8'
};

const mimeFor = (file: string) => MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

export class PreviewServer {
  private readonly server: http.Server;
  /** HLS-006 — the binding and the gate, decided once in `@nodegx/export/serve/access`. */
  private readonly access: Access;
  private readonly clients = new Set<http.ServerResponse>();
  private readonly projectDir: string;

  /** Last build that rendered. Kept across invalid states — that is the point. */
  private build: PreviewBuild | null = null;
  private state: PreviewState = { kind: 'error', message: 'Loading…' };
  private indexJs = '';

  constructor(private readonly options: PreviewServerOptions) {
    this.projectDir = path.resolve(options.projectDir);
    // HLS-006. `--host` on this CLI was an unauthenticated LAN listener: the default was already
    // loopback, so #31 never named it, but the *shared* case had no credential at all — the same
    // defect one flag further along. The policy is the shared one deliberately; a second copy of
    // a security default is the thing HLS-006 exists to prevent.
    this.access = options.access ?? resolveAccess();

    this.server = http.createServer((req, res) => {
      const verdict = authoriseRequest(
        { url: req.url, headers: req.headers, remoteAddress: req.socket.remoteAddress },
        this.access
      );
      if (verdict.ok === false) {
        res.writeHead(verdict.status, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(verdict.body);
        return;
      }
      if (verdict.setCookie) res.setHeader('Set-Cookie', verdict.setCookie);

      this.handle(req, res).catch((err) => {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(String(err && err.stack ? err.stack : err));
      });
    });
  }

  listen(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      // The address comes from the access decision, never from `options.host` directly — that
      // asymmetry is what stops a forwarded option re-opening the port. See `serve/access.ts`.
      this.server.listen(this.options.port, this.access.host, () => {
        const address = this.server.address();
        resolve(typeof address === 'object' && address ? address.port : this.options.port);
      });
    });
  }

  async close(): Promise<void> {
    for (const client of this.clients) client.end();
    this.clients.clear();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  /** Number of connected browsers — the CLI reports it, tests assert on it. */
  get clientCount(): number {
    return this.clients.size;
  }

  getState(): PreviewState {
    return this.state;
  }

  /** Installs a new good build and tells every browser to reload. */
  setBuild(build: PreviewBuild, report?: PreviewReport): void {
    this.build = build;
    this.indexJs = fs
      .readFileSync(deployAssetPath('index.js'), 'utf8')
      .replace(/{{#export#}}/g, JSON.stringify(build.exportJson));
    this.state = report ? { kind: 'ok', report } : { kind: 'ok' };
    this.broadcast({ type: 'reload' });
  }

  /**
   * Reports a bad snapshot. The previous build stays installed so the browser
   * keeps rendering it underneath the overlay.
   */
  setInvalid(report: PreviewReport): void {
    this.state = { kind: 'invalid', report };
    this.broadcast({ type: 'diagnostics', diagnostics: report.diagnostics, summary: report.summary });
  }

  setError(message: string): void {
    this.state = { kind: 'error', message };
    this.broadcast({ type: 'error', message });
  }

  // ─── Wire ──────────────────────────────────────────────────────────────────

  private broadcast(message: PreviewEvent): void {
    const frame = `data: ${JSON.stringify(message)}\n\n`;
    for (const client of this.clients) client.write(frame);
  }

  /** The frame a browser gets the moment it connects — never `reload`, which would loop. */
  private helloFrame(): PreviewEvent {
    switch (this.state.kind) {
      case 'invalid':
        return { type: 'diagnostics', diagnostics: this.state.report.diagnostics, summary: this.state.report.summary };
      case 'error':
        return { type: 'error', message: this.state.message };
      default:
        return { type: 'ok' };
    }
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/__preview/events') return this.serveEvents(req, res);

    const backendPort = this.sharedBackendPort();
    if (backendPort && (pathname === BACKEND_PREFIX || pathname.startsWith(BACKEND_PREFIX + '/'))) {
      return this.proxyToBackend(req, res, backendPort);
    }

    // Machine-readable status: what the CLI polls in --once mode and tests read.
    if (pathname === '/__preview/state') {
      const status: PreviewStatus = {
        state: this.state,
        hasBuild: this.build !== null,
        warnings: [...(this.build?.warnings ?? []), ...validationWarningLines(this.state)],
        projectDir: this.projectDir
      };
      return this.sendJson(res, status);
    }

    if (pathname === '/' || pathname === '/index.html') {
      const html = this.build ? injectClient(this.build.html) : bootstrapPage(path.basename(this.projectDir));
      return this.sendDynamic(res, html, 'text/html; charset=utf-8');
    }

    if (pathname === '/index.js') {
      if (!this.build) return this.notFound(res);
      return this.sendDynamic(res, this.indexJs, 'application/javascript; charset=utf-8');
    }

    if (pathname.startsWith('/noodl_bundles/')) {
      const id = path.basename(pathname, '.json');
      const bundle = this.build?.bundles[id];
      if (!bundle) return this.notFound(res);
      return this.sendDynamic(res, bundle, 'application/json; charset=utf-8');
    }

    // DEP-001: the deploy page asks for `nodegx-config.json` to re-point its backend. A preview's
    // backend arrives with its build; a stray config file in the project folder must not override
    // it, so this path is always "no override" and never a project file. P112-OWN026-CONFIGFOUROHFOUR:
    // said as `{}` (the viewer applies nothing from it), not a 404, which every browser logs as a red
    // console error on every page load, so no previewed app could pass "no console errors".
    // P112-OWN023-PHONEPREVIEW: shared, the one thing it says is where the backend is, on the address the page came from.
    if (pathname === '/nodegx-config.json') {
      const origin = backendPort ? pageOrigin(req) : null;
      const config = origin ? { cloudservices: { endpoint: origin + BACKEND_PREFIX } } : {};
      return this.sendDynamic(res, JSON.stringify(config), 'application/json; charset=utf-8');
    }

    const asset = pathname.slice(1);
    if (DEPLOY_ASSETS.includes(asset)) {
      return this.sendFile(req, res, deployAssetPath(asset));
    }

    // Everything else: a project asset (images, fonts, module files).
    const target = path.resolve(this.projectDir, `.${pathname}`);
    if (!target.startsWith(this.projectDir + path.sep)) return this.notFound(res);
    if (!this.isPublishable(target)) return this.notFound(res);
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return this.sendFile(req, res, target);
    }

    // P112-S16-DEEPLINK: an app routed by path ("/lesson/greetings") is one page; any address that names no file is
    // the app, as the deploy's server answers it (Caddy `try_files {path} /index.html`). Without this every reload off
    // "/" — and the live reload after each edit is one — showed "Not found". A missing asset (it has an extension) and
    // a file the deploy would not publish (it exists, refused above) stay 404.
    const base = path.basename(pathname);
    if (!fs.existsSync(target) && path.extname(base) === '' && !base.startsWith('.')) {
      const html = this.build ? injectClient(this.build.html) : bootstrapPage(path.basename(this.projectDir));
      return this.sendDynamic(res, html, 'text/html; charset=utf-8');
    }

    return this.notFound(res);
  }

  /**
   * P112-S14-ENVSERVED: the preview serves a project file only if a deploy would publish it — the deploy's own rules
   * (`ignore.ts` defaults + the project's `.noodlignore`). Before, every file in the folder was served, `.env`
   * included: the key OWN-015 asks the person to paste there was one request away, and with `--host` on the LAN.
   * Built per request so an edited `.noodlignore` applies at once; static asset requests are few.
   */
  private isPublishable(target: string): boolean {
    const ignoreFile = path.join(this.projectDir, '.noodlignore');
    const matcher = buildIgnoreMatcher({
      isV2Project: fs.existsSync(path.join(this.projectDir, 'nodegx.project.json')),
      ignoreFileContent: fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : null
    });
    const relative = path.relative(this.projectDir, target).split(path.sep).join('/');
    return !matcher.match(relative, false).ignored;
  }

  private serveEvents(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      // Buffering proxies would defeat the whole channel.
      'x-accel-buffering': 'no'
    });
    res.write(`data: ${JSON.stringify(this.helloFrame())}\n\n`);

    this.clients.add(res);
    // Keep intermediaries (and some browsers) from timing the stream out.
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    });
  }

  /** The backend port a SHARED preview carries, else undefined. */
  private sharedBackendPort(): number | undefined {
    return this.access.shared && this.options.backendPort ? this.options.backendPort : undefined;
  }

  /**
   * P112-OWN023-PHONEPREVIEW — one request on to the backend on loopback, streamed both ways (its realtime channel is a
   * long `text/event-stream`). The backend is told where the page reached it (`Host`, `X-Forwarded-Prefix`), so a
   * File's url it answers with leads back through here; the preview's own token is not passed on.
   */
  private proxyToBackend(req: http.IncomingMessage, res: http.ServerResponse, port: number): void {
    const raw = req.url ?? '/';
    const rest = raw.slice(BACKEND_PREFIX.length) || '/';
    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    delete headers[TOKEN_HEADER];
    const cookie = withoutCookie(req.headers.cookie, TOKEN_COOKIE);
    if (cookie) headers.cookie = cookie;
    else delete headers.cookie;
    headers['x-forwarded-prefix'] = BACKEND_PREFIX;
    headers['x-forwarded-proto'] = 'http';
    const peer = req.socket.remoteAddress;
    if (peer) headers['x-forwarded-for'] = peer;

    const upstream = http.request(
      { host: '127.0.0.1', port, method: req.method, path: rest.startsWith('/') ? rest : '/' + rest, headers },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      }
    );
    upstream.on('error', (err) => {
      if (res.headersSent) {
        res.destroy(err);
        return;
      }
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end(`The app's backend on this computer (port ${port}) did not answer: ${err.message}\n`);
    });
    // a client gone (a closed tab, an EventSource closed) ends the upstream request too
    res.on('close', () => upstream.destroy());
    req.pipe(upstream);
  }

  private sendJson(res: http.ServerResponse, body: unknown): void {
    this.sendDynamic(res, JSON.stringify(body, null, 2), 'application/json; charset=utf-8');
  }

  /** Generated content: never cached, it changes on every edit. */
  private sendDynamic(res: http.ServerResponse, body: string, contentType: string): void {
    const buffer = Buffer.from(body, 'utf8');
    res.writeHead(200, {
      'content-type': contentType,
      'content-length': buffer.length,
      'cache-control': 'no-store'
    });
    res.end(buffer);
  }

  /**
   * Static content, revalidated by ETag. Matters more than it looks: the
   * deployed runtime bundle is ~5 MB and every reload re-requests it, so
   * without a 304 path "sub-second reload" would not hold.
   */
  private sendFile(req: http.IncomingMessage, res: http.ServerResponse, file: string): void {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      return this.notFound(res);
    }

    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { etag, 'cache-control': 'no-cache' });
      res.end();
      return;
    }

    res.writeHead(200, {
      'content-type': mimeFor(file),
      'content-length': stat.size,
      'cache-control': 'no-cache',
      etag
    });
    fs.createReadStream(file).pipe(res);
  }

  private notFound(res: http.ServerResponse): void {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('Not found');
  }
}

/** `http://host:port` as the page asked for it, or null when `Host` is not a plain host[:port]. */
function pageOrigin(req: http.IncomingMessage): string | null {
  const host = String(req.headers.host || '');
  return /^[A-Za-z0-9.\-[\]:]+$/.test(host) ? `http://${host}` : null;
}

/** A `Cookie` header with one cookie taken out, or undefined when nothing is left. */
function withoutCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const kept = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && part.split('=')[0].trim() !== name);
  return kept.length ? kept.join('; ') : undefined;
}
