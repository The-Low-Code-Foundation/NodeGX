/**
 * Model Request — the four things the drive cannot reach (FED-003).
 *
 * ⚠️ **This file deliberately does NOT re-assert what
 * `nodegx-backend/tests/fed-003-model-request.test.ts` drives.** The request body, the key in
 * `x-api-key`, the schema block, the retry, the refusal, the execution record: all of those are
 * graded there, through a real service, against a fixture that records what it was sent. A second
 * copy of them here would be a duplicate first check — it would go green on the day the real one
 * broke, and it would be the one somebody trusted.
 *
 * What is left is what an HTTP drive structurally cannot see:
 *
 *  1. `Messages` replacing `Input` — a conversation a graph holds, which the drive's single-turn
 *     Request node has no way to send.
 *  2. Two `Do` pulses in one update pass are two invocations (ERG-001 Rule 1). Over HTTP there is
 *     one request and one pulse, so the coalescing guard is invisible there.
 *  3. `getInspectInfo` — the debug inspector's only source, which no HTTP response contains.
 *  4. The browser case: no `_noodl_get_secret` at all, which the backend by definition cannot be.
 */

import { node as ModelRequestNode } from '../src/nodes/cloud/modelrequest';

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyRecord = Record<string, any>;

/* eslint-disable @typescript-eslint/no-var-requires */
const RuntimeNode = require('@noodl/runtime/src/node');
/* eslint-enable @typescript-eslint/no-var-requires */

const ModelRequest = ModelRequestNode as unknown as AnyRecord;

interface Probe {
  instance: AnyRecord;
  internal: AnyRecord;
  signals: string[];
  raised: Array<{ code: string; message: string }>;
  flush(): void;
}

/**
 * The same probe shape `erg-001-cloud-node-outcomes.test.ts` and `def021-send-email-fanout` use:
 * the REAL `beginOutcome`/`reportOutcome` off `Node.prototype`, because "exactly one outcome per
 * invocation" lives there and a stub would grade the harness instead of the node.
 */
function makeProbe(overrides: AnyRecord = {}, runContext?: AnyRecord): Probe {
  const signals: string[] = [];
  const raised: Array<{ code: string; message: string }> = [];
  const deferred: Array<() => void> = [];
  const ports = Object.keys(ModelRequest.outputs || {});

  const instance: AnyRecord = {
    _internal: {},
    id: 'model-1',
    name: ModelRequest.name,
    nodeScope: runContext ? { runContext } : undefined,
    hasOutput: (name: string) => ports.indexOf(name) !== -1,
    sendSignalOnOutput: (name: string) => signals.push(name),
    flagOutputDirty: () => undefined,
    raiseRuntimeError: (code: string, message: string) => raised.push({ code, message }),
    scheduleAfterInputsHaveUpdated: (fn: () => void) => deferred.push(fn)
  };
  instance.beginOutcome = RuntimeNode.prototype.beginOutcome.bind(instance);
  instance.reportOutcome = RuntimeNode.prototype.reportOutcome.bind(instance);

  const methods = ModelRequest.methods as Record<string, (...args: unknown[]) => unknown>;
  for (const name of Object.keys(methods || {})) {
    instance[name] = methods[name].bind(instance);
  }
  if (ModelRequest.initialize) ModelRequest.initialize.call(instance);
  Object.assign(instance._internal, overrides);

  return {
    instance,
    internal: instance._internal,
    signals,
    raised,
    flush() {
      while (deferred.length > 0) deferred.shift()!();
    }
  };
}

/** Press `Do` the way the port does — minting an outcome token, which is what ERG-001 grades. */
function press(probe: Probe): void {
  ModelRequest.inputs.send.valueChangedToTrue.call(probe.instance);
}

