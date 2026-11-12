/**
 * DEP-002 — `serve.js`'s static handler against paths nobody should send.
 *
 * The handler serves every client-side deploy, and since DEP-002 the backend's `--serve-app` too
 * (nodegx-backend `src/server/static-app.ts`), so a hole here is a hole in both. The secret sits in
 * the folder ABOVE the served one; the control file sits inside it, so a row that reads "not 200"
 * is beside one that reads 200 on the same server.
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { createStaticHandler } = require('../static/deploy/serve.js');

const SECRET = 'the-secret-above-the-app';

function layout() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'dep002-hostile-'));
  fs.writeFileSync(path.join(parent, 'secret.txt'), SECRET);
  const root = path.join(parent, 'app');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'index.html'), '<html>app</html>');
  fs.writeFileSync(path.join(root, 'inside.txt'), 'inside');
  fs.writeFileSync(path.join(root, '.env'), SECRET);
  return root;
}

function request(port, rawPath) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: rawPath }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    // A server that died answers nothing: that is a row's failure, not a hung suite.
    req.setTimeout(2000, () => req.destroy(Object.assign(new Error('no answer'), { code: 'NOANSWER' })));
    req.on('error', (error) => resolve({ status: 0, body: error.code }));
  });
}

describe('serve.js refuses hostile paths and keeps serving', () => {
  let server;
  let port;

  beforeAll(async () => {
    server = http.createServer(createStaticHandler(layout()));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterAll(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });

  it('serves a file inside the folder (the control)', async () => {
    expect(await request(port, '/inside.txt')).toEqual({ status: 200, body: 'inside' });
  });

  it.each([
    '/../secret.txt',
    '/%2e%2e/secret.txt',
    '/..%2fsecret.txt',
    '/%2e%2e%2fsecret.txt',
    '/inside/..%2f..%2fsecret.txt',
    '/%2e%2e%5csecret.txt'
  ])('%s does not reach the file above the folder', async (rawPath) => {
    const res = await request(port, rawPath);
    expect(res.status).not.toBe(200);
    expect(res.body).not.toContain(SECRET);
  });

  it('a dot-file in the folder is not served', async () => {
    const res = await request(port, '/.env');
    expect(res.status).toBe(404);
    expect(res.body).not.toContain(SECRET);
  });

  it('P26-SERVENUL: a NUL byte is a 400, and the server still answers afterwards', async () => {
    expect((await request(port, '/a%00b')).status).toBe(400);
    expect((await request(port, '/a%00b.js')).status).toBe(400);
    expect(await request(port, '/inside.txt')).toEqual({ status: 200, body: 'inside' });
  });
});
