/** What the olive tests share: a fake node-llama-cpp engine, a relay on a free port, an HTTP request. */
'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { createRelay } = require('../relay');
const { createShellDoors } = require('../copies');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A stand-in for node-llama-cpp: answers by the schema's shape (or the `reply` function), after `delay` ms, honouring
 * the abort signal. Records every generate call with its start and end time, so a test can read the ORDER.
 */
function fakeEngine({ reply = null, delay = 0, gpu = 'fake', loadFails = false } = {}) {
  const calls = [];
  const engine = {
    calls,
    async load() {
      if (loadFails) throw new Error('fake load failure');
      return {
        gpu,
        async generate(o) {
          const call = { ...o, start: Date.now(), end: null, aborted: false };
          calls.push(call);
          const aborted = new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(o.signal.reason), { once: true }));
          try {
            await Promise.race([wait(delay), aborted]);
          } catch (e) {
            call.aborted = true;
            call.end = Date.now();
            throw e;
          }
          call.end = Date.now();
          if (reply) return reply(o);
          return canned(o);
        },
        async dispose() {}
      };
    }
  };
  return engine;
}

/** A plausible raw answer per schema, as the readout gave. */
function canned(o) {
  const props = o.schema ? Object.keys(o.schema.properties) : [];
  if (!o.schema) return o.user.includes('poème') || o.user.includes('poem') ? 'Tulla rouge et fière,\nDanse dans la lumière.' : 'Merci Mamie Rose, ton jardin est magnifique !';
  switch (props[0]) {
    case 'prenom':
      return '{ "prenom": "Pipette" }';
    case 'noms':
      return '{ "noms": ["La Crocette", "Le Rouxil", "La Goulantine"] }';
    case 'reponse':
    case 'objet':
      return `{ "${props[0]}": "${o.schema.properties[props[0]].enum[0]}" }`;
    case 'nombre':
      return '{ "nombre": 5 }';
    case 'blocs':
      return '{ "blocs": [ "avancer", "avancer", "gauche" ]'; // the missing brace is the readout's (D1)
    default:
      return '{}';
  }
}

function tmp(prefix = 'garden-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function request(port, method, urlPath, { headers = {}, body, accept = '*/*' } = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers: { accept, ...headers, ...(body ? { 'content-type': 'application/json' } : {}) } }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch {
          json = null;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json, raw, ms: Date.now() - t0 });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

/** A relay with olive's doors in front of the copies doors and no backend (503 proves a request went past both). */
async function withRelay(oliveDoors, run) {
  const appDir = tmp('garden-app-');
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');
  const copies = createShellDoors({ folder: () => appDir, copy: async () => {}, restore: async () => {} }, { prefix: '/__garden/', header: 'x-garden' });
  const doors = (req, res, p) => oliveDoors.handle(req, res, p) || copies(req, res, p);
  const server = createRelay({ appDir, backendPort: () => null, shell: doors, opening: 'Bot Garden is still opening.' });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    return await run(server.address().port);
  } finally {
    server.close();
  }
}

/**
 * Load main.js in plain Node with a FAKE `electron` (Module._load intercepts the one request), to read what its top
 * level does to the app's paths before anything is ready. The fake app derives `userData` from its NAME until someone
 * sets it — which is what Electron does (`<appData>/<name>`) — and refuses the single-instance lock, so main.js takes
 * its "another copy is open" branch and never boots (no relay, no backend, no window). Every call is recorded in order.
 */
function loadMainWithFakeElectron({ appData, home = null }) {
  const Module = require('module');
  const calls = [];
  const paths = { appData, documents: path.join(appData, 'Documents-real') };
  const app = {
    name: 'Electron',
    isPackaged: false,
    setName(n) {
      calls.push(['setName', n]);
      app.name = n;
    },
    setPath(k, v) {
      calls.push(['setPath', k, v]);
      paths[k] = v;
    },
    getPath(k) {
      calls.push(['getPath', k]);
      if ((k === 'userData' || k === 'sessionData') && !paths[k]) return path.join(appData, app.name);
      return paths[k];
    },
    getVersion: () => '0.0.0-test',
    getAppMetrics: () => [],
    requestSingleInstanceLock() {
      calls.push(['requestSingleInstanceLock']);
      return false;
    },
    exit: (code) => calls.push(['exit', code]),
    on: () => {},
    whenReady: () => new Promise(() => {})
  };
  const fake = { app, BrowserWindow: function () {}, dialog: {}, Menu: {}, screen: {}, session: {}, shell: {} };
  const load = Module._load;
  const before = process.env.GARDEN_HOME;
  Module._load = function (request, ...rest) {
    return request === 'electron' ? fake : load.call(this, request, ...rest);
  };
  if (home) process.env.GARDEN_HOME = home;
  else delete process.env.GARDEN_HOME;
  const main = require.resolve('../main.js');
  delete require.cache[main];
  try {
    require(main);
  } finally {
    Module._load = load;
    delete require.cache[main];
    if (before === undefined) delete process.env.GARDEN_HOME;
    else process.env.GARDEN_HOME = before;
  }
  /** The path a Chromium reading happens against: the LAST set value, or the fake's name-derived default. */
  const final = (k) => app.getPath(k);
  return { calls, paths, final, name: app.name };
}

module.exports = { wait, fakeEngine, canned, tmp, request, withRelay, loadMainWithFakeElectron };
