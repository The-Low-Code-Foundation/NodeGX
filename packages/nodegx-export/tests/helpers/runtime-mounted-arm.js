/**
 * The runtime arm of `tests/the-root-is-mounted-when-it-says.test.ts` (P18 session 126, EXP-011 §93): what a v2 project's
 * Home page draws, from the runtime's OWN nodes, rendered by real React into a jsdom document, in a child process.
 *
 * Nothing visual is stood in for: the viewer's own Group, Text and Button (`noodl-viewer-react/src/nodes`), the runtime's
 * own component instances, Component Inputs, Expression, Variable and Set Variable, on the runtime's corpus harness
 * (`noodl-runtime/test/corpus/graph-harness.ts`). So a root's Mounted is the viewer's `wantsToBeMounted`, a component
 * instance draws its root's `render()`, and a Did Mount is the viewer's own, sent from the element's `componentDidMount`.
 * A press is a DOM click on the `<button>` whose text is the label. A child process because ts-jest typechecks every file
 * it transforms against this package's strict config, and the runtime and viewer are not written for it.
 *
 * stdin: `[{ dir, scenarios, fields? }]`: per project, its folder (v2 format), and lists of button labels to press. stdout: per
 * project, per scenario, one reading after load and one after each press: the text of every Text node in the document,
 * in document order (the export's `<p>`s, read the same way by `export-react-arm.js`).
 *
 * P18 session 129 (EXP-011 §97, P18-S128-FIELDSET). `fields: true` puts the viewer's own focus tracker behind a Focus and a
 * Blur (`focus-tracker.ts`, as `viewer.jsx` does; without it they reach a stub that focuses nothing), and appends to every
 * reading each field's text, `[placeholder]=value` in document order, then `focus=[placeholder]` (or `focus=none`) for the
 * element that holds focus. Two steps that are not button labels: `type:<placeholder>:<text>` focuses that field, writes
 * the text as a keystroke does (the value setter, then an `input` event, which React's onChange reads) and blurs it, as a
 * person types and leaves; `enter:<placeholder>` presses Enter in it (a `keydown`).
 *
 * P18 session 134 (EXP-020). `backend: { spec, appId, endpoint, session? }` answers the runtime's `XMLHttpRequest` from
 * `fake-parse-backend.js`, fresh per scenario, gives the Function node the running app's own `Noodl` (`window.Noodl`, as
 * `noodl-js-api.ts` installs it: `Records` from `noodl-runtime/src/api/records.js`, the viewer's `CloudFunctions`, `Users`
 * and `Files`, `Variables` the global variables record), the project's `cloudservices`, and `session` where the running
 * app keeps it. Needs `RUNTIME_ARM_URL` in the environment (jsdom keeps no localStorage without an origin), and one
 * session per process (the viewer's UserService is a singleton). The output is then `{ readings, requests }`.
 *
 * P18 session 139 (EXP-021 AC4). `storage: { keys, seeds? }`, with `RUNTIME_ARM_URL` set: before scenario i the
 * localStorage is emptied and `seeds[i]` (key → text) written into it, and the Global Store manager (a singleton) is reset
 * with its state, as a reload would leave it; every reading ends with `storage=<text, or null>` for each key.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const { JSDOM } = require(require.resolve('jsdom', { paths: [ROOT] }));
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  pretendToBeVisual: true,
  ...(process.env.RUNTIME_ARM_URL ? { url: process.env.RUNTIME_ARM_URL } : {})
});
const g = globalThis;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
if (process.env.RUNTIME_ARM_URL) g.localStorage = dom.window.localStorage;
for (const name of ['HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'FocusEvent', 'getComputedStyle', 'ResizeObserver', 'MutationObserver']) {
  if (dom.window[name] !== undefined && g[name] === undefined) g[name] = dom.window[name];
}
g.requestAnimationFrame = (cb) => setTimeout(cb, 0);
g.cancelAnimationFrame = (id) => clearTimeout(id);
g.IS_REACT_ACT_ENVIRONMENT = true;
g.Noodl = { deployed: true, baseUrl: '/' };
console.log = (...args) => process.stderr.write(args.map(String).join(' ') + '\n');
console.warn = console.log;
const errors = [];
console.error = (...args) => {
  errors.push(args.map(String).join(' '));
  process.stderr.write(args.map(String).join(' ') + '\n');
};

require(require.resolve('ts-node', { paths: [ROOT] })).register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', allowJs: false, esModuleInterop: true, jsx: 'react', target: 'ES2019' }
});

const React = require(require.resolve('react', { paths: [path.join(ROOT, 'packages', 'noodl-viewer-react')] }));
const { createRoot } = require(require.resolve('react-dom/client', { paths: [path.join(ROOT, 'packages', 'noodl-viewer-react')] }));
const { act } = React;

const LIB = path.join(ROOT, 'packages', 'noodl-runtime', 'src');
const VIEWER = path.join(ROOT, 'packages', 'noodl-viewer-react', 'src');
const { createCorpusGraph } = require(path.join(ROOT, 'packages', 'noodl-runtime', 'test', 'corpus', 'graph-harness'));
const Model = require(path.join(LIB, 'model'));
const def = (m) => (m && m.default ? m.default : m);
const MODULES = [
  def(require(path.join(LIB, 'nodes', 'std-library', 'data', 'variablenode2'))),
  def(require(path.join(LIB, 'nodes', 'std-library', 'data', 'setvariablenode'))),
  def(require(path.join(LIB, 'nodes', 'std-library', 'expression'))),
  def(require(path.join(LIB, 'nodes', 'std-library', 'simplejavascript'))),
  // P18 session 127 (EXP-011 §94): the Pulse Desk's Counter, Condition and States.
  def(require(path.join(LIB, 'nodes', 'std-library', 'counter'))),
  def(require(path.join(LIB, 'nodes', 'std-library', 'condition'))),
  def(require(path.join(VIEWER, 'nodes', 'std-library', 'states'))),
  def(require(path.join(LIB, 'nodes', 'componentinputs'))),
  def(require(path.join(LIB, 'nodes', 'componentoutputs'))),
  def(require(path.join(VIEWER, 'nodes', 'visual', 'group'))),
  def(require(path.join(VIEWER, 'nodes', 'visual', 'text'))),
  def(require(path.join(VIEWER, 'nodes', 'controls', 'button'))),
  def(require(path.join(VIEWER, 'nodes', 'controls', 'text-input'))),
  // P18 session 130 (EXP-011 §99): the Relay Desk's list, the viewer's own For Each over the runtime's own Static Data.
  def(require(path.join(LIB, 'nodes', 'std-library', 'data', 'staticdata'))),
  def(require(path.join(VIEWER, 'nodes', 'std-library', 'data', 'foreach'))),
  // P18 session 139 (EXP-021 AC4): the Store Desk's Global Store, Subscribe and Set, over the runtime's own manager.
  def(require(path.join(LIB, 'nodes', 'std-library', 'agent', 'globalstorenode'))),
  def(require(path.join(LIB, 'nodes', 'std-library', 'agent', 'globalstoresubscribenode'))),
  def(require(path.join(LIB, 'nodes', 'std-library', 'agent', 'globalstoresetnode')))
];
const { globalStoreManager } = require(path.join(LIB, 'nodes', 'std-library', 'agent', 'globalstore'));

// P18 session 130. The viewer's For Each reads the project's settings off the running runtime, which the harness does not
// start: an empty set is the default project's (as `noodl-viewer-react/tests/corpus/f50-repeater-plain-array.test.ts` lends it).
{
  const runtimeModule = require(require.resolve('@noodl/runtime', { paths: [path.join(ROOT, 'packages', 'noodl-viewer-react')] }));
  const NoodlRuntime = runtimeModule && runtimeModule.default ? runtimeModule.default : runtimeModule;
  if (NoodlRuntime.instance === undefined) NoodlRuntime.instance = { getProjectSettings: () => ({}) };
}

/** A v2 component's nodes as the editor exports them: each visual node with its children nested. */
function componentData(dir, rel) {
  const base = path.join(dir, 'components', rel);
  const nodes = JSON.parse(fs.readFileSync(path.join(base, 'nodes.json'), 'utf-8')).nodes;
  const connections = JSON.parse(fs.readFileSync(path.join(base, 'connections.json'), 'utf-8')).connections;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const exported = (n) => ({
    id: n.id,
    type: n.type,
    parameters: { ...(n.parameters ?? {}) },
    ...(n.ports ? { ports: n.ports } : {}),
    children: (n.children ?? []).map((c) => exported(byId.get(c)))
  });
  const ports = [];
  for (const n of nodes) {
    if (n.type === 'Component Inputs') for (const p of n.ports ?? []) ports.push({ name: p.name, plug: 'input', type: p.type });
    if (n.type === 'Component Outputs') for (const p of n.ports ?? []) ports.push({ name: p.name, plug: 'output', type: p.type });
  }
  const tops = nodes.filter((n) => n.parent === undefined);
  return {
    name: `/${rel}`,
    ports,
    nodes: tops.map(exported),
    connections: connections.map((c) => ({ sourceId: c.fromId, sourcePort: c.fromProperty, targetId: c.toId, targetPort: c.toProperty })),
    roots: tops.filter((n) => n.children !== undefined).map((n) => n.id)
  };
}

