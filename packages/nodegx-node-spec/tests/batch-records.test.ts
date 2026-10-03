/**
 * NSP-014 — the record nodes on the interpreter, through the world's BACKEND seam (world.ts; R9, ruled 2026-10-02:
 * the request, not the wire).
 *
 *   AC1–4 (as NSP-011 §4): every batch spec with a reducer conforms on the interpreter against its own scenarios,
 *          with every mutant killed or declared and no reducer unreached — on TWO seeds, because a mutant one seed's
 *          sequences kill and another's do not is a hole a hand scenario must close (s21: the relation pair's
 *          `repeaterComponent` mutant, killed at 13, alive at 20728). The runtime-side reading is
 *          packages/noodl-runtime/test/node-spec/conformance.test.ts.
 *   AC5    every failure path the node can meet before or after its call has a scenario asserting the outcome AND
 *          the Error text — checked here by counting, per spec, the distinct Error values its scenarios record.
 *   AC6    the call is asserted (the `backend` event, with its args), and a scenario proves NO call is made when
 *          the node's inputs are not ready — beside a scenario that makes one (the known-firing control).
 *          (s25) Filter Records makes no call at all ("one subscription, no requests"): no scenario of it records a
 *          `backend` event — beside one where a save made elsewhere re-runs it (the store is reached; the control).
 */

import type { TraceEvent } from '../src';
import { EQUIVALENT_MUTANTS, interpreterAdapter, loadScenarios, NOT_A_FILE, play, runConformance, specs, World } from '../src';

const BATCH = ['DeleteDbModelProperties', 'AddDbModelRelation', 'RemoveDbModelRelation', 'NewDbModelProperties', 'SetDbModelProperties', 'DbModel2', 'DbCollection2'];

/** s25 — Filter Records: no backend call, so graded here but not in the AC6 call table below */
/** s26 — the user nodes (world.ts AUTH): calls without a `collection`, so their AC5 / AC6 tests are their own, below */
const USERS = ['net.noodl.user.User', 'net.noodl.user.SetUserProperties', 'net.noodl.user.LogIn', 'net.noodl.user.SignUp', 'net.noodl.user.LogOut', 'net.noodl.user.RequestMagicLink', 'net.noodl.user.SignInWith'];
/** s30 — the file nodes (world.ts FILES): Cloud File calls nothing; Upload File and Sign File URL hand the contract's file operations */
const FILES = ['Cloud File', 'Upload File', 'Sign File URL'];
/** s31 — the file dialog (world.ts PICKER): no backend at all, graded beside the file family it feeds */
const PICKER = ['Open File Picker'];
/** s32 — Cloud Function: its own request (world.ts NETWORK, the XHR face) to the project's cloud services (PROJECT) — no backend */
const CLOUD = ['CloudFunction2'];
/** s33 — Subscribe To Changes (world.ts REALTIME): a subscription, told on the clock — no operation answered once */
const REALTIME = ['SubscribeToChanges'];
/** s34 — the WebSocket (world.ts SOCKET): the node's own connection over a server script — no backend */
const SOCKETS = ['net.noodl.WebSocket', 'net.noodl.SSE'];
const CONFORMING = [...BATCH, 'FilterDBModels', ...USERS, ...FILES, ...PICKER, ...CLOUD, ...REALTIME, ...SOCKETS];

describe('NSP-014 — every batch spec conforms on the interpreter: scenarios, 200 sequences on two seeds, every mutant killed or declared', () => {
  for (const type of CONFORMING) {
    for (const seed of [13, 20728]) {
      test(`${type} (seed ${seed})`, async () => {
        const spec = specs[type];
        expect(spec).toBeDefined();
        const report = await runConformance(spec, interpreterAdapter({ resolve: () => spec }), { sequences: 200, seed, mutants: true, equivalent: EQUIVALENT_MUTANTS[type] });
        expect(report.refused).toBeUndefined();
        expect(report.scenarios.filter((s) => s.status !== 'passed').map((s) => `${s.name}: ${s.reason ?? JSON.stringify(s.difference)}`)).toEqual([]);
        expect(report.generated.divergences).toEqual([]);
        expect(report.mutants!.survivors.map((m) => `${m.reducer} ${m.kind} ${m.branch}`)).toEqual([]);
        expect(report.mutants!.unreached).toEqual([]);
        expect(report.conforms).toBe(true);
      }, 120_000);
    }
  }
});

/** A failure as the node reports it: the outcome contract's, or — on Query Records, which predates ERG-001 — its plain `Failure` pulse. */
const isFailure = (e: TraceEvent) => (e.t === 'outcome' && e.value === 'failure') || (e.t === 'signal' && e.port === 'failure');

