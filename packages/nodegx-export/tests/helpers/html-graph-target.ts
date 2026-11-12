/**
 * P134 HTX-005 (AC4). The HTML export as a graph target: P107's graph scenarios (CONTRACT.md C1–C11) on the plain files
 * the third printer writes, graded by the same runner, the same projection and the same settle rule as the React
 * export's `exportGraphTarget` (node-spec-target.ts) and the Swift export's `swiftGraphTarget` (swift-graph-target.ts).
 *
 * It is React's shape, not Swift's: the output is JavaScript, so it runs in this process, step by step, with nothing to
 * transpile. Each scenario's probe is printed by `emitHtmlApp`, its `components/Probe.js` and what it imports joined by
 * esbuild from the export's own files only (`bundleApp`, html-in-jsdom.ts), and mounted in a fresh jsdom window per
 * scenario, so a module's state (a Global Store's) starts empty, as a page load does:
 *
 *   - **mount** is the printed `mountProbe(element, inputs)`: the lifted callbacks and the driven inputs' first values.
 *   - **signals** click the printed `<button>` whose words are `<node>.<port>`.
 *   - **set** is the printed `update({ <prop>: value })`, a parent changing what it sets.
 *   - **after each of those** the core's queued effects run (`flushSync`, which `lib/core.js` exports): a browser runs
 *     what a click queued before the next click, and React's target does the same with one `act` per step. Without it
 *     two presses before a settle ran as one turn, and C2's two Increases reached the Value Changed as one (first run).
 *   - **settle** lets the window run what is queued (the core flushes its effects on a microtask; a Function may set a
 *     timer), then records each lifted output's last value when its canonical form moved: React's settle rule, copied.
 *   - **the world** (a clock and a random source) is the window's own `Date.now` and `Math.random`, pointed at the
 *     world before the printed files run: the window is its own realm, so the process's are not the page's.
 *
 * The three bounds are Swift's: the harness's limits read off the React target's own `canPlay` (one harness), the
 * plan's own notes (one plan, so the same scenarios in the same words), and what the HTML printer reports it does not
 * print (`preflight.htmlLosses`): its own verdict, counted apart.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- a jsdom window is untyped here, as in html-in-jsdom.ts */

import type { GraphReach, GraphScenario, GraphTarget, Handle, TraceEvent } from '../../../nodegx-node-spec/src';
import { canonicalise, parseEndpoint, projectGraphTrace } from '../../../nodegx-node-spec/src';
import { hasObservation } from '../../../nodegx-node-spec/src/runner/compare';
import type { World } from '../../../nodegx-node-spec/src/world';
import { CatalogIndex, loadCatalog, type Catalog } from '../../src/catalog';
import { planProject, type ComponentPlan } from '../../src/analyze/plan';
import { emitHtmlApp } from '../../src/emit/html/emitHtml';
import { js as jsText } from '../../src/emit/html/printComponent';
import type { ComponentIR } from '../../src/ir/types';
import { asRuntimeHarnessNames, drivenInputs, exportGraphTarget, graphComponent, probeProject } from './node-spec-target';
import { bundleApp } from './html-in-jsdom';

let catalogCache: Catalog | undefined;
const catalog = (): Catalog => (catalogCache ??= loadCatalog());

/** The React target's words for a verdict that is the exporter's, not the harness's (node-spec-graph.test.ts). */
export const EXPORTER_VERDICT = /refused part of the graph|lifts none of the outputs|declares no prop for/;
/** The HTML printer's own verdict: a node, button or wire of the scenario the plan keeps and the HTML printer does not print. */
export const HTML_PRINTER_VERDICT = /the HTML printer does not print part of the graph/;
/** The React target's refusal filter (emitGraph): a scenario node, its button or a wire, not the probe's own lift. */
const REFUSED = (note: string) => /\b(dropped|deferred)\b/.test(note) && !/->out:|node out \(Component Outputs\)|: output "/.test(note);
/** A lifted output the HTML printer has no push for: the reach's edge, not the graph's (printComponent's own sentence). */
const UNPUSHED = /^the value it sends out through (\S+) reads an? (\S+) value, which the HTML target does not print yet$/;
/** The probe's file in the export, and the harness's one extra file: an entry that hands the mount to the window. */
const PROBE_FILE = 'components/Probe.js';
const ENTRY = 'graph-entry.js';

