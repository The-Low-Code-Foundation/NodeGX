/**
 * P121 R12 (P121-TWO007-SCHEMANOWAY) — the wiring: `BackendManager.startBackend` adds the
 * project's `backend/schema.json` once the service is up, and nothing about it can fail a start.
 *
 * What the step does against a real backend (both file shapes, the indexes it brings, never
 * touching a collection that exists) is graded in `nodegx-backend/tests/p121-r12-project-schema.test.ts`.
 * This is the part that spec cannot see: that the start CALLS it, with the project's directory
 * and the supervisor's credentialled client, before the start resolves (the editor pushes cloud
 * functions right after, and a function's first write would make a collection with no indexes).
 *
 * `ServiceSupervisor` is faked, as in `backend-manager-spawn-record.test.js`: its `request`
 * answers from an in-memory list of collections.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn(), on: jest.fn() },
  BrowserWindow: { getAllWindows: () => [] }
}));

const supervisors = [];

jest.mock('../../src/main/src/local-backend/ServiceSupervisor', () => ({
  ServiceSupervisor: class FakeServiceSupervisor {
    constructor(config) {
      this.config = config;
      this.endpoint = `http://127.0.0.1:${config.port}`;
      this.ready = null;
      this.lastExit = null;
      this.stopped = false;
      this.tables = [...FakeServiceSupervisor.nextTables];
      this.requests = [];
      this.readFails = FakeServiceSupervisor.nextReadFails;
      FakeServiceSupervisor.nextReadFails = false;
      // P112-OWN024-SCHEMAFIRSTSTART: how many times each table's push fails at the network level first.
      this.dropFirst = { ...FakeServiceSupervisor.nextDropFirst };
      FakeServiceSupervisor.nextDropFirst = {};
      // …and how many times a push lands but its answer is lost (a timeout after the write).
      this.loseAnswer = { ...FakeServiceSupervisor.nextLoseAnswer };
      FakeServiceSupervisor.nextLoseAnswer = {};
      supervisors.push(this);
    }
    start() {
      this.child = { pid: 525200 + supervisors.length, exitCode: null, killed: false };
      this.ready = { port: this.config.port };
      return Promise.resolve(this.ready);
    }
    isRunning() {
      return !!(this.child && !this.stopped);
    }
    stop() {
      this.stopped = true;
      this.child = null;
      return Promise.resolve();
    }
    async request(method, p, body) {
      // A request made after the start resolved would be missing here when the spec reads it.
      this.requests.push([method, p, body]);
      if (method === 'GET' && p === '/admin/schema') {
        if (this.readFails) throw new Error('GET /admin/schema failed with HTTP 500');
        return { tables: this.tables.map((name) => ({ name, columns: [] })) };
      }
      if (method === 'POST' && p === '/admin/schema' && body.action === 'createTable') {
        if (body.table === 'Refused') throw new Error('the series on "n" must be an object with a format');
        if (this.dropFirst[body.table] > 0) {
          this.dropFirst[body.table]--;
          // undici's generic network error, as the 0.4.3 log read it.
          throw new TypeError('fetch failed');
        }
        this.tables.push(body.table);
        if (this.loseAnswer[body.table] > 0) {
          this.loseAnswer[body.table]--;
          throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
        }
        return { success: true, created: true };
      }
      throw new Error('unexpected ' + method + ' ' + p);
    }
    async fetchHealth() {
      return { persistence: { mode: 'sqlite', persistent: true, ephemeral: false, error: null } };
    }
    logTail() {
      return '';
    }
  }
}));

const { BackendManager } = require('../../src/main/src/local-backend/BackendManager');
const { ServiceSupervisor } = require('../../src/main/src/local-backend/ServiceSupervisor');

describe('P121 R12 — a backend started for a project gets the project’s collections', () => {
  let root;
  let manager;

  function giveBackend(id, port) {
    const dir = path.join(root, 'backends', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({ id, name: 'App backend', createdAt: new Date().toISOString(), port, projectIds: [] })
    );
  }

  function giveProject(schema) {
    const dir = path.join(root, 'project');
    fs.mkdirSync(path.join(dir, 'backend'), { recursive: true });
    if (schema !== undefined) fs.writeFileSync(path.join(dir, 'backend', 'schema.json'), typeof schema === 'string' ? schema : JSON.stringify(schema));
    return dir;
  }

  const pushes = [
    { action: 'createTable', table: 'Country', columns: [{ name: 'name', type: 'String' }] },
    { action: 'createTable', table: 'Payment', columns: [{ name: 'reference', type: 'String' }], indexes: [{ fields: ['reference'], unique: true }] }
  ];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'p121-r12-manager-'));
    supervisors.length = 0;
    ServiceSupervisor.nextTables = [];
    ServiceSupervisor.nextReadFails = false;
    ServiceSupervisor.nextDropFirst = {};
    ServiceSupervisor.nextLoseAnswer = {};
    manager = new BackendManager({
      backendsPath: path.join(root, 'backends'),
      registryDeps: { isAlive: () => false, readCommandLine: async () => null, probeHealth: async () => null, kill: () => undefined }
    });
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('creates every declared collection, whole and in order, before the start resolves', async () => {
    giveBackend('b1', 8601);
    const status = await manager.startBackend('b1', { projectDir: giveProject(pushes) });
    expect(supervisors[0].requests).toEqual([
      ['GET', '/admin/schema', undefined],
      ['POST', '/admin/schema', pushes[0]],
      ['POST', '/admin/schema', pushes[1]]
    ]);
    expect(status.running).toBe(true);
    expect(status.projectSchema).toEqual({ status: 'applied', created: ['Country', 'Payment'], existing: [], failed: [] });
  });

  it('a collection the backend has is left alone: no push for it at all', async () => {
    giveBackend('b1', 8601);
    ServiceSupervisor.nextTables = ['Payment'];
    const status = await manager.startBackend('b1', { projectDir: giveProject(pushes) });
    expect(supervisors[0].requests.filter(([m]) => m === 'POST').map(([, , b]) => b.table)).toEqual(['Country']);
    expect(status.projectSchema).toEqual({ status: 'applied', created: ['Country'], existing: ['Payment'], failed: [] });
  });

  it('the { tables } shape becomes the same pushes', async () => {
    giveBackend('b1', 8601);
    const status = await manager.startBackend('b1', {
      projectDir: giveProject({ _about: 'x', tables: [{ name: 'Cohort', columns: [{ name: 'cohortId', type: 'String' }], indexes: [{ fields: ['cohortId'], unique: true }] }] })
    });
    expect(supervisors[0].requests[1]).toEqual([
      'POST',
      '/admin/schema',
      { action: 'createTable', table: 'Cohort', columns: [{ name: 'cohortId', type: 'String' }], indexes: [{ fields: ['cohortId'], unique: true }] }
    ]);
    expect(status.projectSchema.created).toEqual(['Cohort']);
  });

  it('no project, or a project with no schema: not one request', async () => {
    giveBackend('b1', 8601);
    giveBackend('b2', 8602);
    expect((await manager.startBackend('b1')).projectSchema).toEqual({ status: 'none' });
    expect((await manager.startBackend('b2', { projectDir: giveProject(undefined) })).projectSchema).toEqual({ status: 'none' });
    expect(supervisors.map((s) => s.requests)).toEqual([[], []]);
  });

  it('nothing about it fails the start: a broken file, an unreadable backend, a refused collection', async () => {
    giveBackend('b1', 8601);
    giveBackend('b2', 8602);
    giveBackend('b3', 8603);
    const broken = await manager.startBackend('b1', { projectDir: giveProject('{ nope') });
    expect(broken.running).toBe(true);
    expect(broken.projectSchema).toEqual({ status: 'failed', error: expect.stringMatching(/^backend\/schema\.json is not JSON/) });

    ServiceSupervisor.nextReadFails = true;
    const unreadable = await manager.startBackend('b2', { projectDir: giveProject(pushes) });
    expect(unreadable.running).toBe(true);
    expect(unreadable.projectSchema).toEqual({ status: 'failed', error: "could not read the backend's collections: GET /admin/schema failed with HTTP 500" });

    const refused = await manager.startBackend('b3', {
      projectDir: giveProject([pushes[0], { action: 'createTable', table: 'Refused', columns: [] }, pushes[1]])
    });
    expect(refused.running).toBe(true);
    expect(refused.projectSchema).toEqual({
      status: 'applied',
      created: ['Country', 'Payment'],
      existing: [],
      failed: [{ table: 'Refused', error: 'the series on "n" must be an object with a format' }]
    });
  });

  it('an already-running backend is not started again, and not re-pushed', async () => {
    giveBackend('b1', 8601);
    const dir = giveProject(pushes);
    await manager.startBackend('b1', { projectDir: dir });
    const second = await manager.startBackend('b1', { projectDir: dir });
    expect(supervisors).toHaveLength(1);
    expect(supervisors[0].requests).toHaveLength(3);
    expect(second.projectSchema).toBeUndefined();
  });

  describe('P112-OWN024-SCHEMAFIRSTSTART — a push that fails on the way is tried again, and what is still missing is said', () => {
    it('a collection whose first push fails at the network level is added on the next try, and reported as added', async () => {
      giveBackend('b1', 8601);
      ServiceSupervisor.nextDropFirst = { Payment: 1 };
      const status = await manager.startBackend('b1', { projectDir: giveProject(pushes) });
      expect(status.projectSchema).toEqual({ status: 'applied', created: ['Country', 'Payment'], existing: [], failed: [] });
      expect(supervisors[0].tables).toEqual(['Country', 'Payment']);
      expect((await manager.getStatus('b1')).schemaProblem).toBeUndefined();
    });

    it('a refusal in words is not tried again: the backend said no', async () => {
      giveBackend('b1', 8601);
      await manager.startBackend('b1', { projectDir: giveProject([{ action: 'createTable', table: 'Refused', columns: [] }]) });
      expect(supervisors[0].requests.filter(([m]) => m === 'POST')).toHaveLength(1);
    });

    it('still missing after the tries: the backend card is told which, and to start the backend again', async () => {
      giveBackend('b1', 8601);
      ServiceSupervisor.nextDropFirst = { Payment: 9 };
      const status = await manager.startBackend('b1', { projectDir: giveProject(pushes) });
      expect(status.projectSchema.failed).toEqual([{ table: 'Payment', error: 'fetch failed' }]);
      expect(supervisors[0].requests.filter(([m, , b]) => m === 'POST' && b.table === 'Payment')).toHaveLength(3);
      const card = await manager.getStatus('b1');
      expect(card.running).toBe(true);
      expect(card.schemaProblem).toBe('Payment from backend/schema.json was not added (fetch failed). Start the backend again to add it.');
    });

    it('a push that timed out but landed is not pushed again: the next try finds it there', async () => {
      giveBackend('b1', 8601);
      ServiceSupervisor.nextLoseAnswer = { Payment: 1 };
      const status = await manager.startBackend('b1', { projectDir: giveProject(pushes) });
      expect(status.projectSchema).toEqual({ status: 'applied', created: ['Country', 'Payment'], existing: [], failed: [] });
      expect(supervisors[0].requests.filter(([m, , b]) => m === 'POST' && b.table === 'Payment')).toHaveLength(1);
      expect(supervisors[0].tables).toEqual(['Country', 'Payment']);
    });
  });
});
