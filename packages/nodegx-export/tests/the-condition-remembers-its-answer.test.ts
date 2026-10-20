import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { planProject } from '../src/analyze/plan';
import { emitApp, EmittedApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * EXP-011 §87, P18-S120-SNAPCOND — a Condition with its box unticked, Evaluate wired, and its Is True / Is False into a
 * drawn element's Mounted or Visible. The shipped templates' idiom for "show the confirmation after Send, the refusal
 * after a Failure": 36 such Conditions in 11 components (the Site Builder's contact form, eight members-area pages),
 * 122 in the corpus. HEAD refused every one ("its value outputs are snapshots of the last Evaluate"), and with them the
 * call and the Function in front.
 *
 * Measured on the runtime's own Condition (`s120-snapcond/condprobe.js`): before the first Evaluate the wire hands the
 * sink `null`, over whatever is authored, and both setters read it as false; each Evaluate sends its answer again, the
 * same answer included; two Conditions on one sink are last-pulse-wins. The export holds one boolean cell per sink port,
 * false at first, and each Evaluate writes its answer into it in the sending chain.
 *
 * §A the export against the runtime's OWN Condition and Switch running the same fixture page
 * (`helpers/runtime-condition-arm.js`), press by press, and a control: HEAD's export (the wires dropped) disagrees.
 * §B what is emitted. §C the refusals. §D a Condition that has arms as well as cells.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'gate-desk');
const HOME_DIR = path.join(FIXTURE, 'components', 'Pages', 'Home');
const PAGE = 'src/pages/Home.tsx';
const catalog: Catalog = loadCatalog();

interface RawNode {
  id: string;
  type: string;
  label?: string;
  parameters: Record<string, unknown>;
  [k: string]: unknown;
}
interface RawWire {
  fromId: string;
  fromProperty: string;
  toId: string;
  toProperty: string;
}
interface Graph {
  nodes: RawNode[];
  connections: RawWire[];
  /** Set only by a §C row: the page's declared visual roots, so a node outside them is not drawn. */
  visualRoots?: string[];
}
const baseGraph: Graph = {
  nodes: JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'nodes.json'), 'utf-8')).nodes,
  connections: JSON.parse(fs.readFileSync(path.join(HOME_DIR, 'connections.json'), 'utf-8')).connections
};

/** The fixture with its page's nodes and wires edited, written to a temporary copy: both arms read the same graph. */
const fixtureWith = (edit?: (g: Graph) => void): { dir: string; graph: Graph } => {
  const graph: Graph = structuredClone(baseGraph);
  edit?.(graph);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-desk-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const home = path.join(dir, 'components', 'Pages', 'Home');
  const nodesDoc = JSON.parse(fs.readFileSync(path.join(home, 'nodes.json'), 'utf-8'));
  const wiresDoc = JSON.parse(fs.readFileSync(path.join(home, 'connections.json'), 'utf-8'));
  const roots = graph.visualRoots === undefined ? {} : { visualRoots: graph.visualRoots };
  fs.writeFileSync(path.join(home, 'nodes.json'), JSON.stringify({ ...nodesDoc, nodes: graph.nodes, ...roots }, null, 2));
  fs.writeFileSync(path.join(home, 'connections.json'), JSON.stringify({ ...wiresDoc, connections: graph.connections }, null, 2));
  return { dir, graph };
};
const emitDir = (dir: string): EmittedApp => emitApp(parseProject(dir, catalog), catalog);
const dispositionsOf = (dir: string) => planProject(parseProject(dir, catalog), new CatalogIndex(catalog)).byLegacyPath.get('/Pages/Home')!.dispositions;
const nodeOf = (g: Graph, id: string): RawNode => g.nodes.find((n) => n.id === id)!;

// ---- the two arms -----------------------------------------------------------------------------------------------

type Reading = Record<string, { mounted: boolean; visible: boolean }>;

const runtimeArm = (cases: Array<{ graph: Graph; scenarios: string[][] }>): Reading[][][] =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, 'helpers', 'runtime-condition-arm.js')], {
      input: JSON.stringify(cases.map(({ graph, scenarios }) => ({ ...graph, scenarios }))),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024
    })
  );