export interface HtmlGraphVerdict {
  name: string;
  /** Why the HTML export cannot play it; absent when it can. */
  outside?: string;
  component?: ComponentIR;
  plan?: ComponentPlan;
  /** The printed files, path → text. */
  files?: Record<string, string>;
  /** `<id>.<port>` → the callback the printed `mountProbe` calls, for every lifted output whose push the printer printed. */
  lifted: Map<string, string>;
  /** `<id>.<port>` → the input the printed `mountProbe` reads, for every value input a `set` step drives. */
  driven: Map<string, string>;
}

const reachOf = (lifted: ReadonlyMap<string, string>): GraphReach => ({ signals: false, outcomes: false, output: (subject, port) => lifted.has(`${subject}.${port}`) });

/** The verdict on every scenario, in order. Pure: it emits, and runs nothing. */
export function htmlGraphVerdicts(scenarios: readonly GraphScenario[]): HtmlGraphVerdict[] {
  const react = exportGraphTarget();
  const index = new CatalogIndex(catalog());
  return scenarios.map((sc): HtmlGraphVerdict => {
    const none = { name: sc.name, lifted: new Map<string, string>(), driven: new Map<string, string>() };
    // One harness: a limit the React target names is this target's, in its words. An exporter's verdict there is
    // React's, so it is decided again here, from what the HTML export reads.
    const reactOutside = react.canPlay!(sc);
    if (reactOutside !== undefined && !EXPORTER_VERDICT.test(reactOutside)) return { ...none, outside: reactOutside };
    const driven = drivenInputs(sc);
    const component = graphComponent(sc.nodes, sc.wires ?? [], driven);
    const ir = probeProject(component);
    const plan = planProject(ir, index).plans.find((p) => p.path === component.path)!;
    const refused = plan.notes.filter(REFUSED);
    if (refused.length) return { ...none, outside: `the exporter refused part of the graph: ${refused.join(' | ')}` };
    const app = emitHtmlApp(ir, catalog());
    /** A lifted output's callback → the kind of expression its push reads, which the printer does not print. */
    const unpushed = new Map<string, string>();
    const lost: string[] = [];
    for (const l of app.preflight.htmlLosses) {
      const m = UNPUSHED.exec(l.what);
      if (m) unpushed.set(m[1], m[2]);
      else lost.push(`${l.nodeId}: ${l.what}`);
    }
    if (lost.length) return { ...none, outside: `the HTML printer does not print part of the graph: ${lost.join(' | ')}` };
    const js = app.files[PROBE_FILE];
    if (js === undefined) throw new Error(`${sc.name}: the HTML export wrote no ${PROBE_FILE}`);
    const lifted = new Map<string, string>();
    for (const id of Object.keys(sc.nodes)) {
      for (const o of plan.liftedOutputProps) {
        if (!o.port.startsWith(`${id}_`) || unpushed.has(o.prop)) continue;
        // the printed callback, read off the printed text: a lift the plan holds and the printer never calls is unseen
        if (!js.includes(`given.${o.prop}(`)) continue;
        const port = o.port.slice(id.length + 1);
        if (lifted.has(`${id}.${port}`)) throw new Error(`two lifted outputs read as ${id}.${port}`);
        lifted.set(`${id}.${port}`, o.prop);
      }
    }
    const drivenMap = new Map<string, string>();
    for (const input of driven) {
      const prop = plan.props.find((p) => p.name === input.replace('.', '_'));
      if (prop && js.includes(`keep(inputs[${jsText(prop.name)}])`)) drivenMap.set(input, prop.name);
    }
    const undriven = driven.filter((input) => !drivenMap.has(input));
    if (undriven.length) return { ...none, outside: `the emitted component declares no prop for ${undriven.join(', ')} — the set cannot reach it` };
    if (sc.expect && !hasObservation(projectGraphTrace(sc.expect, reachOf(lifted)))) {
      // Whose edge: had the printer pushed every output the plan lifts, would the scenario observe one? Then it is the
      // printer's verdict, counted apart, never the plan's (the plan's words are React's, and React plays it).
      const planLifted = new Set(plan.liftedOutputProps.filter((o) => Object.keys(sc.nodes).some((id) => o.port.startsWith(`${id}_`))).map((o) => o.port.replace('_', '.')));
      const planReach: GraphReach = { signals: false, outcomes: false, output: (subject, port) => planLifted.has(`${subject}.${port}`) };
      if (unpushed.size > 0 && hasObservation(projectGraphTrace(sc.expect, planReach))) {
        return { ...none, outside: `the HTML printer does not print part of the graph: it pushes none of the outputs this scenario observes (${unpushed.size} read ${[...new Set(unpushed.values())].join(', ')} values, which it does not print yet)` };
      }
      return { ...none, outside: `the exporter lifts none of the outputs this scenario observes (${unpushed.size} not pushed by the HTML printer)` };
    }
    return { name: sc.name, component, plan, files: app.files, lifted, driven: drivenMap };
  });
}