describe('NSP-014 AC5 / AC6 — failures carry their sentence; a call is made only when the inputs are ready, beside one that is', () => {
  const traces = async (type: string): Promise<Array<{ name: string; trace: TraceEvent[] }>> => {
    const spec = specs[type];
    const out: Array<{ name: string; trace: TraceEvent[] }> = [];
    for (const sc of loadScenarios(type)) out.push({ name: sc.name, trace: await play(interpreterAdapter({ resolve: () => spec }), type, sc.params, sc.steps, new World(sc.world)) });
    return out;
  };

  test.each([
    ['DeleteDbModelProperties', ['No class name specified', 'Missing Record Id', 'Forbidden', 'Failed to delete.']],
    ['AddDbModelRelation', ['No class specified', 'No relation property specified', 'No target record Id (the record to add a relation to) specified', 'No record Id specified (the record that should get the relation)', 'Relation not found', 'Failed to add relation.']],
    ['RemoveDbModelRelation', ['No class specified', 'No relation property specified', 'No target record Id (the record to remove a relation from) specified', 'No record Id specified (the record that should lose the relation)', 'Relation not found', 'Failed to remove relation.']],
    // s22
    ['NewDbModelProperties', ['No class name specified', 'Duplicate value', 'Failed to insert.']],
    [
      'SetDbModelProperties',
      [
        'No class name specified',
        'Missing Record Id',
        'Forbidden',
        'Failed to save.',
        'Someone else changed this record after it was read, so this update was not applied. Fetch the record again, then retry.',
        'Only If Unchanged names "nothere", which this record has not been read with. Fetch the record first.',
        'Only If Unchanged names "tags", which holds an object or list. Name a plain value such as a version number.'
      ]
    ],
    // s23 — the read
    ['DbModel2', ['Missing Id.', 'Forbidden', 'Failed to fetch.']],
    ['DbCollection2', ['Unknown class', 'Failed to fetch.']]
  ])('%s: every failure sentence is on Error beside a Failure outcome in some scenario, and so is the not-configured backend', async (type, sentences) => {
    const all = await traces(type);
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const s of sentences) expect([...errors]).toContain(s);
    expect([...errors].some((e) => e.startsWith('The backend this node is set to ("nope")'))).toBe(true);
  });

  test.each(BATCH)('%s: a scenario that calls the backend (the control) and one that does not (inputs not ready) — both observed', async (type) => {
    const all = await traces(type);
    const calls = all.filter((x) => x.trace.some((e) => e.t === 'backend'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'backend') && x.trace.some(isFailure));
    expect(calls.length).toBeGreaterThan(0);
    expect(none.length).toBeGreaterThan(0);
    // the call carries the contract's words: the op and the Class as `collection`
    const ev = calls[0].trace.find((e) => e.t === 'backend') as TraceEvent & { op: string; args: Record<string, unknown> };
    const op: Record<string, string> = { DeleteDbModelProperties: 'delete', AddDbModelRelation: 'addRelation', RemoveDbModelRelation: 'removeRelation', NewDbModelProperties: 'create', SetDbModelProperties: 'save', DbModel2: 'fetch', DbCollection2: 'query' };
    expect(ev.op).toBe(op[type]);
    expect(typeof ev.args.collection).toBe('string');
  });

  // s26 — the user nodes: the AUTH operation is the call (no collection); every failure sentence is on Error beside a
  // Failure; the not-configured Backend makes no call — beside a scenario that makes one (the control)
  test.each([
    ['net.noodl.user.User', 'fetchCurrentUser', ['Nobody is signed in.', 'HTTP 503: {}', 'Token expired.', 'Failed to fetch.', 'The backend this node is set to ("gone") is not configured in this project.']],
    ['net.noodl.user.SetUserProperties', 'setUserProperties', ['Nobody is signed in.', 'Forbidden', 'The backend this node is set to ("gone") is not configured in this project.']]
  ])('%s: every failure sentence on Error beside a Failure; the call is %s — and a scenario makes none', async (type, op, sentences) => {
    const all = await traces(type);
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const sentence of sentences) expect([...errors]).toContain(sentence);
    const calls = all.filter((x) => x.trace.some((e) => e.t === 'backend'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'backend') && x.trace.some(isFailure));
    expect(calls.length).toBeGreaterThan(0);
    expect(none.map((x) => x.name).some((n) => n.includes('does not have'))).toBe(true);
    for (const { trace } of calls) for (const e of trace) if (e.t === 'backend') expect((e as TraceEvent & { op: string }).op).toBe(op);
  });

  // s32 — Cloud Function: every failure sentence on Error beside a Failure — before the request (no cloud services) and
  // answered (an error body, a JSON string, no answer at all, a 204) — and a scenario that makes no request beside one that does
  test('CloudFunction2: every failure sentence on Error beside a Failure; a scenario makes no request — beside one that does', async () => {
    const all = await traces('CloudFunction2');
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const s of ['No cloud services defined in this project.', 'Missing parameter a', 'plain text error', 'Could not reach the backend at https://cloud.example', 'Failed running cloud function.']) expect([...errors]).toContain(s);
    const requests = all.filter((x) => x.trace.some((e) => e.t === 'request'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'request') && x.trace.some(isFailure));
    expect(requests.length).toBeGreaterThan(0);
    expect(none.map((x) => x.name).some((n) => n.startsWith('no cloud services'))).toBe(true);
    for (const { trace } of requests) for (const e of trace) if (e.t === 'request') expect((e as TraceEvent & { method: string; url: string }).method).toBe('POST');
  });

  // s33 — Subscribe To Changes: every failure on Realtime Error beside a Realtime Failure — before the subscribe (a Backend the
  // project does not have) and told (retryable, fatal) — and a scenario that subscribes to nothing beside ones that do
  test('SubscribeToChanges: every failure on Realtime Error beside a Realtime Failure; a scenario subscribes to nothing — beside ones that subscribe and unsubscribe', async () => {
    const all = await traces('SubscribeToChanges');
    const codes = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some((e) => e.t === 'signal' && e.port === 'realtimeFailure');
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'realtimeError' && e.value) codes.add((e.value as { code: string }).code);
    }
    for (const code of ['CAPABILITY_UNAVAILABLE', 'AUTH_FAILED', 'CONNECT_FAILED', 'SUBSCRIPTION_REJECTED']) expect([...codes]).toContain(code);
    const ops = (t: TraceEvent[]) => t.filter((e) => e.t === 'backend').map((e) => (e as TraceEvent & { op: string }).op);
    const none = all.filter((x) => ops(x.trace).length === 0);
    expect(none.map((x) => x.name).some((n) => n.startsWith('no Class'))).toBe(true);
    // the not-configured Backend: Realtime Failure and no call while it is set — then the active one subscribes (the control)
    const bad = all.find((x) => x.name.includes('does not have'))!.trace;
    const firstCall = bad.findIndex((e) => e.t === 'backend');
    expect(bad.findIndex((e) => e.t === 'signal' && e.port === 'realtimeFailure')).toBeLessThan(firstCall);
    expect(bad.slice(0, bad.findIndex((e) => e.t === 'set' && e.port === 'backendId' && e.value === '_active_')).some((e) => e.t === 'backend')).toBe(false);
    expect(all.filter((x) => ops(x.trace).includes('subscribe')).length).toBeGreaterThan(5);
    expect(all.filter((x) => ops(x.trace).includes('unsubscribe')).length).toBeGreaterThan(2);
  });

  // s34 — the WebSocket: every failure code an outcome can carry, each beside the Last Error that says why; a scenario makes no
  // socket at all — beside ones that connect, send and close (the control)
  test('net.noodl.WebSocket: every failure code beside its Last Error; scenarios that make no socket — beside ones that connect, send and close', async () => {
    const all = await traces('net.noodl.WebSocket');
    const errors = new Map<string, Set<string>>();
    for (const { trace } of all) {
      let lastError = '';
      for (const e of trace) {
        if (e.t === 'value' && e.port === 'lastError') lastError = e.value as string;
        if (e.t === 'outcome' && e.value === 'failure') {
          const set = errors.get(e.error!) ?? new Set<string>();
          set.add(lastError);
          errors.set(e.error!, set);
        }
      }
    }
    expect([...errors.keys()].sort()).toEqual(['websocket/connect-failed', 'websocket/not-connected', 'websocket/nothing-to-send', 'websocket/queue-full']);
    expect([...errors.get('websocket/connect-failed')!].sort()).toEqual([
      'Connection lost (no close frame): Could not connect to ws://srv/a; gave up after 0 reconnect attempts',
      "Could not open WebSocket: The URL 'wss://bad host/' is invalid.",
      'URL is required to connect',
      'URL must start with ws:// or wss:// — got: http://srv/a'
    ]);
    for (const code of ['websocket/not-connected', 'websocket/nothing-to-send', 'websocket/queue-full']) expect([...errors.get(code)!].every((m) => m.length > 0)).toBe(true);
    const ops = (t: TraceEvent[]) => t.filter((e) => e.t === 'socket').map((e) => (e as TraceEvent & { op: string }).op);
    expect(all.filter((x) => ops(x.trace).length === 0).map((x) => x.name)).toContain('Disconnect with nothing made: Unchanged, no connection');
    for (const op of ['connect', 'send', 'close']) expect(all.filter((x) => ops(x.trace).includes(op)).length).toBeGreaterThan(5);
  });

  // s34 — Server-Sent Events: every way a Connect can fail, each with the Last Error the stream reported; a scenario that makes no
  // request — beside ones that do (the control)
  test('net.noodl.SSE: every failure a Connect meets, beside its Last Error; scenarios that make no request — beside ones that do', async () => {
    const all = await traces('net.noodl.SSE');
    const sentences = new Set<string>();
    for (const { trace } of all) {
      let lastError = '';
      for (const e of trace) {
        if (e.t === 'value' && e.port === 'lastError') lastError = e.value as string;
        if (e.t === 'outcome' && e.port === 'connect' && e.value === 'failure') {
          expect(e.error).toBe('sse/connect-failed');
          sentences.add(lastError);
        }
      }
    }
    expect([...sentences].sort()).toEqual([
      'EventSource is not available in this environment',
      'No URL was set on the stream',
      'Stream request failed: Failed to fetch',
      'The stream endpoint returned HTTP 404',
      'The stream endpoint returned HTTP 429 (gave up after 2 attempts)',
      'The stream endpoint returned HTTP 503 (gave up after 1 attempts)'
    ]);
    // the failures that come AFTER the stream opened (its Connect already Done): each on Last Error beside On Error
    const afterOpen = new Set<string>();
    for (const { trace } of all) {
      let lastError = '';
      for (const e of trace) {
        if (e.t === 'value' && e.port === 'lastError') lastError = e.value as string;
        if (e.t === 'signal' && e.port === 'onError' && lastError) afterOpen.add(lastError);
      }
    }
    for (const sentence of ['The response has no readable body; this environment cannot stream fetch responses', 'The event stream was interrupted: terminated']) expect([...afterOpen]).toContain(sentence);
    const requests = (t: TraceEvent[]) => t.filter((e) => e.t === 'request').length;
    expect(all.filter((x) => requests(x.trace) === 0).map((x) => x.name)).toContain('A Connect with no URL fails for good');
    expect(all.filter((x) => requests(x.trace) > 0).length).toBeGreaterThan(20);
  });

  // s30 — the file operations (world.ts FILES): every failure sentence on Error beside a Failure — before the call (no
  // file, no backend), refused inside it (not a file) and answered — and the not-configured Backend makes no call
  test.each([
    [
      'Upload File',
      'uploadFile',
      ['No file specified', NOT_A_FILE, 'HTTP 403: {"errors":[{"message":"Forbidden"}]}', 'Permission denied', 'The backend this node is set to ("nope") is not configured in this project.']
    ],
    ['Sign File URL', 'signFileUrl', ['No file specified', 'Permission denied', 'The backend this node is set to ("nope") is not configured in this project.']]
  ])('%s: every failure sentence on Error beside a Failure; the call is %s — and a scenario makes none', async (type, op, sentences) => {
    const all = await traces(type);
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    for (const sentence of sentences) expect([...errors]).toContain(sentence);
    const calls = all.filter((x) => x.trace.some((e) => e.t === 'backend'));
    const none = all.filter((x) => !x.trace.some((e) => e.t === 'backend') && x.trace.some(isFailure));
    expect(calls.length).toBeGreaterThan(0);
    expect(none.map((x) => x.name).some((n) => n.includes('does not have'))).toBe(true);
    expect(none.map((x) => x.name).some((n) => n.startsWith('no file'))).toBe(true);
    for (const { trace } of calls) for (const e of trace) if (e.t === 'backend') expect((e as TraceEvent & { op: string }).op).toBe(op);
  });

  // s25 — Filter Records
  test('FilterDBModels: every failure sentence is on Error beside a failure, and no scenario calls a backend — beside a save made elsewhere that re-runs it', async () => {
    const all = await traces('FilterDBModels');
    const errors = new Set<string>();
    for (const { trace } of all) {
      const failed = trace.some(isFailure);
      for (const e of trace) if (failed && e.t === 'value' && e.port === 'error') errors.add(String((e as { value: unknown }).value));
    }
    expect([...errors]).toContain('Nothing to filter — no records are connected to the Items input');
    expect([...errors]).toContain('The filter could not be applied: model.get is not a function');
    expect([...errors].filter((e) => e.startsWith('The filter could not be applied: ') && !e.includes('.get is not a function')).length).toBeGreaterThan(0); // the refused pointsTo
    expect(all.filter((x) => x.trace.some((e) => e.t === 'backend')).map((x) => x.name)).toEqual([]);
    // the control: the store reached — a run (Filtered) in the frame after an advance that delivered a save
    const frameAfter = (trace: TraceEvent[], i: number) => {
      const start = trace.findIndex((x, k) => k > i && x.t === 'settle');
      if (start < 0) return [];
      const end = trace.findIndex((x, k) => k > start && x.t === 'settle');
      return trace.slice(start + 1, end < 0 ? undefined : end);
    };
    const reRunByASave = all.filter(({ trace }) => trace.some((e, i) => e.t === 'advance' && frameAfter(trace, i).some((x) => x.t === 'signal' && x.port === 'modified')));
    expect(reRunByASave.length).toBeGreaterThan(0);
  });
});
