/**
 * The relay, against a fake backend. Run: node --test relay.test.js (from this folder).
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { test, before, after } = require('node:test');

const { createRelay } = require('./relay');

let appDir;
let backend;
let relay;
let relayPort;
let backendPort = null;
const seen = [];

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function request(method, urlPath, { accept = '*/*', body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: relayPort, method, path: urlPath, headers: { accept } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

before(async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nightbook-relay-'));
  appDir = path.join(base, 'app');
  fs.mkdirSync(path.join(appDir, 'noodl_bundles'), { recursive: true });
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html>THE APP</html>');
  fs.writeFileSync(path.join(appDir, 'index-abc.js'), 'window.app=1');
  fs.writeFileSync(path.join(appDir, 'noodl_bundles', 'b1.json'), '{"bundle":1}');
  fs.writeFileSync(path.join(base, 'secret.txt'), 'OUTSIDE THE APP');

  backend = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body });
      if (req.url === '/stream') {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write('data: first\n\n');
        setTimeout(() => res.end('data: last\n\n'), 50);
        return;
      }
      res.writeHead(201, { 'content-type': 'application/json', 'x-from': 'backend' });
      res.end(JSON.stringify({ method: req.method, url: req.url, body }));
    });
  });
  const bp = await listen(backend);
  backendPort = bp;

  relay = createRelay({ appDir, backendPort: () => backendPort });
  relayPort = await listen(relay);
});

after(() => {
  relay.close();
  backend.close();
});

test('serves a file of the app, and / is index.html', async () => {
  const js = await request('GET', '/index-abc.js');
  assert.equal(js.status, 200);
  assert.equal(js.body, 'window.app=1');
  assert.match(js.headers['content-type'], /javascript/);

  const root = await request('GET', '/', { accept: 'text/html' });
  assert.equal(root.body, '<html>THE APP</html>');
  assert.equal(root.headers['cache-control'], 'no-cache');

  const bundle = await request('GET', '/noodl_bundles/b1.json');
  assert.equal(bundle.body, '{"bundle":1}');
});

test('a page navigation to a route that is not a file gets index.html', async () => {
  const before = seen.length;
  const page = await request('GET', '/sign-in', { accept: 'text/html,application/xhtml+xml' });
  assert.equal(page.status, 200);
  assert.equal(page.body, '<html>THE APP</html>');
  assert.equal(seen.length, before, 'a navigation must not reach the backend');
});

test('anything else goes to the backend, method, path, query and body intact', async () => {
  const get = await request('GET', '/classes/Task?where=%7B%7D', { accept: 'application/json' });
  assert.equal(get.status, 201);
  assert.equal(get.headers['x-from'], 'backend');
  assert.deepEqual(JSON.parse(get.body), { method: 'GET', url: '/classes/Task?where=%7B%7D', body: '' });

  const post = await request('POST', '/users', { accept: 'application/json', body: '{"username":"writer"}' });
  assert.deepEqual(JSON.parse(post.body), { method: 'POST', url: '/users', body: '{"username":"writer"}' });
});

test('a path that climbs out of the app folder is never served from disk', async () => {
  const res = await request('GET', '/..%2fsecret.txt');
  assert.notEqual(res.body, 'OUTSIDE THE APP');
  // Control: the request did arrive somewhere — the backend, which answered it.
  assert.equal(res.headers['x-from'], 'backend');
});

test('a stream reaches the page before the backend has finished it', async () => {
  const first = await new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: relayPort, path: '/stream', headers: { accept: 'text/event-stream' } }, (res) => {
      res.once('data', (c) => {
        resolve(c.toString());
        res.destroy();
      });
    });
    req.on('error', reject);
  });
  assert.equal(first, 'data: first\n\n');
});

test('503 before the backend is up, 502 when it has gone', async () => {
  const saved = backendPort;
  backendPort = null;
  const early = await request('GET', '/classes/Task', { accept: 'application/json' });
  assert.equal(early.status, 503);

  const dead = http.createServer();
  const deadPort = await listen(dead);
  await new Promise((r) => dead.close(r));
  backendPort = deadPort;
  const gone = await request('GET', '/classes/Task', { accept: 'application/json' });
  assert.equal(gone.status, 502);

  backendPort = saved;
  const back = await request('GET', '/classes/Task', { accept: 'application/json' });
  assert.equal(back.status, 201, 'control: the same request succeeds with the backend back');
});