interface HtmlGraph {
  ids: string[];
  /** Each node's type, for the React target's one rename (`asRuntimeHarnessNames`). */
  types: Record<string, string>;
  live: Set<string>;
  window: any;
  container: any;
  probe: { update(next: Record<string, unknown>): void; destroy(): void };
  lifted: string[];
  latest: Record<string, unknown>;
  recorded: Record<string, string>;
  events: Record<string, TraceEvent[]>;
  driven: ReadonlyMap<string, string>;
  /** What the page threw outside any handler of ours (jsdom's report), read at the next settle. */
  errors: string[];
}

interface HtmlGraphHandle extends Handle {
  graph: HtmlGraph;
}

export interface HtmlGraphOptions {
  /** A mutant: the printed text changed before it is joined and run, so the rows can be seen to fail. */
  mutate?: (file: string, text: string) => string;
}

/** Each scenario's probe joined into one script, once per target (esbuild, from the export's own files). */
async function scriptOf(v: HtmlGraphVerdict, cache: Map<string, string>, mutate?: HtmlGraphOptions['mutate']): Promise<string> {
  const hit = cache.get(v.name);
  if (hit !== undefined) return hit;
  const files: Record<string, string> = {};
  for (const [f, text] of Object.entries(v.files!)) files[f] = mutate && f.endsWith('.js') ? mutate(f, text) : text;
  files[ENTRY] = `import { mountProbe } from './${PROBE_FILE}';\nimport { flushSync } from './lib/core.js';\nwindow.__nodegxMountProbe = mountProbe;\nwindow.__nodegxFlush = flushSync;\n`;
  const script = await bundleApp(files, ENTRY);
  cache.set(v.name, script);
  return script;
}

/**
 * The graph target over the HTML export. The runner asks `canPlay` for a scenario and then plays it; `mountGraph` is
 * handed only the nodes and wires, so the scenario `canPlay` was last asked for is the one played (`runGraphScenarios`
 * grades one scenario at a time), as on the Swift target.
 */