const ANSWER = {
  id: 'msg_1',
  content: [{ type: 'text', text: 'ok' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 3, output_tokens: 1, cache_read_input_tokens: 0 }
};

/** A `fetch` double that records every call and answers with one fixed body. */
function stubFetch(status = 200, payload: unknown = ANSWER) {
  const calls: Array<{ url: string; init: AnyRecord }> = [];
  (globalThis as any).fetch = (url: string, init: AnyRecord) => {
    calls.push({ url, init });
    return Promise.resolve({
      status,
      headers: { get: () => null },
      text: () => Promise.resolve(JSON.stringify(payload))
    });
  };
  return calls;
}

describe('Model Request (FED-003)', () => {
  const realFetch = (globalThis as any).fetch;
  const realSecret = (globalThis as any)._noodl_get_secret;

  beforeEach(() => {
    (globalThis as any)._noodl_get_secret = () => ({ found: true, value: 'key-value' });
  });

  afterEach(() => {
    (globalThis as any).fetch = realFetch;
    (globalThis as any)._noodl_get_secret = realSecret;
  });

  describe('a conversation, not a single turn', () => {
    it('sends Messages verbatim and ignores Input when both are set', () => {
      const probe = makeProbe({
        messages: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'second' },
          { role: 'user', content: 'third' }
        ],
        input: 'this must not be sent'
      });

      const body = probe.instance.buildBody();
      expect(body.messages).toHaveLength(3);
      expect(JSON.stringify(body.messages)).not.toContain('this must not be sent');
    });

    it('falls back to Input when Messages is empty, rather than sending an empty conversation', () => {
      // An empty array is what a For Each with nothing in it hands over. Sending it would be a
      // 400 from the provider describing a problem the author cannot see from their graph.
      const probe = makeProbe({ messages: [], input: 'the one turn' });
      expect(probe.instance.buildBody().messages).toEqual([{ role: 'user', content: 'the one turn' }]);
    });
  });

  describe('ERG-001 Rule 1 — one outcome per invocation', () => {
    it('settles BOTH pulses when two arrive in one update pass', async () => {
      const calls = stubFetch();
      const probe = makeProbe({ input: 'go' });

      press(probe);
      press(probe);
      probe.flush();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      // The guard collapses the two pulses into ONE request deliberately — that is how "set the
      // fields, then press Do" batches — and it must NOT collapse the two outcomes.
      expect(calls).toHaveLength(1);
      expect(probe.signals.filter((s) => s === 'done')).toHaveLength(2);
      expect(probe.signals.filter((s) => s === 'completed')).toHaveLength(2);
      expect(probe.signals).not.toContain('failure');
    });

    it('settles both as failures when the call fails, and raises once per invocation', async () => {
      stubFetch(400, { error: { message: 'no' } });
      const probe = makeProbe({ input: 'go' });

      press(probe);
      press(probe);
      probe.flush();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      expect(probe.signals.filter((s) => s === 'failure')).toHaveLength(2);
      expect(probe.signals).not.toContain('done');
      expect(probe.raised[0].code).toBe('model-request/http_error');
    });
  });

  describe('AC3, structurally — every port, and the debug inspector', () => {
    /**
     * ⚠️ **This enumerates the node's ports from the node itself rather than listing them.**
     *
     * The drive next door greps the ports one Response node happened to wire, and a mutation that
     * wrote the key onto `Error` survived it green — the happy-path graph never reads `Error`, so
     * a leak there reached nobody's assertion. "No port value" has to mean every port, including
     * the ones this graph did not wire and the one somebody adds next year.
     */
    it('leaks the key through NO output port, on the success path', async () => {
      stubFetch();
      (globalThis as any)._noodl_get_secret = () => ({ found: true, value: 'sk-ant-PORT-LEAK' });
      const probe = makeProbe({ input: 'go', apiKeySecret: 'MODEL_KEY' });

      press(probe);
      probe.flush();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      expect(probe.signals).toContain('done');

      const ports = Object.keys(ModelRequest.outputs);
      // The node has ports worth reading, and every one of them is read — an empty loop would
      // pass this test without looking at anything.
      expect(ports.length).toBeGreaterThan(8);
      for (const name of ports) {
        const getter = (ModelRequest.outputs as AnyRecord)[name].getter;
        if (!getter) continue; // a signal port carries no value
        expect({ port: name, value: JSON.stringify(getter.call(probe.instance)) }).toEqual({
          port: name,
          value: expect.not.stringContaining('sk-ant-PORT-LEAK')
        });
      }
    });

    it('leaks the key through NO output port, on the failure path either', async () => {
      // The other half: the failure path is where a key would plausibly be pasted into a message
      // "to help debugging", and it is the path the success graph never reads.
      stubFetch(400, { error: { message: 'no' } });
      (globalThis as any)._noodl_get_secret = () => ({ found: true, value: 'sk-ant-PORT-LEAK' });
      const probe = makeProbe({ input: 'go', apiKeySecret: 'MODEL_KEY' });

      press(probe);
      probe.flush();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      expect(probe.signals).toContain('failure');

      for (const name of Object.keys(ModelRequest.outputs)) {
        const getter = (ModelRequest.outputs as AnyRecord)[name].getter;
        if (!getter) continue;
        expect({ port: name, value: JSON.stringify(getter.call(probe.instance)) }).toEqual({
          port: name,
          value: expect.not.stringContaining('sk-ant-PORT-LEAK')
        });
      }
    });

    it('never returns the key from getInspectInfo, and never holds it after the call', async () => {
      stubFetch();
      (globalThis as any)._noodl_get_secret = () => ({ found: true, value: 'sk-ant-INSPECTOR-LEAK' });
      const probe = makeProbe({ input: 'go', apiKeySecret: 'MODEL_KEY' });

      press(probe);
      probe.flush();
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      // The inspector's only source (`nodecontext.ts:_getDebugInspectorValueForNode`).
      expect(JSON.stringify(ModelRequest.getInspectInfo.call(probe.instance))).not.toContain(
        'sk-ant-INSPECTOR-LEAK'
      );
      // And the field bag behind it — a future `getInspectInfo` cannot leak what is not there.
      expect(JSON.stringify(probe.internal)).not.toContain('sk-ant-INSPECTOR-LEAK');
      // Asserted beside a signal known to be firing: the call really did happen and really did
      // carry the key, or the two absences above would prove nothing.
      expect(probe.signals).toContain('done');
    });
  });

  describe('outside nodegx-backend', () => {
    it('fails loudly with unavailable rather than calling a provider with no key', async () => {
      const calls = stubFetch();
      delete (globalThis as any)._noodl_get_secret;
      const probe = makeProbe({ input: 'go' });

      press(probe);
      probe.flush();
      await new Promise((resolve) => setImmediate(resolve));

      expect(calls).toHaveLength(0);
      expect(probe.internal.errorCode).toBe('unavailable');
      expect(probe.internal.error).toContain('browser viewer');
      expect(probe.signals).toContain('failure');
    });
  });
});