/** A rendered element as the stand-in `jsx` builds it; the arm reads its children, its class and a button's press. */
interface Element {
  type: unknown;
  props: { children?: unknown; className?: unknown; onClick?: () => void; [prop: string]: unknown };
}
const childrenOf = (el: Element): unknown[] => {
  const c = el.props.children;
  return c === undefined ? [] : Array.isArray(c) ? c.flat(Infinity) : [c];
};
const walk = (node: unknown, visit: (el: Element) => void): void => {
  if (node === null || typeof node !== 'object') return;
  const el = node as Element;
  visit(el);
  for (const child of childrenOf(el)) walk(child, visit);
};
const textOf = (el: Element): string => childrenOf(el).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : c && typeof c === 'object' ? textOf(c as Element) : '')).join('');

/**
 * The export's arm: the emitted page, transpiled as the app's bundler transpiles it, rendered by a stand-in for React's
 * hooks (each `useState` a slot, a setter writing the slot, a press rendering again). A Text is mounted when its element
 * is in the tree, and visible unless it wears the hidden class.
 */
const exportArm = (app: EmittedApp, graph: Graph, scenarios: string[][]): Reading[][] => {
  const js = ts.transpileModule(app.files[PAGE], {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const texts = graph.nodes.filter((n) => n.type === 'Text').map((n) => ({ id: n.id, text: String(n.parameters.text) }));
  const labels = new Map(graph.nodes.filter((n) => n.type === 'net.noodl.controls.button').map((n) => [n.id, String(n.parameters.label)]));
  return scenarios.map((presses) => {
    const slots: unknown[] = [];
    let cursor = 0;
    const react = {
      useState: (init: unknown) => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = typeof init === 'function' ? (init as () => unknown)() : init;
        return [slots[i], (v: unknown) => (slots[i] = typeof v === 'function' ? (v as (p: unknown) => unknown)(slots[i]) : v)];
      }
    };
    const jsx = (type: unknown, props: Element['props']): Element => ({ type, props });
    const modules: Record<string, unknown> = { react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' } };
    const exports: Record<string, unknown> = {};
    const requireStub = (m: string) => {
      if (m in modules) return modules[m];
      if (m.endsWith('.module.css')) return { default: new Proxy({}, { get: (_t, k) => String(k) }), __esModule: true };
      throw new Error(`the page imports ${m}, which this arm does not stand in for`);
    };
    new Function('require', 'exports', js)(requireStub, exports);
    const render = (): Element => {
      cursor = 0;
      return (exports.HomePage as (props: object) => Element)({});
    };
    const read = (tree: Element): Reading => {
      const out: Reading = {};
      for (const t of texts) {
        let found: Element | undefined;
        walk(tree, (el) => {
          if (found === undefined && el.type === 'p' && textOf(el) === t.text) found = el;
        });
        out[t.id] = { mounted: found !== undefined, visible: found === undefined || !String(found.props.className ?? '').includes('hiddenKeepSpace') };
        // An unmounted element is not drawn at all; the runtime stand-in still holds its Visible, so read that from the cell's absence.
      }
      return out;
    };
    let tree = render();
    const readings = [read(tree)];
    for (const id of presses) {
      let button: Element | undefined;
      walk(tree, (el) => {
        if (button === undefined && el.type === 'button' && textOf(el) === labels.get(id)) button = el;
      });
      if (button === undefined) throw new Error(`no button "${labels.get(id)}" on the emitted page`);
      button.props.onClick!();
      tree = render();
      readings.push(read(tree));
    }
    return readings;
  });
};

/**
 * The export arm, run while the suite is collected: a page that cannot be pressed (a handler missing) is that row's
 * failure, not the suite's, or a defect would read as "0 total".
 */
const exportArmOrError = (app: EmittedApp, graph: Graph, scenarios: string[][]): Reading[][] | Error => {
  try {
    return exportArm(app, graph, scenarios);
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
};
const readingsOf = (arm: Reading[][] | Error): Reading[][] => {
  if (arm instanceof Error) throw arm;
  return arm;
};

/** A Text's Visible cannot be read off an element that is not there; both arms are compared on what a person sees. */
const seen = (readings: Reading[][]): Array<Array<Record<string, string>>> =>
  readings.map((scenario) =>
    scenario.map((r) => Object.fromEntries(Object.entries(r).map(([id, s]) => [id, !s.mounted ? 'absent' : s.visible ? 'shown' : 'hidden'])))
  );

/** HEAD's export: every value wire from these Conditions dropped, so each Text keeps what is authored, for good. */
const headArm = (graph: Graph, scenarios: string[][]): Reading[][] => {
  const fixed: Reading = Object.fromEntries(
    graph.nodes
      .filter((n) => n.type === 'Text')
      .map((n) => [n.id, { mounted: n.parameters.mounted !== false, visible: n.parameters.visible !== false }])
  );
  return scenarios.map((presses) => [fixed, ...presses.map(() => fixed)]);
};

// ---- §A ---------------------------------------------------------------------------------------------------------

const SCENARIOS: Record<string, string[]> = {
  'load only': [],
  'show, hide, show, both, show: one sink, two Conditions, the last pulse wins': ['showBtn', 'hideBtn', 'showBtn', 'bothBtn', 'showBtn'],
  'hide twice, then show: the same answer twice is sent twice': ['hideBtn', 'hideBtn', 'showBtn'],
  'both twice': ['bothBtn', 'bothBtn'],
  'flip, check, flip, check: a wired condition is read at the Evaluate, not followed': ['flipBtn', 'checkBtn', 'flipBtn', 'checkBtn'],
  'check before any flip, then flip without checking': ['checkBtn', 'flipBtn', 'showBtn']
};
const VARIANTS: Record<string, (g: Graph) => void> = {
  'the fixture': () => undefined,
  // The runtime hands the sink null at load over an authored true: the element starts hidden all the same.
  'It went authored Mounted true': (g) => {
    nodeOf(g, 'sentText').parameters.mounted = true;
  },
  'Put it away is an Is False of a true Condition': (g) => {
    nodeOf(g, 'hideGate').parameters.condition = true;
    g.connections = g.connections.map((c) => (c.fromId === 'hideGate' && c.fromProperty === 'result' ? { ...c, fromProperty: 'isfalse' } : c));
  },
  'Show also sends Check, after Say it went': (g) => {
    g.connections.push({ fromId: 'showBtn', fromProperty: 'onClick', toId: 'liveGate', toProperty: 'eval' });
  }
};

describe('§A the exported page against the runtime, press by press', () => {
  const variants = Object.entries(VARIANTS).map(([name, edit]) => ({ name, ...fixtureWith(edit) }));
  const scenarios = Object.values(SCENARIOS);
  const runtime = runtimeArm(variants.map((v) => ({ graph: v.graph, scenarios })));

  it('the runtime arm reads what the probe measured: hidden at load, the last pulse wins, the switch read at Check', () => {
    const [load, showHide, , , flips] = runtime[0];
    expect(seen([load])[0][0]).toEqual({ sentText: 'absent', noteText: 'hidden', liveText: 'absent' });
    expect(seen([showHide])[0].map((r) => r.sentText)).toEqual(['absent', 'shown', 'absent', 'shown', 'absent', 'shown']);
    expect(seen([flips])[0].map((r) => r.liveText)).toEqual(['absent', 'absent', 'shown', 'shown', 'absent']);
  });

  variants.forEach((variant, vi) => {
    const app = emitDir(variant.dir);
    const exported = exportArmOrError(app, variant.graph, scenarios);
    Object.keys(SCENARIOS).forEach((name, si) => {
      it(`${variant.name}: ${name}`, () => {
        expect(seen([readingsOf(exported)[si]])).toEqual(seen([runtime[vi][si]]));
      });
    });
  });

  it("control: HEAD's export (the wires dropped) disagrees with the runtime on the fixture", () => {
    const head = headArm(variants[0].graph, scenarios);
    const disagreements = Object.keys(SCENARIOS).filter((_n, si) => JSON.stringify(seen([head[si]])) !== JSON.stringify(seen([runtime[0][si]])));
    // At load the Visible-only Text differs (HEAD shows "Not yet"); every scenario has that row.
    expect(disagreements).toEqual(Object.keys(SCENARIOS));
  });
});

// ---- §B ---------------------------------------------------------------------------------------------------------

describe('§B what the fixture emits', () => {
  const { dir } = fixtureWith();
  const app = emitDir(dir);
  const page = app.files[PAGE];

  it('one boolean cell per sink port, false at first, named for the element', () => {
    expect(page).toContain('const [itWentMounted, setItWentMounted] = useState<boolean>(false);');
    expect(page).toContain('const [notYetVisible, setNotYetVisible] = useState<boolean>(false);');
    expect(page).toContain('const [theSwitchWasOnMounted, setTheSwitchWasOnMounted] = useState<boolean>(false);');
    expect(page.match(/useState<boolean>\(false\)/g)).toHaveLength(4); // the three cells and the Switch
  });

  it('a literal Condition writes its answer without an if; two sinks are two statements; Both is the two in wire order', () => {
    expect(page).toContain('<button onClick={() => { setItWentMounted(true); setNotYetVisible(false); }}>Show</button>');
    expect(page).toContain('<button onClick={() => setItWentMounted(false)}>Hide</button>');
    expect(page).toContain('onClick={() => { setItWentMounted(true); setNotYetVisible(false); setItWentMounted(false); }}');
    expect(page).not.toContain('if (true)');
  });

  it('a wired condition is read at the press', () => {
    expect(page).toContain('if (theSwitch) setTheSwitchWasOnMounted(true); else setTheSwitchWasOnMounted(false);');
  });

  it('Mounted draws the element only while its cell holds; Visible keeps the space', () => {
    expect(page).toMatch(/\{itWentMounted && \(\s*<p className=\{styles\.text\}>It went<\/p>\s*\)\}/);
    expect(page).toContain('<p className={joinClasses(styles.text, !notYetVisible && styles.hiddenKeepSpace)}>Not yet</p>');
  });

  it('nothing on the page is reported, and every Condition collapses', () => {
    expect(app.notes.filter((n) => n.startsWith('Pages/Home'))).toEqual([]);
    const d = dispositionsOf(dir);
    for (const id of ['showGate', 'hideGate', 'liveGate', 'flip']) expect(d[id]?.kind).toBe('collapsed');
  });

  it('the emitted app typechecks', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});

// ---- §C ---------------------------------------------------------------------------------------------------------

describe('§C refused by name', () => {
  it('a snapshot into a Text\'s text: that Condition, and the one sharing its sink, refuse with the reason', () => {
    const { dir } = fixtureWith((g) => g.connections.push({ fromId: 'showGate', fromProperty: 'result', toId: 'noteText', toProperty: 'text' }));
    const d = dispositionsOf(dir);
    expect(d.showGate).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: 'its result feeds Text.text — a snapshot of the last Evaluate lands only in a Mounted or a Visible in this slice'
    });
    expect(d.hideGate).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: 'sentText.mounted is also written by Condition showGate, which does not translate here — the runtime shows whichever wrote last'
    });
    // The one on its own sink is untouched.
    expect(d.liveGate.kind).toBe('collapsed');
    const page = emitDir(dir).files[PAGE];
    expect(page).not.toContain('itWentMounted');
    expect(page).toContain('setTheSwitchWasOnMounted');
  });

  it('a sink also fed by something else (a Switch): both Conditions on it refuse, and the Switch binds nothing there', () => {
    const { dir } = fixtureWith((g) => g.connections.push({ fromId: 'flip', fromProperty: 'state', toId: 'sentText', toProperty: 'mounted' }));
    const d = dispositionsOf(dir);
    const reason = 'sentText.mounted is also fed by Switch.state, which is not an Evaluate snapshot this slice carries — the runtime shows whichever wrote last';
    expect(d.showGate).toEqual({ kind: 'deferred', to: 'EXP-003', reason });
    expect(d.hideGate).toEqual({ kind: 'deferred', to: 'EXP-003', reason });
  });

  it('a ticked Condition with Evaluate wired keeps its own refusal (it re-tests on change as well)', () => {
    const { dir } = fixtureWith((g) => {
      nodeOf(g, 'liveGate').parameters['runOnChange-condition'] = true;
    });
    expect(dispositionsOf(dir).liveGate).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason:
        'Condition re-tests on every change of its input *and* on Evaluate (Run On Value Change is ticked) — the two fire independently, which neither a handler nor an effect reproduces alone'
    });
    // No cell: nothing would ever write it.
    expect(emitDir(dir).files[PAGE]).not.toContain('theSwitchWasOnMounted');
  });

  it('a snapshot into an element the export does not draw: refused, and its drawn sink with it', () => {
    const { dir } = fixtureWith((g) => {
      g.nodes.push({ id: 'ghost', type: 'Text', label: 'Outside the page', parameters: { text: 'Outside the page' } });
      g.connections.push({ fromId: 'liveGate', fromProperty: 'result', toId: 'ghost', toProperty: 'mounted' });
      g.visualRoots = ['page'];
    });
    expect(dispositionsOf(dir).liveGate).toEqual({
      kind: 'deferred',
      to: 'EXP-003',
      reason: "its result feeds an element that is not drawn — a snapshot lands only in a drawn element's Mounted or Visible in this slice"
    });
    expect(emitDir(dir).files[PAGE]).not.toContain('theSwitchWasOnMounted');
  });

  it('an unticked Condition nothing evaluates is not a snapshot this slice takes (its outputs stay null)', () => {
    const { dir } = fixtureWith((g) => {
      g.connections = g.connections.filter((c) => !(c.toId === 'liveGate' && c.toProperty === 'eval'));
    });
    const app = emitDir(dir);
    expect(dispositionsOf(dir).liveGate.kind).toBe('deferred');
    expect(app.notes).toContain(
      'Pages/Home: wire liveGate:result->liveText:mounted dropped: its value outputs are snapshots of the last Evaluate (Run On Value Change is unticked) — only a live comparator translates in this slice'
    );
  });
});

