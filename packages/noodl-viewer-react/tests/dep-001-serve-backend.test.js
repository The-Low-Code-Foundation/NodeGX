/**
 * DEP-001 — `serve.js --backend-port / --backend` re-points a deployed folder's app.
 *
 * `serve.js` ships in every client-side deploy and is required by the SSR server and the SSG build
 * as `./public/serve.js`, so these rows grade all three. The page reads the result from
 * `/nodegx-config.json`; what the runtime then allows is graded in dep-001-deploy-config.test.ts.
 */
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const { readBackendArg, resolveDeployConfig, createStaticHandler } = require('../static/deploy/serve.js');

function folder(config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep001-serve-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>app</html>');
  if (config !== undefined) fs.writeFileSync(path.join(dir, 'nodegx-config.json'), config);
  return dir;
}

function get(handler, url) {
  return new Promise((resolve) => {
    const server = http.createServer(handler).listen(0, '127.0.0.1', () => {
      http.get({ host: '127.0.0.1', port: server.address().port, path: url }, (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, cache: res.headers['cache-control'], body });
        });
      });
    });
  });
}

describe('readBackendArg', () => {
  it('--backend-port N means a backend on this computer', () => {
    expect(readBackendArg(['--backend-port', '8577'], {})).toEqual({
      endpoint: 'http://localhost:8577',
      appId: undefined,
      from: '--backend-port'
    });
    expect(readBackendArg(['--backend-port=9001'], {}).endpoint).toBe('http://localhost:9001');
  });

  it('--backend takes an address, without its trailing slash', () => {
    expect(readBackendArg(['--backend', 'https://data.example.com/'], {}).endpoint).toBe('https://data.example.com');
  });

  it('a flag wins over NODEGX_CLOUDSERVICES_ENDPOINT, which works alone too', () => {
    const env = { NODEGX_CLOUDSERVICES_ENDPOINT: 'https://env.example.com' };
    expect(readBackendArg(['--backend-port', '1'], env).endpoint).toBe('http://localhost:1');
    expect(readBackendArg([], env)).toMatchObject({ endpoint: 'https://env.example.com', from: 'NODEGX_CLOUDSERVICES_ENDPOINT' });
  });

  it('nothing asked is null, and --port is not mistaken for a backend', () => {
    expect(readBackendArg([], {})).toBeNull();
    expect(readBackendArg(['--port', '8080'], {})).toBeNull();
  });

  it('a value that is not an address or a port is refused with its flag named', () => {
    expect(() => readBackendArg(['--backend', 'localhost:8577'], {})).toThrow('--backend wants');
    expect(() => readBackendArg(['--backend-port', 'abc'], {})).toThrow('--backend-port wants');
    expect(() => readBackendArg(['--backend'], {})).toThrow('--backend wants');
  });
});

describe('resolveDeployConfig', () => {
  it('starts from the deploy’s file and overrides only the endpoint', () => {
    const dir = folder(JSON.stringify({ cloudservices: { endpoint: 'http://localhost:8577', appId: 'a1' } }));
    expect(resolveDeployConfig(dir, { endpoint: 'http://localhost:9001' })).toEqual({
      config: { cloudservices: { endpoint: 'http://localhost:9001', appId: 'a1' } },
      changed: true
    });
  });

  it('with no override it is the file as deployed, unchanged', () => {
    const dir = folder(JSON.stringify({ cloudservices: { endpoint: 'http://localhost:8577' } }));
    expect(resolveDeployConfig(dir, null)).toEqual({
      config: { cloudservices: { endpoint: 'http://localhost:8577' } },
      changed: false
    });
  });

  it('a missing or broken file still takes an override', () => {
    expect(resolveDeployConfig(folder(), { endpoint: 'http://localhost:1' }).config).toEqual({
      cloudservices: { endpoint: 'http://localhost:1' }
    });
    expect(resolveDeployConfig(folder('<html>'), null).config).toEqual({});
  });
});

describe('serving the config', () => {
  it('started with an override, /nodegx-config.json answers it, uncached', async () => {
    const dir = folder(JSON.stringify({ cloudservices: { endpoint: 'http://localhost:8577' } }));
    const { config } = resolveDeployConfig(dir, { endpoint: 'http://localhost:9001' });
    const res = await get(createStaticHandler(dir, { deployConfig: config }), '/nodegx-config.json');
    expect(res.status).toBe(200);
    expect(res.cache).toBe('no-store');
    expect(JSON.parse(res.body).cloudservices.endpoint).toBe('http://localhost:9001');
  });

  it('started without one, the file on disk is served as it is', async () => {
    const dir = folder(JSON.stringify({ cloudservices: { endpoint: 'http://localhost:8577' } }));
    const res = await get(createStaticHandler(dir), '/nodegx-config.json');
    expect(JSON.parse(res.body).cloudservices.endpoint).toBe('http://localhost:8577');
  });

  it('with no file and no override, the page gets the 404 that means "as deployed"', async () => {
    const res = await get(createStaticHandler(folder()), '/nodegx-config.json');
    expect(res.status).toBe(404);
  });
});
