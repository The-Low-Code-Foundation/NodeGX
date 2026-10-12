/**
 * P109 ISL-029 — P107-D24, ruled 2026-10-05 "Ask the record's own backend".
 *
 * The Record family's access rules asked the LEGACY store who was signed in (`CloudStore.instance.currentUserId()`, the
 * `cloudservices` app id's session). Log In writes the session of the backend it signs in to. Measured s24 on a real
 * `nodegx-backend` configured under `backendServices` with no endpoint: after a Log In, Create Record with an Owner rule
 * sent NO `ACL`; with the collection's creator-owns off, a second signed-in user read the record (`ACL: null`). The control
 * (the same press on a `cloudservices` endpoint) sent the owner's ACL.
 *
 * The node spec's world plays only REST backends, so the Parse-wire half is graded here: the real Create Record methods,
 * the real store resolution and the real Parse wire, a fake `XMLHttpRequest` recording what is sent, and the sessions
 * written where the real auth adapters write them.
 */

const metadata: Record<string, unknown> = {};

jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: (key: string) => metadata[key] }
}));

import CloudStore = require('../../src/api/cloudstore');
import NodeCtor = require('../../src/node');
import NewRecordModule = require('../../src/nodes/std-library/data/newdbmodelpropertiesnode');

const sent: { url: string; body: Record<string, unknown> }[] = [];

class FakeXHR {
  onreadystatechange: (() => void) | null = null;
  readyState = 0;
  status = 0;
  response = '';
  responseText = '';
  private url = '';
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {
    /* not read */
  }
  send(body: string) {
    sent.push({ url: this.url, body: JSON.parse(body) });
    this.readyState = 4;
    this.status = 201;
    this.response = this.responseText = JSON.stringify({ objectId: 'r1', createdAt: '2026-10-06T00:00:00.000Z' });
    setTimeout(() => this.onreadystatechange && this.onreadystatechange(), 0);
  }
}

/** The real Create Record methods on a `this` the mixins run on; `backendId` is its Backend input. */
function createRecord(backendId?: string) {
  const node: Record<string, unknown> = {
    _internal: {
      collectionId: 'Lesson',
      inputValues: { title: 'secret' },
      backendId,
      // An Owner rule: Target User, no User Id — the signed-in user.
      accessControlRules: [{ id: 'r1', label: 'Owner' }],
      accessControl: { r1: { target: 'user', read: true, write: true } }
    },
    id: 'n1',
    signals: [] as string[],
    errors: [] as string[],
    nodeScope: { modelScope: undefined, componentOwner: { name: 'Test' } },
    context: { editorConnection: undefined },
    flagOutputDirty() {},
    sendSignalOnOutput(name: string) {
      (node.signals as string[]).push(name);
    },
    raiseRuntimeError(_code: string, message: string) {
      (node.errors as string[]).push(message);
    },
    scheduleAfterInputsHaveUpdated(cb: () => void) {
      cb();
    },
    scheduleOnce(_key: string, cb: () => void) {
      cb();
    },
    checkWarningsBeforeCloudOp: () => true,
    clearWarnings() {},
    hasInput: () => false,
    registerInput: () => {},
    isInputConnected: () => false,
    hasOutput: (name: string) =>
      Object.prototype.hasOwnProperty.call((NewRecordModule as never as { node: { outputs: object } }).node.outputs, name)
  };
  node.beginOutcome = NodeCtor.prototype.beginOutcome.bind(node as never);
  node.reportOutcome = NodeCtor.prototype.reportOutcome.bind(node as never);
  const methods = (NewRecordModule as never as { node: { methods: Record<string, (...a: unknown[]) => unknown> } }).node.methods;
  for (const key of Object.keys(methods)) node[key] = methods[key].bind(node);
  return node as Record<string, unknown> & { storageInsert(): void; signals: string[]; errors: string[] };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));
