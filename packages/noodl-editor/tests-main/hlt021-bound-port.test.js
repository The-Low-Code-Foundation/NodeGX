/**
 * HLT-021 — main tells the renderer the port it actually bound.
 *
 * The renderer's half (`tests-unit/hlt-021/`) reads `global.noodlBoundPort` through
 * `@electron/remote`. That spec can only stub the global; this one starts the product's own
 * server with `NOODLPORT=0` — the value the defect needed — and reads the global the renderer
 * would read, beside the port the socket reports. Same electron stub as HLS-006's spec.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const mockAppPath = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt021-app-'));
fs.mkdirSync(path.join(mockAppPath, 'src', 'external', 'viewer'), { recursive: true });
fs.writeFileSync(path.join(mockAppPath, 'src', 'external', 'viewer', 'index.html'), '<!doctype html><html></html>');

jest.mock('electron', () => ({
  app: {
    getAppPath: () => mockAppPath,
    getPath: () => require('node:os').tmpdir(),
    on: () => undefined,
    quit: () => undefined,
    getVersion: () => '0.0.0-test'
  },
  dialog: { showMessageBox: () => Promise.resolve({ response: 0 }) }
}));

const STUBS = [
  (callback) => callback({}),
  (callback) => callback({ projectDirectory: os.tmpdir() }),
  (_name, callback) => callback(null),
  (callback) => callback('')
];

let webServer;

afterEach(async () => {
  if (webServer) await webServer._stopServerForTests();
  webServer = undefined;
  delete process.env.NOODLPORT;
  delete process.env.NOODL_RELAY_TOKEN;
  delete global.noodlBoundPort;
});

describe('HLT-021 — the bound port is published where the renderer can ask for it', () => {
  it('with NOODLPORT=0, the global carries the port the OS gave, not the 0 that was asked', async () => {
    process.env.NOODLPORT = '0';
    process.env.NOODL_RELAY_TOKEN = 'hlt021-token';
    jest.resetModules();
    webServer = require('../src/main/src/web-server');
    const { app } = require('electron');

    // The control: before `listening` there is nothing to publish, which is why the renderer
    // must ask at call time.
    expect(global.noodlBoundPort).toBeUndefined();

    webServer(app, ...STUBS);
    for (let i = 0; i < 500 && webServer.getAccessStatus() === null; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const status = webServer.getAccessStatus();
    expect(status).not.toBeNull();

    expect(status.port).toBeGreaterThan(0);
    expect(global.noodlBoundPort).toBe(status.port);
    // The name the renderer reads, from the renderer's own module — so a rename on one side reds.
    const { BOUND_PORT_GLOBAL } = require('../src/editor/src/views/SandboxSurface/viewerOrigin');
    expect(global[BOUND_PORT_GLOBAL]).toBe(status.port);

    await webServer._stopServerForTests();
    expect(global.noodlBoundPort).toBeNull();
  });
});