export function htmlGraphTarget(verdicts: readonly HtmlGraphVerdict[], options: HtmlGraphOptions = {}): GraphTarget<HtmlGraphHandle> {
  const byName = new Map(verdicts.map((v) => [v.name, v]));
  const scripts = new Map<string, string>();
  let current: HtmlGraphVerdict | undefined;
  let world: World | undefined;
  let live: HtmlGraph | undefined;
  const graphOf = (h: HtmlGraphHandle): HtmlGraph => {
    if (!h.graph.live.has(h.id)) throw new Error(`no live node ${h.id}`);
    return h.graph;
  };
  return {
    name: 'html',
    canPlay(sc) {
      current = byName.get(sc.name);
      if (!current) throw new Error(`no HTML verdict for ${JSON.stringify(sc.name)}`);
      return current.outside;
    },
    graphReach(sc) {
      return reachOf(byName.get(sc.name)!.lifted);
    },
    // The world is the page's: kept here and pointed at in the window `mountGraph` makes, before the printed files run.
    install(w) {
      world = w;
      return () => {
        world = undefined;
      };
    },
    async mountGraph(nodes) {
      const v = current!;
      const script = await scriptOf(v, scripts, options.mutate);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { JSDOM, VirtualConsole } = require('jsdom') as { JSDOM: new (html: string, options?: unknown) => any; VirtualConsole: new () => any };
      const errors: string[] = [];
      const virtualConsole = new VirtualConsole();
      // an uncaught throw in a printed handler is the page's, and the play's failure; console output is the app's own
      virtualConsole.on('jsdomError', (e: Error) => errors.push(e.message));
      const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { url: 'http://localhost/index.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
      const w = dom.window;
      if (world) {
        const clock = world.clock;
        const random = world.random;
        w.Date.now = () => clock.now();
        w.Math.random = () => random.next();
      }
      w.eval(script);
      const g: HtmlGraph = {
        ids: Object.keys(nodes),
        types: Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, n.type])),
        live: new Set(Object.keys(nodes)),
        window: w,
        container: w.document.getElementById('app'),
        probe: undefined as never,
        lifted: [...v.lifted.keys()],
        latest: {},
        recorded: {},
        events: {},
        driven: v.driven,
        errors
      };
      const handles: Record<string, HtmlGraphHandle> = {};
      for (const id of g.ids) {
        g.events[id] = [];
        const params = nodes[id].params ?? {};
        for (const k of Object.keys(params)) {
          const val = params[k];
          g.events[id].push(val === undefined ? { t: 'set', port: k } : { t: 'set', port: k, value: canonicalise(val) });
        }
        handles[id] = { id, type: nodes[id].type, graph: g };
      }
      const inputs: Record<string, unknown> = {};
      for (const [output, prop] of v.lifted) {
        inputs[prop] = (value: unknown) => {
          g.latest[output] = value;
        };
      }
      for (const [input, prop] of v.driven) {
        const { node, port } = parseEndpoint(input);
        const value = nodes[node].params?.[port];
        if (value !== undefined) inputs[prop] = value;
      }
      g.probe = w.__nodegxMountProbe(g.container, inputs);
      w.__nodegxFlush();
      live = g;
      return handles;
    },
    mount() {
      throw new Error('the HTML graph target mounts graphs (mountGraph)');
    },
    set(h, port, value) {
      const g = graphOf(h);
      const prop = g.driven.get(`${h.id}.${port}`);
      if (!prop) throw new Error(`${h.type} on the HTML export has no input driving "${port}" — canPlay admitted a set it cannot reach`);
      g.events[h.id].push(value === undefined ? { t: 'set', port } : { t: 'set', port, value: canonicalise(value) });
      g.probe.update({ [prop]: value });
      g.window.__nodegxFlush();
    },
    signal(h, port) {
      const g = graphOf(h);
      const label = `${h.id}.${port}`;
      const button = ([...g.container.querySelectorAll('button')] as any[]).find((b) => b.textContent === label);
      if (!button) throw new Error(`the printed probe has no <button>${label}</button>`);
      g.events[h.id].push({ t: 'in', port });
      button.dispatchEvent(new g.window.MouseEvent('click', { bubbles: true }));
      g.window.__nodegxFlush();
    },
    async settle() {
      const g = live;
      if (!g) return;
      for (let i = 0; i < 5; i++) await new Promise((r) => g.window.setTimeout(r, 0));
      if (g.errors.length) throw new Error(`the page threw: ${g.errors.join('; ')}`);
      for (const id of g.ids) {
        if (!g.live.has(id)) continue;
        g.events[id].push({ t: 'settle' });
        const ports = g.lifted.filter((o) => o.startsWith(`${id}.`)).map((o) => o.slice(id.length + 1)).sort();
        for (const port of ports) {
          const output = `${id}.${port}`;
          if (!(output in g.latest) || g.latest[output] === undefined) continue;
          const value = canonicalise(asRuntimeHarnessNames(g.types[id], port, g.latest[output], g.latest[`${id}.nodeId`]));
          const k = JSON.stringify(value);
          if (g.recorded[output] === k) continue;
          g.recorded[output] = k;
          g.events[id].push({ t: 'value', port, value });
        }
      }
    },
    trace(h) {
      return h.graph.events[h.id].map((e) => ({ ...e }));
    },
    dispose(h) {
      const g = h.graph;
      if (!g.live.has(h.id)) return;
      g.live.delete(h.id);
      if (g.live.size === 0) {
        g.probe.destroy();
        g.window.close();
        if (live === g) live = undefined;
      }
    }
  };
}
