/**
 * HST-006 §7: what `../src/service` becomes when the backend's own HTTP suites run against a service in a Durable
 * Object (jest.remote.config.js maps it). The suite is unchanged: it writes its config files into a local data dir,
 * starts "the service", reads `secrets.json`, then talks HTTP to `listen.url`.
 *
 * This stand-in: on start, ships every file in the suite's data dir to `/__hst/boot`, which starts the REAL
 * BackendService inside the object over those files, and writes back the files the service wrote (secrets.json,
 * auth.json …) so the suite reads them where it expects. `listen.url` is the Worker. On stop, the object stops its
 * service and the data dir comes back once more.
 *
 * A first start for a data dir boots FRESH (the object's database wiped). A second start of the same dir is a restart:
 * the rows stay, as they would in a data dir on disk.
 *
 *   HST_BACKEND_URL   the Worker (default http://localhost:8796, `wrangler dev --port 8796`)
 *   HST_RUN_KEY       the doors' key, when the Worker has one
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BASE = (process.env.HST_BACKEND_URL || 'http://localhost:8796').replace(/\/$/, '');
const KEY = process.env.HST_RUN_KEY || '';
const booted = new Set();

const door = (p) => `${BASE}${p}${KEY ? `?key=${encodeURIComponent(KEY)}` : ''}`;

function readTree(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = fs.readFileSync(full).toString('base64');
    }
  };
  walk(dir);
  return out;
}

function writeTree(dir, files) {
  for (const [rel, b64] of Object.entries(files || {})) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from(b64, 'base64'));
  }
}

async function json(res, what) {
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`HST remote ${what}: ${res.status} ${text.slice(0, 400)}`);
  }
  if (!res.ok) throw new Error(`HST remote ${what}: ${res.status} ${JSON.stringify(body).slice(0, 2000)}`);
  return body;
}

/**
 * `(service as any).facade` and `.systemUsers` for the suites that reach in: every method a POST to `/__hst/call`
 * that runs on the object's own instance. Arguments and answers cross as JSON. A throw comes back as a throw.
 */
function remoteObject(target) {
  return new Proxy(
    {},
    {
      get(_obj, method) {
        if (typeof method !== 'string' || method === 'then') return undefined;
        return async (...args) => {
          const body = await json(
            await fetch(door('/__hst/call'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target, method, args }) }),
            `${target}.${method}`
          );
          if (body.thrown) throw Object.assign(new Error(body.thrown.message), { code: body.thrown.code, name: body.thrown.name });
          return body.undefined ? undefined : body.value;
        };
      }
    }
  );
}

/**
 * A suite may read a file the service writes while it runs (`PUT /admin/auth` saves `auth.json`). After any write
 * to `/admin/*` on the Worker, the data dir is copied back before the suite sees the answer.
 */
let activeDataDir = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const res = await realFetch(input, init);
  const url = typeof input === 'string' ? input : input.url;
  const method = ((init && init.method) || 'GET').toUpperCase();
  if (activeDataDir && method !== 'GET' && url.startsWith(BASE + '/admin')) {
    const body = await json(await realFetch(door('/__hst/files')), 'files');
    if (fs.existsSync(activeDataDir)) writeTree(activeDataDir, body.files);
  }
  return res;
};

class BackendService {
  constructor(options) {
    this.options = options;
    this.routes = [];
  }

  async start() {
    const { dataDir, port: _port, ...options } = this.options;
    const fresh = !booted.has(dataDir);
    booted.add(dataDir);
    const res = await fetch(door('/__hst/boot'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: path.basename(dataDir), fresh, options, files: readTree(dataDir) })
    });
    const body = await json(res, 'boot');
    writeTree(dataDir, body.files);
    this.routes = await json(await fetch(door('/__hst/routes')), 'routes');
    this.facade = remoteObject('facade');
    this.systemUsers = remoteObject('systemUsers');
    activeDataDir = dataDir;
    return {
      ...body.started,
      options: this.options,
      listen: { host: new URL(BASE).hostname, port: Number(new URL(BASE).port) || 443, url: BASE },
      stop: () => this.stop()
    };
  }

  async stop() {
    activeDataDir = null;
    const body = await json(await fetch(door('/__hst/stop'), { method: 'POST' }), 'stop');
    if (fs.existsSync(this.options.dataDir)) writeTree(this.options.dataDir, body.files);
  }

  getRouteTable() {
    return this.routes;
  }

  getMailerForTesting() {
    throw new Error('HST remote: the mailer lives in the Durable Object, not in this process');
  }
}

module.exports = { BackendService };
