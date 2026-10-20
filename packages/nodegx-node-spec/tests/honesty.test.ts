/**
 * P111 SEE-001 — the honesty number (`src/honesty.ts`), the one definition every surface imports.
 *
 * The constants are held to the files that decide them, both ways, so the rule cannot drift from phase 107's ledger:
 *   SCRIPT_TYPES       = tiers.json's T6, minus the exempt (CSS Definition); every `contract` spec in the registry is one
 *   EXEMPT_TYPES       = exemptions.json
 *   GRAPH_GRADED_TYPES = the types the N graph scenarios' claims grade, read as spec-ledger.js reads them
 * AC1  over every template, the number equals SEE-000's hand computation (census.json, written by scripts/see/census.js,
 *      which computes the rule on its own from the same files).
 * AC2  a Function planted in a training-template component lowers its number and the project's, by the amount the counts say.
 * AC3  a kit node with no spec is script; a planted spec flips it to known.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  EXEMPT_TYPES,
  GRAPH_GRADED_TYPES,
  SCRIPT_TYPES,
  componentHonesty,
  honestyClassifier,
  honestyLine,
  projectHonesty,
  type HonestyComponent,
  type HonestyNode,
  type HonestyOptions
} from '../src/honesty';
import { specs } from '../src/nodes';

const ROOT = path.join(__dirname, '..', '..', '..');
const P107 = path.join(ROOT, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does');
const CENSUS = path.join(ROOT, 'dev-docs', 'tasks', 'phase-111-you-can-see-what-it-built', 'census.json');
const GRAPH = path.join(__dirname, '..', 'scenarios', 'graph');

const read = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

/** The shapes this spec reads from disk. */
interface CatalogFile {
  nodes: Array<{ typeName: string }>;
}
interface TiersFile {
  nodes: Record<string, { tier: string }>;
}
interface GraphScenario {
  clauses?: string[];
  claims?: Array<{ subject: string }>;
  nodes: Record<string, { type: string; in?: string }>;
  components?: Record<string, unknown>;
}
interface CensusRow {
  name: string;
  known: number;
  script: number;
  unspecced: number;
  instance: number;
  exempt: number;
  percent: number | null;
  percentByLines: number | null;
  scriptLines: number;
}
const sorted = (xs: Iterable<string>) => [...xs].sort();

const coreTypes = read<CatalogFile>(path.join(ROOT, 'packages', 'noodl-types', 'src', 'node-catalog.json')).nodes.map((n) => n.typeName);
const options: HonestyOptions = { coreTypes };

/** A v2 template's components, read from the files (component.json's `path` is the legacy name). */
function templateComponents(dir: string): HonestyComponent[] {
  const out: HonestyComponent[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
    }
    const nodesFile = path.join(d, 'nodes.json');
    if (fs.existsSync(nodesFile)) {
      const meta: { path?: string } = fs.existsSync(path.join(d, 'component.json')) ? read<{ path?: string }>(path.join(d, 'component.json')) : {};
      out.push({ name: meta.path ?? '/' + path.relative(path.join(dir, 'components'), d), nodes: read<{ nodes?: HonestyNode[] }>(nodesFile).nodes ?? [] });
    }
  };
  walk(path.join(dir, 'components'));
  return out;
}

describe('the constants are the ledger\'s, both ways', () => {
  it('SCRIPT_TYPES is tiers.json T6 minus the exempt, and holds every contract spec', () => {
    const tiers = read<TiersFile>(path.join(P107, 'tiers.json')).nodes;
    const exempt = Object.keys(read<Record<string, unknown>>(path.join(P107, 'exemptions.json'))).filter((k) => !k.startsWith('$'));
    expect(sorted(SCRIPT_TYPES)).toEqual(sorted(Object.keys(tiers).filter((t) => tiers[t].tier === 'T6' && !exempt.includes(t))));
    const contracts = Object.keys(specs).filter((t) => typeof (specs[t] as { contract?: unknown }).contract === 'string');
    expect(contracts.length).toBeGreaterThan(0);
    for (const t of contracts) expect(SCRIPT_TYPES).toContain(t);
  });

  it('EXEMPT_TYPES is exemptions.json', () => {
    expect(sorted(EXEMPT_TYPES)).toEqual(sorted(Object.keys(read<Record<string, unknown>>(path.join(P107, 'exemptions.json'))).filter((k) => !k.startsWith('$'))));
  });

  it('GRAPH_GRADED_TYPES is what the N graph scenarios claim, minus the registry\'s own specs', () => {
    const graded = new Set<string>();
    for (const f of fs.readdirSync(GRAPH).filter((x) => x.endsWith('.json'))) {
      for (const sc of read<GraphScenario[]>(path.join(GRAPH, f))) {
        if (!Array.isArray(sc.clauses) || !sc.clauses.includes('N')) continue;
        for (const c of sc.claims ?? []) {
          const node = sc.nodes[c.subject];
          if (node) graded.add(node.type);
          else if (sc.components && sc.components[c.subject]) {
            for (const n of Object.values(sc.nodes)) if (n.type === 'Component Outputs' && n.in === c.subject) graded.add(n.type);
          }
        }
      }
    }
    const byGraphOnly = [...graded].filter((t) => !(t in specs) && !SCRIPT_TYPES.includes(t));
    expect(sorted(GRAPH_GRADED_TYPES)).toEqual(sorted(byGraphOnly));
  });
});

