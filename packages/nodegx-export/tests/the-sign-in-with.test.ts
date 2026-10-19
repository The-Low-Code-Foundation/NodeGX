import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, planProject } from '../src/analyze/plan';
import { emitApp } from '../src/emit/emitApp';
import { SIGN_IN_LIB_PATH, signInLibSource } from '../src/emit/signInLib';
import { exportBadgeOf, ledgerEntryOf } from '../src/ledger';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

/**
 * EXP-011 §79 — `Sign In With` (`net.noodl.user.SignInWith`): the streaming table's fourteenth member, in its own module
 * (`src/lib/signIn.ts`), and the exported client's sign-in return leg (`src/api/client.ts`), which it had never had.
 *
 * Built on `tests/fixtures/signin-desk`: a Sign In With `acme` (Provider acme, Redirect blank) pressed by a button, its
 * Signing In / Error / Notice in Texts, Done and Failure writing a `last` Variable; a second, `nobody`, with no Provider
 * (the refusal), its Error shown and its Completed writing `refused`; a User node showing who is signed in.
 *
 * §A the fixture whole · §B the client's return leg against the runtime's own ParseAuthAdapter.consumeAuthReturn (a
 * differential over every page-load shape and every exchange answer) · §C the node against the runtime's own
 * signinwith.ts in a NodeContext, over a UserService stand-in on that same adapter (scripted page loads, presses, late
 * and repeated mounts) · §D the shapes a wire changes and the refusals · §E what building it found, and the recorded
 * differences · §F the ledger. No graph scenario plays on the export: every Sign In With scenario seeds a backend world,
 * which the export graph harness keeps outside. The drive against a real backend is EXP-011 §79.5.
 */

const REPO = path.join(__dirname, '..', '..', '..');
const RUNTIME_SRC = path.join(REPO, 'packages', 'noodl-runtime', 'src');
const RUNTIME_BACKENDS = path.join(RUNTIME_SRC, 'api', 'backends');
const VIEWER_USER = path.join(REPO, 'packages', 'noodl-viewer-react', 'src', 'nodes', 'std-library', 'user');
const FIXTURE = path.join(__dirname, 'fixtures', 'signin-desk');
const ACCOUNT_DESK = path.join(__dirname, 'fixtures', 'account-desk');
const LIVE_DESK = path.join(__dirname, 'fixtures', 'live-desk');
const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const baseIr = parseProject(FIXTURE, catalog);
const app = emitApp(baseIr, catalog);

const HOME = 'Pages/Home';
const ENDPOINT = 'http://localhost:8591';
const APP_ID = 'backend_signindesk';
const ORIGIN = 'http://app.test';

const cloneIr = (): ExportIR => structuredClone(baseIr);
const componentOf = (source: ExportIR, componentPath: string): ComponentIR => source.components.find((c) => c.path === componentPath)!;
const planOf = (source: ExportIR, componentPath: string): ComponentPlan => planProject(source, index).plans.find((p) => p.path === componentPath)!;
const setParam = (node: NodeIR, name: string, value: ParamValue) => {
  const existing = node.parameters.find((p) => p.name === name);
  if (existing) existing.value = value;
  else node.parameters.push({ name, value });
};
const connect = (component: ComponentIR, fromId: string, fromProperty: string, toId: string, toProperty: string, kind: ConnectionIR['kind'] = 'value') => {
  component.connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind });
};
const refusalOf = (source: ExportIR, componentPath: string, nodeId: string): string | undefined => planOf(source, componentPath).refusals.find((r) => r.nodeId === nodeId)?.reason;
const mutated = (change: (c: ComponentIR, ir: ExportIR) => void): ExportIR => {
  const ir = cloneIr();
  change(componentOf(ir, HOME), ir);
  return ir;
};
const nodeIn = (c: ComponentIR, id: string): NodeIR => c.nodes.find((n) => n.id === id)!;
const withoutSignIns = (ir: ExportIR): ExportIR => {
  const c = componentOf(ir, HOME);
  c.nodes = c.nodes.filter((n) => n.type !== 'net.noodl.user.SignInWith');
  const ids = new Set(c.nodes.map((n) => n.id));
  c.connections = c.connections.filter((w) => ids.has(w.fromId) && ids.has(w.toId));
  return ir;
};

// ---- §A ------------------------------------------------------------------------------------------------------------