function componentsOf(dir) {
  const registry = JSON.parse(fs.readFileSync(path.join(dir, 'components', '_registry.json'), 'utf-8')).components;
  return Object.keys(registry).filter((p) => p !== 'App').map((p) => componentData(dir, p));
}

/**
 * The graph settled, then a few frames: a visual node re-renders on the frame's end (`forceUpdate` waits for `frameEnd`),
 * and a Did Mount or a mounted change it causes is settled by the next.
 */
async function frames(graph) {
  for (let i = 0; i < 4; i++) {
    await graph.settle();
    graph.frame();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await graph.settle();
}

/** P18 session 129. Each field's text by its placeholder, in document order, then which one holds focus. */
function fieldReading(container) {
  const els = [...container.querySelectorAll('input, textarea')];
  const name = (el) => `[${el.getAttribute('placeholder') ?? ''}]`;
  const active = els.find((el) => el === document.activeElement);
  return [...els.map((el) => `${name(el)}=${el.value}`), `focus=${active ? name(active) : 'none'}`];
}

/** P18 session 129. `type`: focus, write as a keystroke does, blur; `enter`: an Enter keydown. */
function stepInField(container, verb, placeholder, text) {
  const el = [...container.querySelectorAll('input, textarea')].find((e) => (e.getAttribute('placeholder') ?? '') === placeholder);
  if (!el) throw new Error(`no field "${placeholder}"`);
  if (verb === 'enter') {
    el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return;
  }
  el.focus();
  const proto = el.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
  el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  el.blur();
}

/**
 * P18 session 134. The running app's `Noodl` and its backend, for one scenario: a fresh fake backend behind
 * `XMLHttpRequest`, the project's `cloudservices`, the session stored, and `window.Noodl` as `noodl-js-api.ts` builds it.
 */
function installBackend(backend) {
  const { createFakeBackend } = require('./fake-parse-backend');
  const fake = createFakeBackend(backend.spec);
  g.XMLHttpRequest = fake.FakeXMLHttpRequest;
  dom.window.XMLHttpRequest = fake.FakeXMLHttpRequest;
  const runtimeModule = require(require.resolve('@noodl/runtime', { paths: [path.join(ROOT, 'packages', 'noodl-viewer-react')] }));
  const NoodlRuntime = runtimeModule && runtimeModule.default ? runtimeModule.default : runtimeModule;
  const cloudservices = { endpoint: backend.endpoint, appId: backend.appId };
  NoodlRuntime.instance = {
    getProjectSettings: () => ({}),
    getMetaData: (key) => (key === 'cloudservices' ? cloudservices : key === 'dbCollections' ? [] : undefined)
  };
  const key = `Parse/${backend.appId}/currentUser`;
  if (backend.session) dom.window.localStorage.setItem(key, JSON.stringify(backend.session));
  else dom.window.localStorage.removeItem(key);
  const api = {
    Records: require(path.join(LIB, 'api', 'records'))(),
    CloudFunctions: def(require(path.join(VIEWER, 'api', 'cloudfunctions'))),
    Users: def(require(path.join(VIEWER, 'api', 'users'))),
    Files: def(require(path.join(VIEWER, 'api', 'files')))
  };
  Object.defineProperty(api, 'Variables', { get: () => Model.get('--ndl--global-variables'), enumerable: true });
  dom.window.Noodl = api;
  return fake;
}

async function run({ dir, scenarios, fields, backend, storage }) {
  const components = componentsOf(dir);
  const home = components.find((c) => c.name === '/Pages/Home');
  // The Home page's Page node is the router's; the arm draws the Page's one child, the page's Group.
  const pageNode = home.nodes.find((n) => n.type === 'Page');
  home.nodes = [...home.nodes.filter((n) => n !== pageNode), ...pageNode.children];
  home.roots = pageNode.children.map((c) => c.id);
  const out = [];
  const requests = [];
  for (const [index, presses] of scenarios.entries()) {
    delete Model._models['--ndl--global-variables'];
    if (storage !== undefined) {
      globalStoreManager.reset({ clearState: true });
      localStorage.clear();
      for (const [key, text] of Object.entries((storage.seeds ?? [])[index] ?? {})) localStorage.setItem(key, text);
    }
    if (backend !== undefined) requests.push(installBackend(backend).log);
    const graph = await createCorpusGraph({ modules: MODULES, data: { components }, rootComponent: '/Pages/Home' });
    graph.context.styles = { getTextStyle: () => ({}), resolveColor: (c) => c };
    if (fields) {
      const { FocusTracker } = require(path.join(VIEWER, 'focus-tracker'));
      const tracker = new FocusTracker();
      graph.context.setNodeFocused = (node, focused) => tracker.setNodeFocused(node, focused);
    } else graph.context.setNodeFocused = () => undefined;
    await graph.settle();
    const container = document.getElementById('root');
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(React.Fragment, null, graph.root.render() ?? null));
    });
    // Every Text node in the graph, component instances included, whose element the document holds, in document order.
    const read = () => {
      const texts = [];
      const all = graph.root.nodeScope.getNodesWithTypeRecursive('Text');
      for (const node of all) {
        const el = node.getDOMElement ? node.getDOMElement() : null;
        if (el && container.contains(el)) texts.push({ el, text: (el.textContent ?? '').trim() });
      }
      texts.sort((a, b) => (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1));
      return [
        ...texts.map((t) => t.text),
        ...(fields ? fieldReading(container) : []),
        ...(storage === undefined ? [] : storage.keys.map((key) => `storage=${localStorage.getItem(key)}`))
      ];
    };
    /**
     * React commits (and the viewer sends Did Mount from `componentDidMount`) as an `act` scope closes, after the frames
     * inside it: so the frames run again in a new scope, until a reading is the same twice.
     */
    const settled = async () => {
      let last = null;
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          await frames(graph);
        });
        const now = JSON.stringify(read());
        if (now === last) return;
        last = now;
      }
      throw new Error('the page did not settle');
    };
    await settled();
    const readings = [read()];
    for (const label of presses) {
      // The text may hold line breaks (a Text Area's lines, P18 session 140), so it is `[\s\S]*`, not `.*`.
      const typed = /^(type|enter):([^:]*)(?::([\s\S]*))?$/.exec(label);
      if (typed) {
        await act(async () => {
          stepInField(container, typed[1], typed[2], typed[3] ?? '');
        });
        await settled();
        readings.push(read());
        continue;
      }
      const button = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === label);
      if (!button) throw new Error(`no button "${label}"`);
      await act(async () => {
        button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      });
      await settled();
      readings.push(read());
    }
    await act(async () => root.unmount());
    if (errors.length > 0) throw new Error(`the page logged errors: ${errors.join(' | ').slice(0, 600)}`);
    out.push(readings);
  }
  return backend !== undefined ? { readings: out, requests } : out;
}

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  (async () => {
    const out = [];
    for (const project of JSON.parse(input)) out.push(await run(project));
    return out;
  })()
    .then((out) => process.stdout.write(JSON.stringify(out)))
    .catch((e) => {
      process.stderr.write(String(e && e.stack ? e.stack : e));
      process.exit(1);
    });
});