// ---- §D ---------------------------------------------------------------------------------------------------------

describe('§D a Condition with arms as well as cells', () => {
  const edit = (g: Graph) => {
    // Show's Condition also turns the Switch on from On True; Check then reads it.
    g.connections.push({ fromId: 'showGate', fromProperty: 'ontrue', toId: 'flip', toProperty: 'on' });
    // Check's Condition (wired) also flips the Switch back from On True.
    g.connections.push({ fromId: 'liveGate', fromProperty: 'ontrue', toId: 'flip', toProperty: 'off' });
  };
  const { dir, graph } = fixtureWith(edit);
  const app = emitDir(dir);
  const scenarios = [['showBtn', 'checkBtn', 'checkBtn'], ['flipBtn', 'checkBtn', 'checkBtn', 'bothBtn', 'checkBtn']];
  const runtime = runtimeArm([{ graph, scenarios }])[0];
  const exported = exportArmOrError(app, graph, scenarios);

  scenarios.forEach((s, si) => {
    it(`${s.join(', ')}`, () => {
      expect(seen([readingsOf(exported)[si]])).toEqual(seen([runtime[si]]));
    });
  });

  it('the cells are written before the arm; the literal side is flat, the wired one a branch', () => {
    const page = app.files[PAGE];
    expect(page).toContain('{ setItWentMounted(true); setNotYetVisible(false); setTheSwitch(true); }');
    expect(page).toMatch(/if \(theSwitch\) \{ setTheSwitchWasOnMounted\(true\); setTheSwitch\(false\); \} else setTheSwitchWasOnMounted\(false\);/);
    expect(typecheckEmittedApp(app)).toEqual([]);
  });
});
