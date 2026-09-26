/**
 * The one origin the journal's pages live on (TPL-011-DESKTOP DESK-1).
 *
 * `nodegx-backend` serves no static files (HttpServer.ts has no static route), and a
 * NodeGX app does not discover its backend: the export bakes
 * `metadata.cloudservices.endpoint` into the bundle. An EMPTY endpoint is not an
 * option either — `resolveBackend.pure.ts::endpointBackendEntry` reads it as "no
 * backend". So the page is served from a fixed loopback origin, that origin is what
 * gets baked, and everything the page asks for that is not a file of the app is
 * passed through to the backend, which runs on whatever port it was given.
 *
 * The rule is by FILE, not by a list of backend routes: a file of the app is served,
 * a page navigation (GET asking for HTML) gets `index.html` (the app routes by path),
 * and anything else goes to the backend. A route the backend adds later therefore
 * cannot 404 here — the drift nginx.conf needs a test to catch does not exist.
 *
 * Plain Node, no dependencies, so it runs in Electron's main process and under
 * `node --test` alike.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

/** The app file a URL path names, or null. Never a path outside `appDir`. */
function appFile(appDir, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = path.resolve(appDir, rel);
  if (full !== appDir && !full.startsWith(appDir + path.sep)) return null;
  try {
    return fs.statSync(full).isFile() ? full : null;
  } catch {
    return null;
  }
}

function sendFile(req, res, file) {
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const size = fs.statSync(file).size;
  // index.html names the hashed bundle; it must never be served stale after an update.
  const cache = path.basename(file) === 'index.html' ? 'no-cache' : 'public, max-age=3600';
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'cache-control': cache });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

function wantsPage(req) {
  return (req.method === 'GET' || req.method === 'HEAD') && /text\/html/.test(req.headers.accept || '');
}

/**
 * @param {{ appDir: string, backendPort: () => number | null, log?: (line: string) => void }} options
 *   `backendPort` is read per request, so the relay can be listening before the backend is up
 *   and answers 503 until it is.
 */
function createRelay({ appDir, backendPort, log = () => {} }) {
  const root = path.resolve(appDir);
  const index = path.join(root, 'index.html');

  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url, 'http://relay').pathname;

    if (req.method === 'GET' || req.method === 'HEAD') {
      const file = appFile(root, urlPath);
      if (file) return sendFile(req, res, file);
      if (wantsPage(req)) return sendFile(req, res, index);
    }

    const port = backendPort();
    if (!port) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('The book is still opening.');
    }
    const upstream = http.request(
      { host: '127.0.0.1', port, method: req.method, path: req.url, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers);
        up.pipe(res);
      }
    );
    upstream.on('error', (err) => {
      log(`relay: ${req.method} ${req.url} -> ${err.message}`);
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end();
    });
    req.pipe(upstream);
  });

  // A WebSocket upgrade goes to the backend as raw bytes (realtime, if the app ever uses it).
  server.on('upgrade', (req, socket, head) => {
    const port = backendPort();
    if (!port) return socket.destroy();
    const up = net.connect(port, '127.0.0.1', () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      up.write(lines.join('\r\n') + '\r\n\r\n');
      if (head && head.length) up.write(head);
      up.pipe(socket);
      socket.pipe(up);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });

  return server;
}

module.exports = { createRelay, appFile };
