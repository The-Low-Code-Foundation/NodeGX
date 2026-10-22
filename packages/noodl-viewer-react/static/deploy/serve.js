#!/usr/bin/env node
/**
 * Serves a NodeGX deploy folder on this computer, on the first free port.
 *
 *   node serve.js                 first free port from 3000 up
 *   node serve.js --port 8080     exactly 8080, or stop and say it is taken
 *   PORT=8080 node serve.js       the same, for hosts that set PORT
 *
 * Copied into every client-side deploy beside index.html (see DEPLOY.md there). No dependencies:
 * a person with Node and nothing else can open their app.
 *
 * 🔴 **Two consumers.** This file also supplies `listenOnFreePort` to the SSR server, which
 * requires it as `./public/serve.js` — the SSR layout always holds a full client-side deploy in
 * `public/`. One implementation, so the CSR folder and the SSR server cannot disagree about what
 * "free" means. `require.main === module` keeps the static server from starting inside the SSR
 * bundle.
 *
 * 🔴 **"Free" is checked on loopback first, not only by listening.** On macOS a server listening on
 * every interface (`*:3000`) starts happily beside another program's `127.0.0.1:3000` — and the
 * browser, opening `localhost:3000`, reaches the OTHER program. A port counts as free only when
 * 127.0.0.1 and ::1 can both be bound AND the real listen succeeds.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const DEFAULT_PORT = 3000;
const PORTS_TO_TRY = 50;

/**
 * The port a person asked for, and where they asked: `--port N`, `--port=N`, `-p N`, or `PORT`.
 * `null` when they asked for nothing. A flag wins over the environment.
 */
function readPortArg(argv, env) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') return parsePort(argv[i + 1], arg);
    if (arg.startsWith('--port=')) return parsePort(arg.slice('--port='.length), '--port');
  }
  if (env.PORT !== undefined && env.PORT !== '') return parsePort(env.PORT, 'PORT');
  return null;
}

function parsePort(value, from) {
  const port = Number(value);
  if (value === undefined || !/^\d+$/.test(String(value)) || port > 65535) {
    throw new Error(`${from} wants a port number between 1 and 65535, and got "${value ?? ''}".`);
  }
  return { port, from };
}

/** Whether `host:port` can be bound right now. A host this machine does not have counts as free. */
function canBind(port, host) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', (error) => {
      resolve(error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT');
    });
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen({ port, host, exclusive: true });
  });
}

async function loopbackFree(port) {
  return (await canBind(port, '127.0.0.1')) && (await canBind(port, '::1'));
}

function listenOn(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(server.address().port);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

function takenMessage(asked) {
  const how = asked.from === 'PORT' ? `PORT=${asked.port}` : `${asked.from} ${asked.port}`;
  return (
    `Port ${asked.port} is already in use by another program (you asked for it with ${how}).\n` +
    `Leave the port out to use the first free one from ${DEFAULT_PORT}, or choose another, e.g. --port ${asked.port + 1}.`
  );
}

/**
 * Starts `server` listening and resolves with the port it got.
 *
 * - Asked for a port: that port or an error naming it. Never a different one — a host that set
 *   `PORT` routes traffic to exactly that port, and a person who typed `--port 8080` will open 8080.
 * - Asked for nothing: the first free port from 3000, then whatever the OS hands out.
 */
async function listenOnFreePort(
  server,
  { argv = process.argv.slice(2), env = process.env, start = DEFAULT_PORT, attempts = PORTS_TO_TRY } = {}
) {
  const asked = readPortArg(argv, env);

  if (asked) {
    if (asked.port !== 0 && !(await loopbackFree(asked.port))) throw new Error(takenMessage(asked));
    try {
      return await listenOn(server, asked.port);
    } catch (error) {
      if (error.code === 'EADDRINUSE') throw new Error(takenMessage(asked));
      throw error;
    }
  }

  for (let port = start; port < start + attempts && port <= 65535; port++) {
    if (!(await loopbackFree(port))) continue;
    try {
      return await listenOn(server, port);
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  return listenOn(server, 0);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm'
};

/**
 * A file under `root`, else `index.html` for an app route (a path with no extension — the router
 * uses real paths, so reloading `/about` must still load the app), else 404.
 */
function createStaticHandler(root) {
  const indexHtml = path.join(root, 'index.html');

  function send(res, file, method) {
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-cache'
      });
      if (method === 'HEAD') res.end();
      else fs.createReadStream(file).pipe(res);
    });
  }

  return function handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end('Bad request');
      return;
    }

    const file = path.join(root, pathname);
    const outside = file !== root && !file.startsWith(root + path.sep);
    const hidden = pathname.split('/').some((part) => part.startsWith('.'));
    if (outside || hidden) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    fs.stat(file, (error, stat) => {
      if (!error && stat.isFile()) return send(res, file, req.method);
      if (!error && stat.isDirectory()) return send(res, path.join(file, 'index.html'), req.method);
      if (!path.extname(pathname)) return send(res, indexHtml, req.method);
      send(res, file, req.method);
    });
  };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Serves this NodeGX deploy on this computer.\n\n' +
        '  node serve.js                first free port from 3000 up\n' +
        '  node serve.js --port 8080    exactly 8080, or stop if it is taken\n'
    );
    return;
  }

  const root = __dirname;
  const server = http.createServer(createStaticHandler(root));
  listenOnFreePort(server)
    .then((port) => {
      console.log(`Serving ${root}`);
      console.log(`Open http://localhost:${port}/  (Ctrl+C to stop)`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { listenOnFreePort, readPortArg, createStaticHandler };

if (require.main === module) main();
