/**
 * P109 ISL-029 — P107-C33, ruled 2026-10-05 "Refuse with a clear sentence".
 *
 * A Record node in a project with no backend at all fell back to the legacy store, whose endpoint is `undefined`, and
 * the Parse wire built `undefined/classes/…`: a RELATIVE address, so the request went to the app's own host and the
 * person saw that host's "Not Found" (on Node, `XMLHttpRequest` threw and the press was never answered). The check
 * sits at the moment of the request, not at resolution, because a deploy can inject the endpoint after start.
 *
 * Update Record through the real store resolution (`CloudStore.forBackend` with no `backendServices` and no
 * `cloudservices`) and the real Parse wire, a fake `XMLHttpRequest` recording what is opened.
 */

const metadata: Record<string, unknown> = {};

jest.mock('../../noodl-runtime', () => ({
  instance: { getMetaData: (key: string) => metadata[key] }
}));

import CloudStore = require('../../src/api/cloudstore');
import NodeCtor = require('../../src/node');
import SetRecordModule = require('../../src/nodes/std-library/data/setdbmodelpropertiesnode');

const opened: string[] = [];

class FakeXHR {
  onreadystatechange: (() => void) | null = null;
  readyState = 0;
  status = 0;
  response = '';
  responseText = '';
  open(_method: string, url: string) {
    opened.push(url);
  }
  setRequestHeader() {
    /* not read */
  }
  send() {
    this.readyState = 4;
    this.status = 404;
    this.responseText = 'Not Found';
    setTimeout(() => this.onreadystatechange && this.onreadystatechange(), 0);
  }
}

function updateRecord() {
  const data: Record<string, unknown> = { title: 'x' };
  const model = {
    getId: () => 'r1',
    data,
    get: (key: string) => data[key],
    set: (key: string, value: unknown) => {
      data[key] = value;
    }
  };
  const node: Record<string, unknown> = {
    _internal: { collectionId: 'Lesson', model, inputValues: { title: 'z' } },
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
    isInputConnected: () => false,
    hasOutput: (name: string) => Object.prototype.hasOwnProperty.call((SetRecordModule as never as { node: { outputs: object } }).node.outputs, name),
    _getACL: () => undefined
  };
  node.beginOutcome = NodeCtor.prototype.beginOutcome.bind(node as never);
  node.reportOutcome = NodeCtor.prototype.reportOutcome.bind(node as never);
  const methods = (SetRecordModule as never as { node: { methods: Record<string, (...a: unknown[]) => unknown> } }).node.methods;
  for (const key of Object.keys(methods)) node[key] = methods[key].bind(node);
  return { node, data };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

beforeEach(() => {
  opened.length = 0;
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
  (globalThis as unknown as { localStorage: unknown }).localStorage = {};
  (CloudStore.instance as unknown as { endpoint?: string }).endpoint = undefined;
});

describe('ISL-029 C33 — a Record node in a project with no backend says so, and sends nothing', () => {
  it('no backend at all: Failure with the sentence, no request opened, the record keeps its value', async () => {
    const { node, data } = updateRecord();
    (node.scheduleSave as () => void)();
    await settle();

    expect(opened).toEqual([]);
    expect(node.signals).toEqual(['failure', 'completed']);
    expect(node.errors).toEqual(['This project has no backend configured. Add one in the Backend panel.']);
    expect(data.title).toBe('x');
  });

  it('(control) an endpoint that arrives later — as a deploy injects it — is used at the moment of the request', async () => {
    (CloudStore.instance as unknown as { endpoint?: string }).endpoint = 'http://localhost:8080';
    const { node } = updateRecord();
    (node.scheduleSave as () => void)();
    await settle();

    expect(opened).toEqual(['http://localhost:8080/classes/Lesson/r1']);
  });
});