describe('§A the fixture whole', () => {
  test('the app typechecks, ships the lib, errors.ts and the client, and nothing in it is refused', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(app.files[SIGN_IN_LIB_PATH]).toContain(signInLibSource());
    expect(app.files['src/lib/errors.ts']).toBeDefined();
    expect(app.files['src/api/client.ts']).toBeDefined();
    expect(app.notes.filter((n) => !n.startsWith('App:') && !n.startsWith('api modules connect'))).toEqual([]);
    expect(planOf(baseIr, HOME).refusals).toEqual([]);
  });

  test('both nodes print as hooks: the literal Provider an option, the outcomes their listeners, Do the verb', () => {
    const home = app.files['src/pages/Home.tsx'];
    expect(home).toContain("import { useSignInWith } from '../lib/signIn';");
    expect(home).toContain("const acmeSignIn = useSignInWith({ label: 'Acme sign-in', nodeId: 'acme', componentName: '/Pages/Home' }, { provider: 'acme' }, {");
    expect(home).toContain("    done: () => last.set('done'),\n    failure: () => last.set('failed')\n  });");
    expect(home).toContain("const noProvider = useSignInWith({ label: 'No provider', nodeId: 'nobody', componentName: '/Pages/Home' }, {}, {\n    completed: () => refused.set('completed')\n  });");
    expect(home).toContain('<button onClick={() => acmeSignIn.signIn()}>Sign in with Acme</button>');
    expect(home).toContain('<button onClick={() => noProvider.signIn()}>Sign in with nobody</button>');
    expect(home).toContain('{String(acmeSignIn.signingIn)}');
    expect(home).toContain('{acmeSignIn.error}');
    expect(home).toContain('{acmeSignIn.notice}');
    expect(home).toContain('{noProvider.error}');
    expect(home).toContain('// Acme sign-in — a Sign In With (signinwith.ts), hosted by signIn.ts');
  });

  test('the client carries the return leg, called once at the end of the module', () => {
    const client = app.files['src/api/client.ts'];
    expect(client).toContain('export function signInWithProviderRequest(provider: unknown, redirect: unknown): void {');
    expect(client).toContain('export function readAuthReturn(): AuthReturnState {');
    expect(client).toContain("    const response = await fetch(ENDPOINT + '/oauth/exchange', { method: 'POST', headers, body: JSON.stringify({ code }) });");
    expect(client.trimEnd().endsWith('consumeAuthReturn();')).toBe(true);
    expect(client.match(/^consumeAuthReturn\(\);$/gm)).toHaveLength(1);
  });

  test('an app that can start no sign-in ships no signIn.ts and a client with no return leg (live-desk, byte for byte)', () => {
    const none = emitApp(withoutSignIns(cloneIr()), catalog);
    expect(none.files[SIGN_IN_LIB_PATH]).toBeUndefined();
    const live = emitApp(parseProject(LIVE_DESK, catalog), catalog).files['src/api/client.ts'];
    expect(live).not.toContain('consumeAuthReturn');
    expect(live).not.toContain('/oauth/');
    expect(live.trimEnd().endsWith('}')).toBe(true);
  });

  test('a Request Magic Link earns the return leg with no Sign In With on the page (account-desk)', () => {
    const account = emitApp(parseProject(ACCOUNT_DESK, catalog), catalog);
    expect(account.files['src/api/client.ts']).toContain("'/oauth/exchange'");
    expect(account.files[SIGN_IN_LIB_PATH]).toBeUndefined();
    expect(typecheckEmittedApp(account)).toEqual([]);
  });
});

// ---- the two sides' world ------------------------------------------------------------------------------------------

/** The globals the world installs and removes, read as a plain bag of properties. */
const globals = () => globalThis as unknown as Record<string, unknown>;