describe('the rule, node by node', () => {
  const classify = honestyClassifier({ coreTypes: ['Group', 'Page', 'Counter', 'JavaScriptFunction', 'Expression', 'CSS Definition'] });
  it.each([
    ['Counter', 'known'], // a registry spec
    ['Component Outputs', 'known'], // graded by the graph
    ['JavaScriptFunction', 'script'], // a contract spec is script, not known
    ['Expression', 'script'], // T6, though it has a spec
    ['game-kit.Sound', 'script'], // a kit type with no spec
    ['Page', 'unspecced'], // shipped, no spec yet
    ['CSS Definition', 'exempt'],
    ['/Components/Card', 'instance'],
    ['#__cloud__/x', 'instance']
  ])('%s is %s', (type, cls) => expect(classify(type)).toBe(cls));

  it('AC3: a kit node with no spec is script; a planted spec flips it to known, in the component\'s number', () => {
    const c: HonestyComponent = { name: '/Game', nodes: [{ id: 'a', type: 'Counter' }, { id: 'b', type: 'game-kit.Sound', label: 'Beep' }] };
    const before = componentHonesty(c, options);
    expect({ known: before.known, script: before.script, percent: before.percent, kit: before.scriptParts.map((p) => p.kit) }).toEqual({ known: 1, script: 1, percent: 50, kit: [true] });
    const planted = componentHonesty(c, { ...options, specs: { ...specs, 'game-kit.Sound': {} } });
    expect({ known: planted.known, script: planted.script, percent: planted.percent }).toEqual({ known: 2, script: 0, percent: 100 });
  });

  it('a planted CONTRACT spec does not make a node known: what conforms is the contract, not the node', () => {
    const c: HonestyComponent = { name: '/Game', nodes: [{ id: 'b', type: 'game-kit.Script' }] };
    const h = componentHonesty(c, { ...options, specs: { ...specs, 'game-kit.Script': { contract: 'the person writes the code' } } });
    expect({ known: h.known, script: h.script }).toEqual({ known: 0, script: 1 });
  });

  it('a component with neither known nor script nodes has no number, not 0% or 100%', () => {
    const h = componentHonesty({ name: '/X', nodes: [{ id: 'p', type: 'Page' }, { id: 'i', type: '/Y' }] }, options);
    expect({ percent: h.percent, unspecced: h.unspecced, instances: h.instances }).toEqual({ percent: null, unspecced: 1, instances: 1 });
    expect(honestyLine(h)).toBe('no known or script nodes (1 unspecced)');
  });

  it('the line names the script parts, largest first, and says how many it left out', () => {
    const nodes = [
      { id: 'k', type: 'Counter' },
      { id: 'f1', type: 'JavaScriptFunction', label: 'Small', parameters: { functionScript: 'a' } },
      { id: 'f2', type: 'JavaScriptFunction', label: 'Big', parameters: { functionScript: 'a\nb\nc' } },
      { id: 'e', type: 'Expression', parameters: { expression: 'x+1' } }
    ];
    const h = componentHonesty({ name: '/C', nodes }, options);
    expect(honestyLine(h, 2)).toBe('25% known (1 known, 3 script); script: `Big`, `Small` +1 more');
    expect(honestyLine(h, 0)).toBe('25% known (1 known, 3 script)');
    expect(h.scriptLines).toBe(5);
    expect(h.percentByLines).toBe(16.7); // 1 ÷ (1 + 3 + 1 + 1)
  });
});

describe('AC1 — the number equals SEE-000\'s hand computation on every template', () => {
  const census = read<{ projects: CensusRow[] }>(CENSUS);
  it.each(census.projects.map((p): [string, CensusRow] => [p.name, p]))('%s', (name, r) => {
    const h = projectHonesty(templateComponents(path.join(ROOT, 'templates', name)), options);
    expect({ known: h.known, script: h.script, unspecced: h.unspecced, instances: h.instances, exempt: h.exempt, percent: h.percent, byLines: h.percentByLines, lines: h.scriptLines }).toEqual({
      known: r.known,
      script: r.script,
      unspecced: r.unspecced,
      instances: r.instance,
      exempt: r.exempt,
      percent: r.percent,
      byLines: r.percentByLines,
      lines: r.scriptLines
    });
  });
});

describe('AC2 — a planted Function lowers the component\'s number and the project\'s', () => {
  it('in the training template\'s Logic/Standing', () => {
    const components = templateComponents(path.join(ROOT, 'templates', 'digital-bricks-training'));
    const before = projectHonesty(components, options);
    const target = components.findIndex((c) => c.name === '/Logic/Standing');
    expect(target).toBeGreaterThanOrEqual(0);
    const planted = components.map((c, i) => (i === target ? { ...c, nodes: [...c.nodes, { id: 'planted', type: 'JavaScriptFunction', label: 'Planted' }] } : c));
    const after = projectHonesty(planted, options);
    const cb = before.components[target];
    const ca = after.components[target];
    expect({ script: ca.script - cb.script, known: ca.known - cb.known }).toEqual({ script: 1, known: 0 });
    expect(ca.percent!).toBeLessThan(cb.percent!);
    expect(ca.percent).toBe(Math.round((1000 * cb.known) / (cb.known + cb.script + 1)) / 10);
    expect(after.percent).toBe(Math.round((1000 * before.known) / (before.known + before.script + 1)) / 10);
    expect(after.percent!).toBeLessThan(before.percent!);
    expect(ca.scriptParts.map((p) => p.label)).toContain('Planted');
  });
});
