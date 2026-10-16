/**
 * The runtime arm of `tests/the-field-announces-at-mount.test.ts` (P18-S116-FIELDMOUNT): what the running app's Text
 * Input announces as it mounts, from the runtime's OWN code, in a child process.
 *
 * The node is built and drawn the way `noodl-viewer-react/tests/gam-009-typed-text-survives-a-remount.test.tsx` does it:
 * a real Text Input node in a corpus graph, rendered through its own `render()` into a real `createRoot` under a jsdom
 * built by hand, so the node's own output handlers and the component's `componentDidMount` are what run. A child process
 * because ts-jest typechecks every file it transforms against this package's strict config, and the viewer is not
 * written for it; here it is loaded transpiled only, as s117's query arm loads the runtime.
 *
 * stdin: `[{ parameters, wired }]`, one per case: the node's authored parameters by name, and `wired`, the value a wire
 * into Value delivers as the node is made (`{ $undefined: true }`, or absent, is nothing delivered: a wire whose source
 * holds nothing never calls the setter). stdout: per case `{ writes, changed, field }`: every write of the Value output
 * from the first paint (the value each sink receives), how many Value Changed signals were sent, and what the
 * `<input>` shows.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
require(require.resolve('ts-node', { paths: [ROOT] })).register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', allowJs: false, jsx: 'react', esModuleInterop: true }
});

globalThis.Noodl = { deployed: true, baseUrl: '/' };
const { JSDOM } = require(require.resolve('jsdom', { paths: [ROOT] }));
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const VIEWER = path.join(ROOT, 'packages', 'noodl-viewer-react');
const React = require(require.resolve('react', { paths: [VIEWER] }));
const { createRoot } = require(require.resolve('react-dom/client', { paths: [VIEWER] }));
const { act } = React;
const TextInputModule = require(path.join(VIEWER, 'src', 'nodes', 'controls', 'text-input')).default;
const { createCorpusGraph } = require(path.join(ROOT, 'packages', 'noodl-runtime', 'test', 'corpus', 'graph-harness'));

async function run(c) {
  const graph = await createCorpusGraph({
    modules: [TextInputModule],
    data: { components: [{ name: '/root', nodes: [{ id: 'field', type: TextInputModule.node.name, parameters: c.parameters }] }] }
  });
  graph.context.styles = { getTextStyle: () => ({}), resolveColor: (x) => x };
  graph.context.setNodeFocused = () => undefined;
  graph.update();
  const node = graph.node('field');
  if (c.wired !== undefined && !(c.wired && c.wired.$undefined)) {
    node.setInputValue('startValue', c.wired);
    graph.update();
  }
  // From here on, every write of the Value output is something its sinks receive (react-component-node.ts flags the
  // output dirty with no equality check), and the first paint is the mount.
  const writes = [];
  const flag = node.flagOutputDirty.bind(node);
  node.flagOutputDirty = (name) => {
    if (name === 'onTextChanged') writes.push(node.outputPropValues.onTextChanged === undefined ? { $undefined: true } : node.outputPropValues.onTextChanged);
    flag(name);
  };
  const changedBefore = graph.signalsFor('field').filter((s) => s === 'textChanged').length;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(React.Fragment, null, node.render() ?? null));
  });
  graph.update();
  const changed = graph.signalsFor('field').filter((s) => s === 'textChanged').length - changedBefore;
  const field = container.querySelector('input, textarea')?.value ?? null;
  await act(async () => root.unmount());
  container.remove();
  return { writes, changed, field };
}

(async () => {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const out = [];
  for (const c of JSON.parse(input)) out.push(await run(c));
  process.stdout.write(JSON.stringify(out));
})().catch((e) => {
  process.stderr.write(String((e && e.stack) || e));
  process.exit(1);
});
