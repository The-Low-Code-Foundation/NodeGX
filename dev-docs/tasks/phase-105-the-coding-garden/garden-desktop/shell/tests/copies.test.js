'use strict';
/**
 * copies.js — the shell's three doors for "Keep it safe": listed, made, brought back; and never a path, never from
 * another site. Runs a real relay on a free port with the doors in front of a stand-in backend.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { listCopies, isCopyName, createShellDoors, ARCHIVE_EXT } = require('../copies');
const { createRelay } = require('../relay');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'garden-copies-'));
}

function touch(dir, name, when) {
  const f = path.join(dir, name);
  fs.writeFileSync(f, 'x');
  fs.utimesSync(f, when, when);
}

function request(port, method, urlPath, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function withRelay(api, run) {
  const appDir = tmp();
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');
  const server = createRelay({ appDir, backendPort: () => null, shell: createShellDoors(api) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    await run(server.address().port);
  } finally {
    server.close();
  }
}

test('the copies in the folder, newest first; other files and a missing folder are not copies', () => {
  const dir = tmp();
  touch(dir, `2026-09-20${ARCHIVE_EXT}`, new Date('2026-09-20T19:00:00Z'));
  touch(dir, `2026-09-26${ARCHIVE_EXT}`, new Date('2026-09-26T19:00:00Z'));
  touch(dir, 'notes.txt', new Date('2026-09-27T19:00:00Z'));
  assert.deepStrictEqual(
    listCopies(dir).map((c) => c.name),
    [`2026-09-26${ARCHIVE_EXT}`, `2026-09-20${ARCHIVE_EXT}`]
  );
  assert.deepStrictEqual(listCopies(path.join(dir, 'nope')), []);
});

test('a copy is named, never a path', () => {
  assert.ok(isCopyName(`a${ARCHIVE_EXT}`));
  for (const bad of [`../a${ARCHIVE_EXT}`, `x/a${ARCHIVE_EXT}`, `x\\a${ARCHIVE_EXT}`, 'a.txt', '', null]) assert.ok(!isCopyName(bad), String(bad));
});

test('GET copies lists them; POST copy makes one and answers with the new list', async () => {
  const dir = tmp();
  let made = 0;
  await withRelay(
    {
      folder: () => dir,
      copy: async () => {
        made++;
        touch(dir, `new${ARCHIVE_EXT}`, new Date());
      },
      restore: async () => {}
    },
    async (port) => {
      assert.deepStrictEqual((await request(port, 'GET', '/__garden/copies')).body, { copies: [] });
      const r = await request(port, 'POST', '/__garden/copy', { headers: { 'x-garden': '1' } });
      assert.strictEqual(r.status, 200);
      assert.strictEqual(made, 1);
      assert.deepStrictEqual(r.body.copies.map((c) => c.name), [`new${ARCHIVE_EXT}`]);
    }
  );
});

test('a POST without the app’s header is refused (a page on another site cannot send it), and nothing runs', async () => {
  let ran = 0;
  await withRelay(
    { folder: tmp, copy: async () => void ran++, restore: async () => void ran++ },
    async (port) => {
      assert.strictEqual((await request(port, 'POST', '/__garden/copy')).status, 403);
      assert.strictEqual((await request(port, 'POST', '/__garden/restore', { body: { name: `a${ARCHIVE_EXT}` } })).status, 403);
      assert.strictEqual(ran, 0);
    }
  );
});

test('restore takes only a copy that is in the list, and hands the shell its full path', async () => {
  const dir = tmp();
  touch(dir, `2026-09-26${ARCHIVE_EXT}`, new Date());
  const restored = [];
  await withRelay(
    { folder: () => dir, copy: async () => {}, restore: async (file) => void restored.push(file) },
    async (port) => {
      const h = { 'x-garden': '1', 'content-type': 'application/json' };
      assert.strictEqual((await request(port, 'POST', '/__garden/restore', { headers: h, body: { name: `other${ARCHIVE_EXT}` } })).status, 400);
      assert.strictEqual((await request(port, 'POST', '/__garden/restore', { headers: h, body: { name: `../2026-09-26${ARCHIVE_EXT}` } })).status, 400);
      assert.deepStrictEqual(restored, []);
      const ok = await request(port, 'POST', '/__garden/restore', { headers: h, body: { name: `2026-09-26${ARCHIVE_EXT}` } });
      assert.strictEqual(ok.status, 200);
      assert.deepStrictEqual(restored, [path.join(dir, `2026-09-26${ARCHIVE_EXT}`)]);
    }
  );
});

test('one at a time: a second ask while a copy is being made is told so', async () => {
  let release;
  await withRelay(
    { folder: tmp, copy: () => new Promise((r) => (release = r)), restore: async () => {} },
    async (port) => {
      const first = request(port, 'POST', '/__garden/copy', { headers: { 'x-garden': '1' } });
      await new Promise((r) => setTimeout(r, 50));
      assert.strictEqual((await request(port, 'POST', '/__garden/copy', { headers: { 'x-garden': '1' } })).status, 409);
      release();
      assert.strictEqual((await first).status, 200);
    }
  );
});

test('anything else still goes on to the backend (the doors answer only their own paths)', async () => {
  await withRelay({ folder: tmp, copy: async () => {}, restore: async () => {} }, async (port) => {
    // No backend in this test: the relay's own "still opening" answer proves the request went past the doors.
    const r = await new Promise((resolve) => http.get({ host: '127.0.0.1', port, path: '/functions/savePage' }, (res) => resolve(res.statusCode)));
    assert.strictEqual(r, 503);
  });
});