interface AuthReturnState {
  inProgress: boolean;
  succeeded?: boolean;
  notice?: string;
  error?: string;
}
interface BackendHandle {
  type: string;
  name: string;
  url: string;
  publicToken: string;
}
/** The runtime's ParseAuthAdapter, as far as the return leg and Sign In With reach it. */
interface AuthAdapter {
  on(event: string, cb: (state: unknown) => void): void;
  readonly oauthReturn: AuthReturnState;
  consumeAuthReturn(handle: BackendHandle): boolean;
  signInWithProvider(handle: BackendHandle, options: Record<string, unknown>): void;
}
/** The emitted client's return leg; a mutant client may have neither. */
interface ClientModule {
  readAuthReturn?(): AuthReturnState;
  subscribeAuthReturn?(listener: (state: unknown) => void): () => void;
}
/** The runtime's node, in a NodeContext, as signinwith.ts makes it — the part read here. */
interface ContextNode {
  _internal: { signingIn: unknown; error: unknown; notice: unknown };
  sendSignalOnOutput(name: string): void;
  raiseRuntimeError(code: string, message: string): void;
  setInputValue(port: string, value: unknown): void;
  getOutput(port: string): { value: unknown };
  update(): void;
  _onNodeDeleted(): void;
}
interface RuntimeContext {
  updateIteration: number;
  nodeRegister: { register(definition: unknown): void; createNode(type: string, id: string): ContextNode };
}
/** What the emitted `useSignInWith` hands back to a component. */
interface SignInHandle {
  signingIn: unknown;
  error: unknown;
  notice: unknown;
  signIn(): void;
}
interface SignInLib {
  useSignInWith(meta: { label: string; nodeId: string; componentName: string }, options: Record<string, unknown>, on: Record<string, () => void>): SignInHandle;
}
const compiled = new Map<string, string>();
const transpiled = (key: string, source: () => string): string => {
  if (!compiled.has(key)) {
    compiled.set(key, ts.transpileModule(source(), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText);
  }
  return compiled.get(key)!;
};
/** A fresh module graph per call; `overrides` answers a specifier (or a resolved file) first. */
const loaderOf = (overrides: Record<string, unknown> = {}) => {
  const cache = new Map<string, { exports: unknown }>();
  const load = (file: string): unknown => {
    const hit = cache.get(file);
    if (hit) return hit.exports;
    const module: { exports: unknown } = { exports: {} };
    cache.set(file, module);
    const req = (id: string): unknown => {
      if (id in overrides) return overrides[id];
      if (id === '@noodl/runtime/src/outcome') return load(path.join(RUNTIME_SRC, 'outcome.ts'));
      if (id.startsWith('.')) {
        const base = path.resolve(path.dirname(file), id);
        if (base in overrides) return overrides[base];
        for (const candidate of [`${base}.ts`, `${base}.js`, path.join(base, 'index.ts')]) if (fs.existsSync(candidate)) return load(candidate);
      }
      try {
        return require(id);
      } catch {
        return {};
      }
    };
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', transpiled(file, () => fs.readFileSync(file, 'utf8')))(req, module, module.exports);
    return module.exports;
  };
  return load;
};

interface Req {
  method: string;
  url: string;
  body: unknown;
}
type Answer = { status: number; body: unknown } | 'network';

/**
 * One browser and one backend, shared by nothing: the page's URL (location and history), localStorage, the requests
 * the page made, and the backend's answers, which are held until `answerAll()` so both sides see an in-progress window.
 */
class World {
  href: string;
  readonly navigations: string[] = [];
  readonly replaced: string[] = [];
  readonly requests: Req[] = [];
  readonly storage: Record<string, string> = {};
  private held: Array<() => void> = [];

  constructor(
    url: string,
    private readonly answer: (r: Req) => Answer
  ) {
    this.href = url;
  }

  private url(): URL {
    return new URL(this.href);
  }

  install(): void {
    const world = this;
    const location = {
      get href() {
        return world.href;
      },
      set href(next: string) {
        world.navigations.push(next);
      },
      get search() {
        return world.url().search;
      },
      get pathname() {
        return world.url().pathname;
      },
      get hash() {
        return world.url().hash;
      }
    };
    const history = {
      state: null,
      replaceState(_state: unknown, _title: string, next: string) {
        world.replaced.push(next);
        world.href = new URL(next, world.href).toString();
      }
    };
    const g = globals();
    g.window = { location, history, addEventListener() {}, removeEventListener() {} };
    g.localStorage = this.storage;
    g.fetch = (url: string, init: { method?: string; body?: string }) => {
      const r: Req = { method: init.method ?? 'GET', url, body: init.body === undefined ? undefined : JSON.parse(init.body) };
      this.requests.push(r);
      return new Promise((resolve, reject) => {
        this.held.push(() => {
          const a = this.answer(r);
          if (a === 'network') return reject(new TypeError('Failed to fetch'));
          const text = JSON.stringify(a.body);
          resolve({ ok: a.status >= 200 && a.status < 300, status: a.status, text: async () => text });
        });
      });
    };
    g.XMLHttpRequest = class {
      readyState = 0;
      status = 0;
      response = '';
      responseText = '';
      onreadystatechange: (() => void) | null = null;
      private method = 'GET';
      private target = '';
      open(method: string, url: string) {
        this.method = method;
        this.target = url;
      }
      setRequestHeader() {}
      send(body?: string) {
        const r: Req = { method: this.method, url: this.target, body: body === undefined ? undefined : JSON.parse(body) };
        world.requests.push(r);
        world.held.push(() => {
          const a = world.answer(r);
          this.readyState = 4;
          if (a === 'network') {
            this.status = 0;
          } else {
            this.status = a.status;
            this.response = this.responseText = JSON.stringify(a.body);
          }
          this.onreadystatechange?.();
        });
      }
    };
  }

  /** The backend answers everything asked so far. */
  answerAll(): void {
    for (const fn of this.held.splice(0)) fn();
  }

  /** The stored session, under whichever app's `Parse/<appId>/currentUser` key holds one. */
  session(): unknown {
    const key = Object.keys(this.storage).find((k) => /^Parse\/[^/]+\/currentUser$/.test(k));
    return key === undefined ? undefined : JSON.parse(this.storage[key]);
  }
}

const uninstall = () => {
  const g = globals();
  delete g.window;
  delete g.localStorage;
  delete g.fetch;
  delete g.XMLHttpRequest;
};

/** Every timer and promise due now, settled. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

const EXCHANGED = { objectId: 'u1', username: 'ann', email: 'ann@example.com', sessionToken: 'r:abc', roles: [], authOutcome: 'created', authNotice: null };
const EXCHANGED_NOTICE = { ...EXCHANGED, authOutcome: 'linked-credentials-revoked', authNotice: 'Your password was removed.' };
const EXPIRED = { code: 101, error: 'This sign-in code is not valid. It may have expired or already been used.' };

/** The emitted client, evaluated in the installed world. `import.meta.env` is Vite's; here every variable is unset. */
const loadClient = (clientSource = app.files['src/api/client.ts']): ClientModule => {
  const source = clientSource.replace(/import\.meta\.env\.VITE_NODEGX_\w+/g, 'undefined');
  const module: { exports: unknown } = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', transpiled(`client:${source.length}:${source.slice(-200)}`, () => source))(() => ({}), module, module.exports);
  return module.exports as ClientModule;
};

const runtimeAdapter = (): { adapter: AuthAdapter; handle: BackendHandle } => {
  const load = loaderOf();
  const { ParseAuthAdapter } = load(path.join(RUNTIME_BACKENDS, 'ParseAuthAdapter.ts')) as { ParseAuthAdapter: new (options: { serializeObject(data: unknown): unknown }) => AuthAdapter };
  const adapter = new ParseAuthAdapter({ serializeObject: (data: unknown) => data });
  return { adapter, handle: { type: 'nodegx', name: 'Sign In Desk', url: ENDPOINT, publicToken: APP_ID } };
};

// ---- §B ------------------------------------------------------------------------------------------------------------

/** What a page load came to, on one side: what was returned, the state at once, then after the backend answered. */
interface ReturnReading {
  consumed: boolean;
  atOnce: unknown;
  settled: unknown;
  announced: unknown[];
  url: string;
  replaced: string[];
  requests: Req[];
  session: unknown;
}

const runtimeReturn = async (url: string, answer: (r: Req) => Answer): Promise<ReturnReading> => {
  const world = new World(url, answer);
  world.install();
  try {
    const { adapter, handle } = runtimeAdapter();
    const announced: unknown[] = [];
    adapter.on('oauthReturn', (state: unknown) => announced.push(state));
    const consumed = adapter.consumeAuthReturn(handle);
    const atOnce = { ...adapter.oauthReturn };
    world.answerAll();
    await settle();
    return { consumed, atOnce, settled: { ...adapter.oauthReturn }, announced, url: world.href, replaced: world.replaced, requests: world.requests, session: world.session() };
  } finally {
    uninstall();
  }
};

const exportReturn = async (url: string, answer: (r: Req) => Answer, clientSource?: string): Promise<ReturnReading> => {
  const world = new World(url, answer);
  world.install();
  try {
    const client = loadClient(clientSource);
    const announced: unknown[] = [];
    // a client with no return leg (the reverted arm) has neither: nothing announced, nothing in progress
    client.subscribeAuthReturn?.((state: unknown) => announced.push(state));
    const atOnce = { ...(client.readAuthReturn?.() ?? { inProgress: false }) };
    const consumed = atOnce.inProgress || atOnce.succeeded !== undefined;
    world.answerAll();
    await settle();
    return { consumed, atOnce, settled: { ...(client.readAuthReturn?.() ?? { inProgress: false }) }, announced, url: world.href, replaced: world.replaced, requests: world.requests, session: world.session() };
  } finally {
    uninstall();
  }
};

/** The runtime announces the very state object it keeps; the export the same. Compared as values, with undefined fields dropped. */
const plain = (r: ReturnReading) => JSON.parse(JSON.stringify(r));

const PAGE_LOADS = [
  `${ORIGIN}/home`,
  `${ORIGIN}/home?nodegx_auth=c1`,
  `${ORIGIN}/home?nodegx_auth_error=Sign-in%20was%20not%20completed%3A%20access_denied`,
  `${ORIGIN}/home?nodegx_auth=c1&nodegx_auth_error=Nope`,
  `${ORIGIN}/home?tab=2&nodegx_auth=c1&x=y#top`,
  `${ORIGIN}/home?nodegx_auth=`,
  `${ORIGIN}/home?nodegx_auth=&nodegx_auth_error=`,
  `${ORIGIN}/home?code=abc&state=def`,
  `${ORIGIN}/deep/page?nodegx_auth_error=&nodegx_auth=c2`
];
const ANSWERS: Array<[string, (r: Req) => Answer]> = [
  ['a session', () => ({ status: 200, body: EXCHANGED })],
  ['a session with a notice', () => ({ status: 200, body: EXCHANGED_NOTICE })],
  ['an expired code', () => ({ status: 400, body: EXPIRED })],
  ['an error with no message', () => ({ status: 500, body: {} })]
];

describe('§B the client return leg against the runtime’s own ParseAuthAdapter.consumeAuthReturn', () => {
  test.each(PAGE_LOADS.flatMap((url) => ANSWERS.map(([name, answer]) => [url, name, answer] as const)))('%s, answered with %s: the same', async (url, _name, answer) => {
    const runtime = plain(await runtimeReturn(url, answer));
    const exported = plain(await exportReturn(url, answer));
    expect(exported).toEqual(runtime);
  });

  test('the grid reaches every arm: none, a provider error, an exchange that lands, one with a notice, one refused', async () => {
    const seen = new Set<string>();
    for (const url of PAGE_LOADS) {
      for (const [, answer] of ANSWERS) {
        const r = await runtimeReturn(url, answer);
        const s = r.settled as { inProgress: boolean; succeeded?: boolean; notice?: string; error?: string };
        seen.add(!r.consumed ? 'none' : r.requests.length === 0 ? 'provider-error' : s.succeeded ? (s.notice ? 'notice' : 'landed') : 'refused');
      }
    }
    expect([...seen].sort()).toEqual(['landed', 'none', 'notice', 'provider-error', 'refused']);
  });

  test('a mutant client that does not strip the code is caught; one that announces a provider error at once is caught', async () => {
    const source = app.files['src/api/client.ts'];
    const noStrip = source.replace('  stripAuthParamsFromUrl(params);\n\n  if (error) {', '\n  if (error) {');
    expect(noStrip).not.toBe(source);
    const url = `${ORIGIN}/home?nodegx_auth=c1`;
    expect(plain(await exportReturn(url, ANSWERS[0][1], noStrip))).not.toEqual(plain(await runtimeReturn(url, ANSWERS[0][1])));
    // the deferral is what lets a node mounting in the same tick hear it; announced at once, the announcement comes before
    // anything subscribed and is lost (the reading's `announced` stays empty)
    const eager = source.replace('    setTimeout(announceAuthReturn, 0);', '    announceAuthReturn();');
    expect(eager).not.toBe(source);
    const errUrl = `${ORIGIN}/home?nodegx_auth_error=Nope`;
    expect(plain(await exportReturn(errUrl, ANSWERS[0][1], eager))).not.toEqual(plain(await runtimeReturn(errUrl, ANSWERS[0][1])));
  });
});

// ---- §C ------------------------------------------------------------------------------------------------------------

type Op =
  | { op: 'mount'; slot: number; provider?: unknown; redirect?: unknown }
  | { op: 'unmount'; slot: number }
  | { op: 'set'; slot: number; port: 'provider' | 'redirect'; value: unknown }
  | { op: 'press'; slot: number }
  | { op: 'answer' }
  | { op: 'tick' };

/**
 * What one side came to: signals (each with the three values a listener reads at it) and raises in order, each mounted
 * node's outputs after every step, the navigations, the stored session and the address bar.
 */
interface NodeReading {
  log: string[];
  outputs: Array<Record<string, unknown>>;
  navigations: string[];
  session: unknown;
  url: string;
}

const OUTPUTS = ['signingIn', 'error', 'notice'] as const;
const SIGNALS = ['done', 'completed', 'failure'] as const;

/**
 * The runtime's own signinwith.ts in a NodeContext. Its UserService is a stand-in over the runtime's own ParseAuthAdapter,
 * doing what userservice.ts does for this node: made at the first reach (and consuming the return then), `on` and
 * `oauthReturn` forwarded from the adapter (`_bridge`, `get oauthReturn`), `signInWithProvider` handed the active backend.
 *
 * ⚠️ A signal is logged only once the node is wired: nodescope.ts makes every node of a component (running initialize)
 * BEFORE it attaches their connections, so a pulse sent while the node is being made reaches no wire. A raise goes to the
 * error channel either way and is logged either way.
 */
const runtimeNodes = async (url: string, answer: (r: Req) => Answer, ops: Op[]): Promise<NodeReading> => {
  const world = new World(url, answer);
  world.install();
  try {
    const { adapter, handle } = runtimeAdapter();
    let made = false;
    const service = {
      on: (event: string, cb: (s: unknown) => void) => adapter.on(event, cb),
      get oauthReturn() {
        return adapter.oauthReturn;
      },
      signInWithProvider: (options: Record<string, unknown>) => adapter.signInWithProvider(handle, options)
    };
    const UserService = {
      get instance() {
        if (!made) {
          made = true;
          adapter.consumeAuthReturn(handle);
        }
        return service;
      }
    };
    const load = loaderOf({ [path.join(VIEWER_USER, 'userservice')]: { __esModule: true, default: UserService } });
    const NodeContext = load(path.join(RUNTIME_SRC, 'nodecontext.ts')) as new () => RuntimeContext;
    const NodeDefinition = load(path.join(RUNTIME_SRC, 'nodedefinition.ts')) as { defineNode(definition: unknown): unknown };
    const RuntimeNode = load(path.join(RUNTIME_SRC, 'node.ts')) as { prototype: Pick<ContextNode, 'raiseRuntimeError'> };
    const module = (load(path.join(VIEWER_USER, 'signinwith.ts')) as { default: { node: unknown } }).default;
    const context = new NodeContext();
    context.nodeRegister.register(NodeDefinition.defineNode(module.node));
    const log: string[] = [];
    const nodes: Array<ContextNode | undefined> = [];
    let next = 0;
    const frame = () => {
      for (const node of nodes) {
        if (!node) continue;
        context.updateIteration++;
        node.update();
      }
    };
    const outputs: Array<Record<string, unknown>> = [];
    const read = () => {
      const row: Record<string, unknown> = {};
      nodes.forEach((node, slot) => {
        if (!node) return;
        for (const port of OUTPUTS) row[`${slot}:${port}`] = node.getOutput(port).value;
      });
      outputs.push(row);
    };
    for (const step of ops) {
      if (step.op === 'mount') {
        // the parameters arrive before initialize runs, as nodescope queues them at creation
        // initialize runs inside createNode, so a raise it makes is caught on the prototype for the length of the call
        const slot = step.slot;
        const proto = RuntimeNode.prototype;
        const raise = proto.raiseRuntimeError;
        proto.raiseRuntimeError = (code: string, message: string) => {
          log.push(`${slot}:raise ${code}: ${message}`);
        };
        const restore = [() => (proto.raiseRuntimeError = raise)];
        const node = context.nodeRegister.createNode('net.noodl.user.SignInWith', `siw-${slot}-${++next}`);
        for (const undo of restore) undo();
        // the authored parameters, queued by nodescope at creation and delivered before the first update
        if (step.provider !== undefined) node.setInputValue('provider', step.provider);
        if (step.redirect !== undefined) node.setInputValue('redirect', step.redirect);
        const send = node.sendSignalOnOutput.bind(node);
        node.sendSignalOnOutput = (name: string) => {
          log.push(`${slot}:${name} ${JSON.stringify([node._internal.signingIn, node._internal.error, node._internal.notice])}`);
          send(name);
        };
        node.raiseRuntimeError = (code: string, message: string) => {
          log.push(`${slot}:raise ${code}: ${message}`);
        };
        nodes[slot] = node;
      } else if (step.op === 'unmount') {
        nodes[step.slot]!._onNodeDeleted();
        nodes[step.slot] = undefined;
      } else if (step.op === 'set') {
        nodes[step.slot]!.setInputValue(step.port, step.value);
      } else if (step.op === 'press') {
        nodes[step.slot]!.setInputValue('signIn', false);
        nodes[step.slot]!.setInputValue('signIn', true);
      } else if (step.op === 'answer') {
        world.answerAll();
        await settle();
      } else {
        await settle();
      }
      frame();
      read();
    }
    return { log, outputs, navigations: world.navigations, session: world.session(), url: world.href };
  } finally {
    uninstall();
  }
};

/** A React stand-in that runs one hook per slot: state and refs by call order, a `[]` effect once at mount, its cleanup at unmount. */
const fakeReact = () => {
  interface Instance {
    slots: unknown[];
    cursor: number;
    effects: Array<() => void | (() => void)>;
    cleanups: Array<() => void>;
  }
  let current: Instance | null = null;
  const slot = <T>(init: () => T): { value: T } => {
    const i = current!;
    const k = i.cursor++;
    if (!(k in i.slots)) i.slots[k] = { value: init() };
    return i.slots[k] as { value: T };
  };
  const react = {
    useReducer: (reducer: (n: number) => number, initial: number) => {
      const cell = slot(() => initial);
      return [cell.value, () => (cell.value = reducer(cell.value))];
    },
    useRef: <T>(initial: T) => slot(() => ({ current: initial })).value,
    useEffect: (fn: () => void | (() => void)) => {
      const first = !(current!.cursor in current!.slots);
      slot(() => true);
      if (first) current!.effects.push(fn);
    }
  };
  const render = <T>(instance: Instance, fn: () => T): T => {
    current = instance;
    instance.cursor = 0;
    try {
      return fn();
    } finally {
      current = null;
      for (const effect of instance.effects.splice(0)) {
        const cleanup = effect();
        if (cleanup) instance.cleanups.push(cleanup);
      }
    }
  };
  const instance = (): Instance => ({ slots: [], cursor: 0, effects: [], cleanups: [] });
  const unmount = (i: Instance) => {
    for (const cleanup of i.cleanups.splice(0)) cleanup();
  };
  return { react, render, instance, unmount };
};

/** The emitted lib over the emitted client, both evaluated in the world; each slot a component re-rendered after every step. */
const exportNodes = async (url: string, answer: (r: Req) => Answer, ops: Op[], libSource = signInLibSource()): Promise<NodeReading> => {
  const world = new World(url, answer);
  world.install();
  try {
    const client = loadClient();
    const { react, render, instance, unmount } = fakeReact();
    const log: string[] = [];
    let raisingSlot = 0;
    const errors = { raiseAppError: (e: { code: string; message: string }) => log.push(`${raisingSlot}:raise ${e.code}: ${e.message}`) };
    const module: { exports: unknown } = { exports: {} };
    const req = (id: string): unknown => (id === '../api/client' ? client : id === './errors' ? errors : id === 'react' ? react : {});
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', transpiled(`lib:${libSource.length}:${libSource.slice(-64)}`, () => libSource))(req, module, module.exports);
    const lib = module.exports as SignInLib;
    interface Mounted {
      instance: ReturnType<typeof instance>;
      options: Record<string, unknown>;
      /** Empty until the first render assigns what the hook hands back. */
      handle: SignInHandle;
    }
    const mounted: Array<Mounted | undefined> = [];
    const listenersOf = (slot: number) => {
      const on: Record<string, () => void> = {};
      for (const signal of SIGNALS) {
        on[signal] = () => {
          const h = mounted[slot]!.handle;
          log.push(`${slot}:${signal} ${JSON.stringify([h.signingIn, h.error, h.notice])}`);
        };
      }
      return on;
    };
    const renderSlot = (slot: number) => {
      const m = mounted[slot]!;
      raisingSlot = slot;
      // assigned inside the render, so an effect that pulses at mount reads the handle it belongs to
      render(m.instance, () => (m.handle = lib.useSignInWith({ label: 'Sign In With', nodeId: `siw-${slot}`, componentName: '/Pages/Home' }, m.options, listenersOf(slot))));
    };
    const outputs: Array<Record<string, unknown>> = [];
    const read = () => {
      const row: Record<string, unknown> = {};
      mounted.forEach((m, slot) => {
        if (!m) return;
        for (const port of OUTPUTS) row[`${slot}:${port}`] = m.handle[port];
      });
      outputs.push(row);
    };
    for (const step of ops) {
      if (step.op === 'mount') {
        // an undefined value is never delivered (C3), so it is never an option
        const options: Record<string, unknown> = {};
        if (step.provider !== undefined) options.provider = step.provider;
        if (step.redirect !== undefined) options.redirect = step.redirect;
        mounted[step.slot] = { instance: instance(), options, handle: {} as SignInHandle };
        renderSlot(step.slot);
      } else if (step.op === 'unmount') {
        unmount(mounted[step.slot]!.instance);
        mounted[step.slot] = undefined;
      } else if (step.op === 'set') {
        mounted[step.slot]!.options = { ...mounted[step.slot]!.options, [step.port]: step.value };
        renderSlot(step.slot);
      } else if (step.op === 'press') {
        raisingSlot = step.slot;
        mounted[step.slot]!.handle.signIn();
      } else if (step.op === 'answer') {
        world.answerAll();
        await settle();
      } else {
        await settle();
      }
      mounted.forEach((m, slot) => m && renderSlot(slot));
      read();
    }
    return { log, outputs, navigations: world.navigations, session: world.session(), url: world.href };
  } finally {
    uninstall();
  }
};

const RETURNING = `${ORIGIN}/home?nodegx_auth=c1`;
const PROVIDER_ERROR = `${ORIGIN}/home?nodegx_auth_error=Sign-in%20was%20not%20completed%3A%20access_denied`;
const PLAIN = `${ORIGIN}/home?tab=2#top`;
const session = () => ({ status: 200, body: EXCHANGED }) as Answer;

const SCRIPTS: Array<[string, string, (r: Req) => Answer, Op[]]> = [
  ['a press with a Provider hands over and reports nothing', PLAIN, session, [{ op: 'mount', slot: 0, provider: 'acme' }, { op: 'press', slot: 0 }]],
  ['a press with a Redirect hands over with it', PLAIN, session, [{ op: 'mount', slot: 0, provider: 'acme', redirect: '/welcome' }, { op: 'press', slot: 0 }]],
  ['a Provider that needs encoding', PLAIN, session, [{ op: 'mount', slot: 0, provider: 'a b/c?' }, { op: 'press', slot: 0 }]],
  ['a press with no Provider is refused: Error, then Failure and Completed', PLAIN, session, [{ op: 'mount', slot: 0 }, { op: 'press', slot: 0 }, { op: 'press', slot: 0 }]],
  ['a blank Provider is refused', PLAIN, session, [{ op: 'mount', slot: 0, provider: '' }, { op: 'press', slot: 0 }]],
  ['a Provider set after mount is the one handed over', PLAIN, session, [{ op: 'mount', slot: 0 }, { op: 'set', slot: 0, port: 'provider', value: 'acme' }, { op: 'set', slot: 0, port: 'redirect', value: '/back' }, { op: 'press', slot: 0 }]],
  ['a plain page load: nothing at mount', PLAIN, session, [{ op: 'mount', slot: 0, provider: 'acme' }, { op: 'tick' }, { op: 'answer' }]],
  ['a return: Signing In at mount, then Done once the exchange lands; the session is stored', RETURNING, session, [{ op: 'mount', slot: 0, provider: 'acme' }, { op: 'answer' }, { op: 'tick' }]],
  ['a return with a notice', RETURNING, () => ({ status: 200, body: EXCHANGED_NOTICE }), [{ op: 'mount', slot: 0 }, { op: 'answer' }]],
  ['a return refused by the backend: Failure with its sentence', RETURNING, () => ({ status: 400, body: EXPIRED }), [{ op: 'mount', slot: 0 }, { op: 'answer' }]],
  ['a return refused with no sentence: the node’s own', RETURNING, () => ({ status: 500, body: {} }), [{ op: 'mount', slot: 0 }, { op: 'answer' }]],
  ['a provider error: raised and shown at mount with no pulse (no wire yet), the announcement a tick later ignored (C50)', PROVIDER_ERROR, session, [{ op: 'mount', slot: 0 }, { op: 'tick' }, { op: 'tick' }]],
  ['two nodes on the returning page both hear it', RETURNING, session, [{ op: 'mount', slot: 0, provider: 'acme' }, { op: 'mount', slot: 1 }, { op: 'answer' }]],
  ['a node mounted after the return settled takes its values at mount, with no pulse', RETURNING, session, [{ op: 'mount', slot: 0 }, { op: 'answer' }, { op: 'mount', slot: 1 }, { op: 'tick' }]],
  ['unmounted and mounted again: a new node, its values again, and no second Done', RETURNING, session, [{ op: 'mount', slot: 0 }, { op: 'answer' }, { op: 'unmount', slot: 0 }, { op: 'mount', slot: 0 }, { op: 'tick' }]],
  ['a press on the returning page after Done hands over again', RETURNING, session, [{ op: 'mount', slot: 0, provider: 'acme' }, { op: 'answer' }, { op: 'press', slot: 0 }]],
  ['a refusal while the exchange is in flight, then the return lands', RETURNING, session, [{ op: 'mount', slot: 0 }, { op: 'press', slot: 0 }, { op: 'answer' }]],
  ['a provider error and a refused press on the same node', PROVIDER_ERROR, session, [{ op: 'mount', slot: 0 }, { op: 'tick' }, { op: 'press', slot: 0 }]]
];

describe('§C the node against the runtime’s own signinwith.ts in a NodeContext', () => {
  test.each(SCRIPTS)('%s', async (_name, url, answer, ops) => {
    const runtime = await runtimeNodes(url, answer, ops);
    const exported = await exportNodes(url, answer, ops);
    expect(exported).toEqual(runtime);
  });

  test('the scripts reach every arm: a handover, a refusal, Signing In, Done with and without a notice, Failure from a return, a silent mount', async () => {
    // one at a time: each side installs its world on the global object
    const all: NodeReading[] = [];
    for (const [, url, answer, ops] of SCRIPTS) all.push(await runtimeNodes(url, answer, ops));
    const logs = all.flatMap((r) => r.log);
    expect(all.some((r) => r.navigations.length > 0)).toBe(true);
    expect(logs).toContain('0:raise user/sign-in-with-failed: Sign In With: no provider was set.');
    expect(logs).toContain('0:done [false,null,null]');
    expect(logs).toContain('0:done [false,null,"Your password was removed."]');
    expect(logs.some((l) => l.startsWith('1:done'))).toBe(true);
    expect(logs).toContain('0:raise user/sign-in-with-failed: This sign-in code is not valid. It may have expired or already been used.');
    expect(logs).toContain('0:raise user/sign-in-with-failed: Sign-in could not be completed.');
    expect(all.some((r) => r.outputs.some((row) => row['0:signingIn'] === true))).toBe(true);
    // the provider error: raised once, shown on Error, and no Failure pulse anywhere in that script
    const providerError = all[SCRIPTS.findIndex(([name]) => name.startsWith('a provider error: raised'))];
    expect(providerError.log).toEqual(['0:raise user/sign-in-with-failed: Sign-in was not completed: access_denied']);
    expect(providerError.outputs.at(-1)).toEqual({ '0:signingIn': false, '0:error': 'Sign-in was not completed: access_denied', '0:notice': undefined });
  });

  test('three mutant libs are caught: no C50 guard, Done before Notice is set, no Signing In on a press', async () => {
    const source = signInLibSource();
    const mutants: Array<[string, string, (r: Req) => Answer, Op[]]> = [
      [source.replace('  if (s.internal.returnReported) return;\n', ''), PROVIDER_ERROR, session, [{ op: 'mount', slot: 0 }, { op: 'tick' }]],
      [
        source.replace(
          "    s.internal.notice = state.notice;\n    s.internal.error = undefined;\n    s.rerender();\n    // Last, after the values it is about.\n    reportOutcome(s, 'done', wired);",
          "    reportOutcome(s, 'done', wired);\n    s.internal.notice = state.notice;\n    s.internal.error = undefined;\n    s.rerender();"
        ),
        RETURNING,
        () => ({ status: 200, body: EXCHANGED_NOTICE }),
        [{ op: 'mount', slot: 0 }, { op: 'answer' }]
      ],
      [source.replace('function signIn(s: SignInState): void {\n  s.internal.signingIn = true;', 'function signIn(s: SignInState): void {\n  s.internal.signingIn = false;'), PLAIN, session, [{ op: 'mount', slot: 0, provider: 'acme' }, { op: 'press', slot: 0 }]]
    ];
    for (const [mutant, url, answer, ops] of mutants) {
      expect(mutant).not.toBe(source);
      const runtime = await runtimeNodes(url, answer, ops);
      expect(await exportNodes(url, answer, ops)).toEqual(runtime);
      expect(await exportNodes(url, answer, ops, mutant)).not.toEqual(runtime);
    }
  });

  test('a mount that pulses (the read at mount wired) is caught: the provider error would fire Failure', async () => {
    const source = signInLibSource();
    const pulsing = source.replace('applyReturn(s, current, false);', 'applyReturn(s, current);');
    expect(pulsing).not.toBe(source);
    const ops: Op[] = [{ op: 'mount', slot: 0 }, { op: 'tick' }];
    expect(await exportNodes(PROVIDER_ERROR, session, ops, pulsing)).not.toEqual(await runtimeNodes(PROVIDER_ERROR, session, ops));
  });
});

// ---- §D ------------------------------------------------------------------------------------------------------------

describe('§D the shapes a wire changes, and the refusals', () => {
  test('a wired Provider is an option read off the render, and the press reads it', () => {
    const ir = mutated((c) => {
      c.nodes.push({ id: 'pick', type: 'Variable2', catalogRef: 'Variable2', parameters: [{ name: 'name', value: { kind: 'literal', value: 'pick' } }], declaredPorts: [], portKnowledge: 'partial' } as unknown as NodeIR);
      connect(c, 'pick', 'value', 'acme', 'provider');
      nodeIn(c, 'acme').parameters = [];
    });
    const out = emitApp(ir, catalog);
    expect(typecheckEmittedApp(out)).toEqual([]);
    expect(out.files['src/pages/Home.tsx']).toContain("useSignInWith({ label: 'Acme sign-in', nodeId: 'acme', componentName: '/Pages/Home' }, { provider: pickValue }, {");
  });

  test('a literal Redirect is an option', () => {
    const ir = mutated((c) => setParam(nodeIn(c, 'acme'), 'redirect', { kind: 'literal', value: '/welcome' }));
    expect(emitApp(ir, catalog).files['src/pages/Home.tsx']).toContain("{ provider: 'acme', redirect: '/welcome' }");
  });

  test('a project with no backend refuses it by name, and its button goes with it', () => {
    const ir = cloneIr();
    ir.project.cloudservices = undefined;
    expect(refusalOf(ir, HOME, 'acme')).toBe('the project declares no backend (metadata.cloudservices is absent) — there is no /oauth/<provider>/start to hand the browser over to');
    expect(refusalOf(ir, HOME, 'nobody')).toBe('the project declares no backend (metadata.cloudservices is absent) — there is no /oauth/<provider>/start to hand the browser over to');
    expect(emitApp(ir, catalog).files[SIGN_IN_LIB_PATH]).toBeUndefined();
  });

  test('an input the node has not got, and a pulse into a value port, are refused by the table', () => {
    const extra = mutated((c) => connect(c, 'lastVar', 'value', 'acme', 'backendId'));
    expect(refusalOf(extra, HOME, 'acme')).toBe('its backendId input is not a port this node has');
    const asValue = mutated((c) => connect(c, 'acme', 'done', 'headline', 'text'));
    expect(refusalOf(asValue, HOME, 'acme')).toBe('its done output is consumed as a value — a pulse carries nothing to read');
  });

  test('two wires into Provider are refused by the table', () => {
    const ir = mutated((c) => {
      connect(c, 'lastVar', 'value', 'acme', 'provider');
      connect(c, 'refusedVar', 'value', 'acme', 'provider');
    });
    expect(refusalOf(ir, HOME, 'acme')).toBe('two wires feed its Provider input — last-writer-wins is not statically ordered');
  });
});

// ---- §E ------------------------------------------------------------------------------------------------------------

describe('§E what building it found, and the recorded differences', () => {
  test('P18-S109-MAGICRETURN: before §79 a magic link signed nobody in — the client had no return leg; it has one now', async () => {
    const account = emitApp(parseProject(ACCOUNT_DESK, catalog), catalog).files['src/api/client.ts'];
    const exported = plain(await exportReturn(RETURNING, session, account));
    expect(exported.session).toEqual(EXCHANGED);
    expect(exported.url).toBe(`${ORIGIN}/home`);
    // the reverted arm: the same client with the leg cut off stores nothing and leaves the code in the address bar
    const reverted = account.slice(0, account.indexOf('\n// ── The sign-in return leg'));
    const before = plain(await exportReturn(RETURNING, session, reverted));
    expect(before.session).toBeUndefined();
    expect(before.url).toBe(RETURNING);
  });

  test('the exchange is read as the runtime reads it, not as request() does: a 500 with no `error`, and no backend at all', async () => {
    for (const answer of [() => ({ status: 500, body: {} }) as Answer, () => 'network' as Answer]) {
      const runtime = await runtimeReturn(RETURNING, answer);
      const exported = await exportReturn(RETURNING, answer);
      expect((runtime.settled as { error: string }).error).toBe('Sign-in could not be completed.');
      expect(plain(exported)).toEqual(plain(runtime));
    }
    // the reverted arm: through request(), the client's own sentences
    const source = app.files['src/api/client.ts'];
    const viaRequest = source.replace(
      "  void exchangeAuthCode(code as string);",
      "  request<WireSession>('/oauth/exchange', { method: 'POST', body: { code } }).then((r) => { writeSession(r); authReturn = { inProgress: false, succeeded: true }; announceAuthReturn(); }, (e: Error) => { authReturn = { inProgress: false, succeeded: false, error: e.message }; announceAuthReturn(); });"
    );
    expect(viaRequest).not.toBe(source);
    expect(((await exportReturn(RETURNING, () => ({ status: 500, body: {} }), viaRequest)).settled as { error: string }).error).toBe('Request failed (500)');
    expect(((await exportReturn(RETURNING, () => 'network', viaRequest)).settled as { error: string }).error).toBe(`Could not reach the backend at ${ENDPOINT}`);
  });
});

// ---- §F ------------------------------------------------------------------------------------------------------------

describe('§F the ledger', () => {
  test('the row is translated and the badge is gone', () => {
    expect(ledgerEntryOf('net.noodl.user.SignInWith')?.status).toBe('translated');
    expect(exportBadgeOf('net.noodl.user.SignInWith')).toBeUndefined();
  });
});