const nodegx = (id: string, publicToken: string) => ({ id, name: id, type: 'nodegx', url: 'http://127.0.0.1:8597', auth: { publicToken } });
/** Where `ParseAuthAdapter` writes a Log In's session (`Parse/<publicToken>/currentUser`). */
const parseSession = (publicToken: string, objectId: string) => ({
  ['Parse/' + publicToken + '/currentUser']: JSON.stringify({ objectId, sessionToken: 't-' + objectId })
});
const OWNER = (id: string) => ({ [id]: { read: true, write: true } });

beforeEach(() => {
  sent.length = 0;
  for (const key of Object.keys(metadata)) delete metadata[key];
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
  const store = CloudStore.instance as unknown as { appId?: string; endpoint?: string };
  store.appId = undefined;
  store.endpoint = undefined;
  CloudStore.invalidateBackends(undefined);
});

describe('ISL-029 D24 — an access rule reads the signed-in user from the record’s own backend', () => {
  it('a NodeGX backend with no endpoint: the Owner rule carries the person who logged in there', async () => {
    metadata.backendServices = { backends: [nodegx('ngx1', 'app-1')], activeBackendId: 'ngx1', version: 2 };
    (globalThis as unknown as { localStorage: unknown }).localStorage = parseSession('app-1', 'alice');

    const node = createRecord();
    node.storageInsert();
    await settle();

    expect(sent).toEqual([{ url: 'http://127.0.0.1:8597/classes/Lesson', body: { title: 'secret', ACL: OWNER('alice') } }]);
    expect(node.signals).toEqual(['done', 'completed']);
  });

  it('two backends: a record sent to the other one carries the person signed in THERE, not on the active one', async () => {
    metadata.backendServices = {
      backends: [nodegx('ngx1', 'app-1'), nodegx('ngx2', 'app-2')],
      activeBackendId: 'ngx1',
      version: 2
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage = { ...parseSession('app-1', 'alice'), ...parseSession('app-2', 'bob') };

    const node = createRecord('ngx2');
    node.storageInsert();
    await settle();

    expect(sent.map((s) => s.body.ACL)).toEqual([OWNER('bob')]);
  });

  it('nobody signed in on the record’s backend: no ACL, even with somebody signed in on another', async () => {
    metadata.backendServices = {
      backends: [nodegx('ngx1', 'app-1'), nodegx('ngx2', 'app-2')],
      activeBackendId: 'ngx1',
      version: 2
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage = parseSession('app-1', 'alice');

    const node = createRecord('ngx2');
    node.storageInsert();
    await settle();

    expect(sent.map((s) => s.body)).toEqual([{ title: 'secret' }]);
  });

  it('(control) a cloudservices endpoint and no Backend picked: the legacy session, as before', async () => {
    metadata.cloudservices = { endpoint: 'http://127.0.0.1:8597', appId: 'legacy-app' };
    (CloudStore.instance as unknown as { _initCloudServices(): void })._initCloudServices();
    (globalThis as unknown as { localStorage: unknown }).localStorage = parseSession('legacy-app', 'carol');

    const node = createRecord();
    node.storageInsert();
    await settle();

    expect(sent.map((s) => s.body.ACL)).toEqual([OWNER('carol')]);
  });

  it('Directus after a Log In there: the rule is handed on, and the adapter says it ignores it', async () => {
    metadata.backendServices = {
      backends: [{ id: 'dx', name: 'Rig Directus', type: 'directus', url: 'http://localhost:8055' }],
      activeBackendId: 'dx',
      version: 2
    };
    // Where `RestAuthAdapter` writes a Log In's session (`restSessionKey`).
    (globalThis as unknown as { localStorage: unknown }).localStorage = {
      'NodeGX/dx/session': JSON.stringify({ objectId: 'u2', sessionToken: 'tok' })
    };
    const fetched: string[] = [];
    const savedFetch = globalThis.fetch;
    globalThis.fetch = ((url: string) => {
      fetched.push(String(url));
      return new Promise(() => undefined);
    }) as never;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const node = createRecord();
      node.storageInsert();
      await settle();

      expect(fetched).toHaveLength(1);
      expect(warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('ACL ignored on directus'))).toHaveLength(1);
    } finally {
      warn.mockRestore();
      globalThis.fetch = savedFetch;
    }
  });
});
