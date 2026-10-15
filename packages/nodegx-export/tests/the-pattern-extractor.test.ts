import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

import { Catalog, CatalogIndex, loadCatalog } from '../src/catalog';
import { ComponentPlan, PATTERN_VALUE_OUTPUTS, planProject } from '../src/analyze/plan';
import { emitApp } from '../src/emit/emitApp';
import { summarizePreflight } from '../src/emit/preflight';
import { CRYPTO_LIB_PATH, cryptoLibSource } from '../src/emit/cryptoLib';
import { PATTERN_LIB_PATH, patternLibSource } from '../src/emit/patternLib';
import { exportBadgeOf, ledgerEntryOf } from '../src/ledger';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';
import { ComponentIR, ConnectionIR, ExportIR, NodeIR, ParamValue } from '../src/ir/types';

/**
 * EXP-011 §76 — `Pattern Extractor` (`net.noodl.PatternExtractor`): `Hash`'s crypto-call shape (§59) widened
 * to seven value outputs and a third signal pair. The first of the eight rows Richard's 2026-09-26 ruling made
 * targets ("If we had 100% coverage that would be a big deal").
 *
 * Built on `tests/fixtures/pattern-desk`: a text input feeds a Variable that feeds the extractor's Text; a
 * button fires Extract over an authored `(\d+)%`; Match, First Group, Match Count and Error are four Texts;
 * Matches feeds a For Each; Found and Not Found each remember a word in a Variable; Done writes the Match
 * Count into another. Every refused shape lives here by mutation (§52.4.2's rule) and asserts the NAMED
 * sentence.
 *
 * §A the fixture whole · §B the lib against the runtime's own `extractPattern` (a differential, not a
 * reading) · §C the shapes a wire changes · §D the refusals · §E what building it found · §F the ledger
 * and the controls.
 */

const FIXTURE = path.join(__dirname, 'fixtures', 'pattern-desk');
const RUNTIME_SRC = path.join(__dirname, '..', '..', 'noodl-runtime', 'src');
const catalog: Catalog = loadCatalog();
const index = new CatalogIndex(catalog);
const baseIr = parseProject(FIXTURE, catalog);
const app = emitApp(baseIr, catalog);
const project = planProject(baseIr, index);

const HOME = 'Pages/Home';
const HOME_FILE = 'src/pages/Home.tsx';

const cloneIr = (): ExportIR => structuredClone(baseIr);
const componentOf = (source: ExportIR, componentPath: string): ComponentIR => source.components.find((c) => c.path === componentPath)!;
const nodeOf = (source: ExportIR, componentPath: string, id: string): NodeIR => componentOf(source, componentPath).nodes.find((n) => n.id === id)!;
const planOf = (source: ExportIR, componentPath: string): ComponentPlan => planProject(source, index).plans.find((p) => p.path === componentPath)!;
const setParam = (node: NodeIR, name: string, value: ParamValue) => {
  const existing = node.parameters.find((p) => p.name === name);
  if (existing) existing.value = value;
  else {
    node.parameters.push({ name, value });
    node.parameters.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }
};
const dropParam = (node: NodeIR, name: string) => {
  node.parameters = node.parameters.filter((p) => p.name !== name);
};
const connect = (component: ComponentIR, fromId: string, fromProperty: string, toId: string, toProperty: string, kind: ConnectionIR['kind'] = 'signal') => {
  component.connections.push({ key: `${fromId}:${fromProperty}->${toId}:${toProperty}`, fromId, fromProperty, toId, toProperty, kind });
};
const disconnect = (component: ComponentIR, predicate: (c: ConnectionIR) => boolean) => {
  component.connections = component.connections.filter((c) => !predicate(c));
};
const addNode = (component: ComponentIR, node: Partial<NodeIR> & { id: string; type: string }): NodeIR => {
  const full: NodeIR = { catalogRef: node.type, parameters: [], declaredPorts: [], portKnowledge: 'complete', ...node } as NodeIR;
  component.nodes.push(full);
  return full;
};
const home = (a: { files: Record<string, string> }): string => a.files[HOME_FILE];
const refusalOf = (source: ExportIR, nodeId: string): string | undefined => planOf(source, HOME).refusals.find((r) => r.nodeId === nodeId)?.reason;
/** The fixture with every wire off the extractor's Extract-side removed except the ones `keep` names, and a Text reading `port`. */
const mutated = (change: (h: ComponentIR, ir: ExportIR) => void): ExportIR => {
  const ir = cloneIr();
  change(componentOf(ir, HOME), ir);
  return ir;
};

const RAISE =
  "raiseAppError({ code: 'pattern-extractor/extract-failed', message: percentResult.error, nodeId: 'percent', nodeType: 'net.noodl.PatternExtractor', componentName: '/Pages/Home' });";

// ---------------------------------------------------------------------------------------------------
describe('§A the fixture, whole — a Variable → Extract on a button, four Texts, a For Each, two result chains, a Done chain', () => {
  const homePlan = project.plans.find((p) => p.path === HOME)!;

  test('A1 nothing refused: the only note is the router shell, 17 files, the pattern lib among them and NOT the crypto lib', () => {
    expect(app.notes).toEqual(['App: router shell — emitted as src/App.tsx by the scaffold']);
    expect(homePlan.refusals).toEqual([]);
    expect(summarizePreflight(app).refusals).toBe(0);
    expect(summarizePreflight(app).whole).toEqual(['Components/MatchRow', 'Pages/Home']);
    expect(Object.keys(app.files)).toHaveLength(17);
    expect(app.files[PATTERN_LIB_PATH]).toContain('export function tryExtract(');
    expect(app.files[CRYPTO_LIB_PATH]).toBeUndefined();
    expect(home(app)).not.toContain('TODO(export)');
    expect(homePlan.dispositions['percent']).toEqual({ kind: 'collapsed', into: HOME_FILE });
  });

  test('A2 the emitted app typechecks as a real program', () => {
    expect(typecheckEmittedApp(app)).toEqual([]);
  });

  test('A3 every emitted file parses', () => {
    for (const [name, source] of Object.entries(app.files)) {
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const parsed = ts.createSourceFile(name, source, ts.ScriptTarget.ES2022, true, name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const diagnostics = (parsed as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics;
      expect(diagnostics.map((d) => `${name}: ${d.messageText}`)).toEqual([]);
    }
  });

  test('A4 the imports, and the rows — one per value output READ outside the chain, each seeded, none `| undefined`', () => {
    const src = home(app);
    expect(src).toContain("import { tryExtract } from '../lib/pattern';");
    expect(src).toContain("import { raiseAppError } from '../lib/errors';");
    expect(src).not.toContain("from '../lib/crypto'");
    expect(src).toContain("const [percentMatch, setPercentMatch] = useState<string>('');");
    expect(src).toContain('const [percentMatches, setPercentMatches] = useState<string[]>([]);');
    expect(src).toContain("const [percentFirstGroup, setPercentFirstGroup] = useState<string>('');");
    expect(src).toContain('const [percentMatchCount, setPercentMatchCount] = useState<number>(0);');
    expect(src).toContain("const [percentError, setPercentError] = useState<string>('');");
    // Groups and Named Groups are read by nothing: no row, no setter (§14.2's rule, one family over).
    expect(src).not.toContain('percentGroups');
    expect(src).not.toContain('percentNamedGroups');
    expect(src).not.toContain('| undefined>');
    expect(src.indexOf("from '../lib/pattern'")).toBeLessThan(src.indexOf('export function HomePage'));
  });

  test("A5 the button: synchronous, the Variable read live, every row written BEFORE the arms, Found/Not Found INSIDE the Done arm ahead of the Done chain, the raise in the Failure arm — doExtract's order", () => {
    expect(home(app)).toContain(
      [
        '        onClick={() => {',
        '          const percentResult = tryExtract(status.get(), "(\\\\d+)%");',
        '          setPercentMatch(percentResult.match);',
        '          setPercentMatches(percentResult.matches);',
        '          setPercentFirstGroup(percentResult.firstGroup);',
        '          setPercentMatchCount(percentResult.matchCount);',
        '          setPercentError(percentResult.error);',
        '          if (percentResult.ok) {',
        '            if (percentResult.found) {',
        "              verdict.set('found');",
        '            } else {',
        "              verdict.set('missed');",
        '            }',
        '            runs.set(percentResult.matchCount);',
        '          } else {',
        `            ${RAISE}`,
        '          }',
        '        }}'
      ].join('\n')
    );
    expect(home(app)).not.toContain('await tryExtract');
  });

  test('A6 the bindings: no fold on any seeded row (`{percentMatch}`, `{percentError}` — not `?? \'\'`), the count bare, the For Each over Matches keyed by index', () => {
    const src = home(app);
    expect(src).toContain('{percentMatch}</p>');
    expect(src).toContain('{percentFirstGroup}</p>');
    expect(src).toContain('{percentMatchCount}</p>');
    expect(src).toContain('{percentError}</p>');
    expect(src).not.toContain("percentError ?? ''");
    expect(src).not.toContain("percentMatch ?? ''");
    expect(src).toContain('{(percentMatches ?? []).map((item, index) => (');
    expect(src).toContain('<MatchRow key={index} />');
    expect(project.plans.find((p) => p.path === HOME)!.repeaters['hits'].itemsExpr).toEqual({ kind: 'crypto-out', nodeId: 'percent', node: 'pattern', field: 'matches', viaState: 'percentMatches' });
  });

  test('A7 the ledger row moved, so the picker card carries no badge; the floor is 123', () => {
    expect(ledgerEntryOf('net.noodl.PatternExtractor')?.status).toBe('translated');
    expect(exportBadgeOf('net.noodl.PatternExtractor')).toBeUndefined();
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-ledger.json'), 'utf8'));
    expect(ledger.pickerCoverageFloor).toBe(125); // EXP-011 §77 Action Dispatcher + Handler (session 106) on top of §76 Pattern Extractor (session 101) on top of §75 the four parsers (session 100)
    expect(ledger.pickerCoverageTotal).toBe(130);
  });
});

// ---------------------------------------------------------------------------------------------------
// §B — the lib under node against the runtime's OWN `extractPattern` (loaded from noodl-runtime/src), plus
// the node's setters and getters applied by hand on the runtime side. A differential over a grid, not a
// reading: every cell's nine fields must agree.
// ---------------------------------------------------------------------------------------------------
type ExtractResult = {
  ok: boolean;
  error: string;
  found: boolean;
  match: string;
  matches: string[];
  groups: string[];
  firstGroup: string;
  namedGroups: Record<string, string>;
  matchCount: number;
};
type PatternLib = { tryExtract: (text?: unknown, pattern?: unknown, flags?: unknown, extractAll?: unknown) => ExtractResult };
type RuntimeParsers = {
  extractPattern: (text: string, pattern: string, options?: { all?: boolean; flags?: string }) => {
    ok: boolean;
    error?: string;
    match: string | null;
    matches: string[];
    groups: string[];
    namedGroups: Record<string, string>;
  };
};
const loadModule = <T>(source: string): T => {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} as T };
  // eslint-disable-next-line no-new-func
  new Function('require', 'module', 'exports', js)(() => ({}), module, module.exports);
  return module.exports;
};
const lib = loadModule<PatternLib>(patternLibSource());
const runtime = loadModule<RuntimeParsers>(fs.readFileSync(path.join(RUNTIME_SRC, 'nodes', 'std-library', 'agent', 'stream-parsers.ts'), 'utf8'));
/** pattern-extractor.ts: the three text setters, the boolean setter, `doExtract`'s writes and the seven getters. */
const runtimeNode = (text: unknown, pattern: unknown, flags: unknown, extractAll: unknown): ExtractResult => {
  const asText = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
  const r = runtime.extractPattern(asText(text), asText(pattern), { all: !!extractAll, flags: asText(flags) });
  return {
    ok: r.ok,
    error: r.ok ? '' : r.error || 'Invalid pattern',
    found: r.match !== null,
    match: r.match === null ? '' : r.match,
    matches: r.matches,
    groups: r.groups,
    firstGroup: r.groups.length > 0 ? r.groups[0] : '',
    namedGroups: r.namedGroups,
    matchCount: r.matches.length
  };
};

describe('§B tryExtract against the runtime — a differential over a grid', () => {
  const TEXTS: unknown[] = [
    'Processing... 45% complete',
    'Step 1 of 3, 33% — then 66% — then 100%',
    'no digits here',
    '',
    'line one\nline two\nLINE THREE',
    'aXb aYb',
    'tool=search args={"q":"cats"}',
    'héllo wörld 12%',
    null,
    undefined,
    12.5
  ];
  const PATTERNS: unknown[] = ['(\\d+)%', '\\d+', '^line', '(?<tool>\\w+)=(?<value>\\S+)', 'a(X)?(Y)?b', 'x*', '(', '', null, 'wörld', '[', '\\p{L}+'];
  const FLAGS: unknown[] = ['', 'i', 'm', 'gi', 'imsuy', 'xyz', 'u', undefined];
  const ALLS: unknown[] = [false, true, 'yes', 0, undefined];

  test('B1 every cell of the grid agrees on all nine fields', () => {
    let cells = 0;
    for (const text of TEXTS)
      for (const pattern of PATTERNS)
        for (const flags of FLAGS)
          for (const all of ALLS) {
            cells++;
            expect({ text, pattern, flags, all, answer: lib.tryExtract(text, pattern, flags, all) }).toEqual({
              text,
              pattern,
              flags,
              all,
              answer: runtimeNode(text, pattern, flags, all)
            });
          }
    expect(cells).toBe(TEXTS.length * PATTERNS.length * FLAGS.length * ALLS.length);
  });

  test('B2 the percentage in a status line: Match, First Group, Match Count, and Extract All collects every match', () => {
    expect(lib.tryExtract('Processing... 45% complete', '(\\d+)%')).toEqual({
      ok: true,
      error: '',
      found: true,
      match: '45%',
      matches: ['45%'],
      groups: ['45'],
      firstGroup: '45',
      namedGroups: {},
      matchCount: 1
    });
    const all = lib.tryExtract('33% — then 66% — then 100%', '(\\d+)%', '', true);
    expect(all.matches).toEqual(['33%', '66%', '100%']);
    expect(all.matchCount).toBe(3);
    expect(all.match).toBe('33%');
    expect(all.firstGroup).toBe('33');
  });

  test('B3 a blank pattern is a FAILURE with the NDA-012 sentence, not a Not Found — and an empty text with a usable pattern is Not Found', () => {
    expect(lib.tryExtract('anything', '')).toMatchObject({ ok: false, found: false, error: 'A pattern is required; set the Pattern input to a regular expression' });
    expect(lib.tryExtract('anything')).toMatchObject({ ok: false, found: false });
    expect(lib.tryExtract('', '\\d+')).toEqual({ ok: true, error: '', found: false, match: '', matches: [], groups: [], firstGroup: '', namedGroups: {}, matchCount: 0 });
  });

  test("B4 an invalid regular expression is the engine's own sentence through describeError — in both", () => {
    const mine = lib.tryExtract('abc', '(');
    const theirs = runtimeNode('abc', '(', '', false);
    expect(mine.ok).toBe(false);
    expect(mine.error).toBe(theirs.error);
    expect(mine.error).toMatch(/Invalid regular expression/);
  });

  test('B5 the flags: g is owned by Extract All (a written g is dropped), anything outside imsuy is dropped, y is kept', () => {
    // `g` written in Flags without Extract All: still the first match only.
    expect(lib.tryExtract('a1b2', '\\d', 'g', false).matches).toEqual(['1']);
    // A stray character is dropped rather than throwing.
    expect(lib.tryExtract('ABC', 'abc', 'xyzi').found).toBe(true);
    // `y` (sticky) is honoured: the pattern must match at index 0.
    expect(lib.tryExtract('xa', 'a', 'y').found).toBe(false);
    expect(lib.tryExtract('ax', 'a', 'y').found).toBe(true);
  });

  test('B6 an optional group that did not participate is the empty string, not a hole; named groups by name', () => {
    expect(lib.tryExtract('ab', 'a(X)?(Y)?b').groups).toEqual(['', '']);
    expect(lib.tryExtract('tool=search args', '(?<tool>\\w+)=(?<value>\\S+)').namedGroups).toEqual({ tool: 'tool', value: 'search' });
  });

  test("B7 the setters' coercions: null and undefined are '', a number is its String, Extract All is `!!`", () => {
    expect(lib.tryExtract(12.5, '\\d+')).toMatchObject({ match: '12' });
    expect(lib.tryExtract(null, '\\d+')).toMatchObject({ ok: true, found: false });
    expect(lib.tryExtract('a1a2', '\\d', '', 'yes').matches).toEqual(['1', '2']);
    expect(lib.tryExtract('a1a2', '\\d', '', 0).matches).toEqual(['1']);
  });

  test('B8 every argument is optional — the emitter drops trailing undefineds, and `tryExtract()` is a call the app typechecks (the finding §E3 pins for the crypto verbs)', () => {
    expect(lib.tryExtract()).toMatchObject({ ok: false, found: false });
    expect(lib.tryExtract('45%', '\\d+%')).toMatchObject({ ok: true, found: true, match: '45%' });
    expect(patternLibSource()).toContain('export function tryExtract(text?: unknown, pattern?: unknown, flags?: unknown, extractAll?: unknown): ExtractResult {');
  });

  test('B9 the value table: the emitted row per port is what the getter publishes, typed and seeded', () => {
    expect(Object.keys(PATTERN_VALUE_OUTPUTS)).toEqual(['match', 'matches', 'groups', 'firstGroup', 'namedGroups', 'matchCount']);
    const catalogNode = catalog.nodes.find((n) => n.typeName === 'net.noodl.PatternExtractor')!;
    const valuePorts = (catalogNode.outputs ?? []).filter((o) => (o.type as { name?: string })?.name !== 'signal').map((o) => o.name).sort();
    expect(valuePorts).toEqual([...Object.keys(PATTERN_VALUE_OUTPUTS), 'error'].sort());
    const empty = lib.tryExtract('', 'x');
    expect(empty.match).toBe(PATTERN_VALUE_OUTPUTS.match.boot);
    expect(empty.matchCount).toBe(PATTERN_VALUE_OUTPUTS.matchCount.boot);
    expect(PATTERN_VALUE_OUTPUTS.matches.tsType).toBe('string[]');
    expect(PATTERN_VALUE_OUTPUTS.namedGroups.bootCode).toBe('{}');
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§C the shapes a wire changes', () => {
  test('C1 Match read from the Done chain: the local\'s field, not the row', () => {
    const ir = mutated((h) => {
      disconnect(h, (c) => c.toId === 'setRuns' && c.toProperty === 'value');
      connect(h, 'percent', 'match', 'setRuns', 'value', 'value');
    });
    expect(home(emitApp(ir, catalog))).toContain('runs.set(percentResult.match);');
  });

  test('C2 Match read from the FAILURE chain: the local too — a failed pattern clears the values, and the render closure\'s row would be the stale one', () => {
    const ir = mutated((h) => {
      addNode(h, { id: 'setLast', type: 'Set Variable', parameters: [{ name: 'name', value: { kind: 'literal', value: 'last' } }] });
      connect(h, 'percent', 'failure', 'setLast', 'do');
      connect(h, 'percent', 'match', 'setLast', 'value', 'value');
    });
    const src = home(emitApp(ir, catalog));
    expect(src).toContain([`            ${RAISE}`, '            last.set(percentResult.match);'].join('\n'));
    expect(src).not.toContain('last.set(percentMatch)');
  });

  test('C3 Error read from the Failure chain is the local; from the Found chain it is refused — the node clears the message before Found and Done fire', () => {
    const failure = mutated((h) => {
      addNode(h, { id: 'setWhy', type: 'Set Variable', parameters: [{ name: 'name', value: { kind: 'literal', value: 'why' } }] });
      connect(h, 'percent', 'failure', 'setWhy', 'do');
      connect(h, 'percent', 'error', 'setWhy', 'value', 'value');
    });
    expect(home(emitApp(failure, catalog))).toContain('why.set(percentResult.error);');
    const found = mutated((h) => {
      addNode(h, { id: 'setWhy', type: 'Set Variable', parameters: [{ name: 'name', value: { kind: 'literal', value: 'why' } }] });
      connect(h, 'percent', 'found', 'setWhy', 'do');
      connect(h, 'percent', 'error', 'setWhy', 'value', 'value');
    });
    expect(refusalOf(found, 'percent')).toBe('its Error is read from its own Done chain — the node clears the message before Done fires, so that read is always empty');
  });

  test('C4 the inputs read where the setters read them: a wired Pattern and Flags print as expressions, an authored Extract All as a literal, nothing on Text as absent', () => {
    const ir = mutated((h, source) => {
      addNode(h, { id: 'patternVar', type: 'Variable2', parameters: [{ name: 'name', value: { kind: 'literal', value: 'rule' } }] });
      addNode(h, { id: 'flagsVar', type: 'Variable2', parameters: [{ name: 'name', value: { kind: 'literal', value: 'modes' } }] });
      dropParam(nodeOf(source, HOME, 'percent'), 'pattern');
      setParam(nodeOf(source, HOME, 'percent'), 'extractAll', { kind: 'literal', value: true });
      connect(h, 'patternVar', 'value', 'percent', 'pattern', 'value');
      connect(h, 'flagsVar', 'value', 'percent', 'flags', 'value');
    });
    expect(home(emitApp(ir, catalog))).toContain('const percentResult = tryExtract(status.get(), rule.get(), modes.get(), true);');
    const bare = mutated((h, source) => {
      dropParam(nodeOf(source, HOME, 'percent'), 'pattern');
    });
    expect(home(emitApp(bare, catalog))).toContain('const percentResult = tryExtract(status.get());');
    expect(typecheckEmittedApp(emitApp(bare, catalog))).toEqual([]);
  });

  test('C5 only Not Found wired: the negated form; neither wired: no inner if; nothing wired anywhere and nothing read: the `if (!ok)` form with the raise alone', () => {
    const onlyMissed = mutated((h) => disconnect(h, (c) => c.fromId === 'percent' && c.fromProperty === 'found'));
    expect(home(emitApp(onlyMissed, catalog))).toContain(['            if (!percentResult.found) {', "              verdict.set('missed');", '            }'].join('\n'));
    const neither = mutated((h) => disconnect(h, (c) => c.fromId === 'percent' && (c.fromProperty === 'found' || c.fromProperty === 'notFound')));
    const src = home(emitApp(neither, catalog));
    expect(src).not.toContain('.found');
    expect(src).toContain(['          if (percentResult.ok) {', '            runs.set(percentResult.matchCount);', '          } else {'].join('\n'));
    const bare = mutated((h) => disconnect(h, (c) => c.fromId === 'percent'));
    const bareSrc = home(emitApp(bare, catalog));
    expect(bareSrc).toContain(['          const percentResult = tryExtract(status.get(), "(\\\\d+)%");', '          if (!percentResult.ok) {', `            ${RAISE}`, '          }'].join('\n'));
    expect(bareSrc).not.toContain('setPercent');
    // The three Set Variables are orphaned by the mutation and named as such; the extractor itself is not refused.
    expect(refusalOf(bare, 'percent')).toBeUndefined();
  });

  test('C6 a value read only inside a chain allocates no row: Match Count read by the Done chain alone — the arm reads the local and no useState prints', () => {
    const ir = mutated((h) => disconnect(h, (c) => c.fromId === 'percent' && c.fromProperty === 'matchCount' && c.toId === 'countText'));
    const src = home(emitApp(ir, catalog));
    expect(src).not.toContain('percentMatchCount');
    expect(src).toContain('runs.set(percentResult.matchCount);');
  });

  test('C7 Groups and Named Groups read from render: a string[] row and a Record row, seeded [] and {}', () => {
    const ir = mutated((h) => {
      addNode(h, { id: 'groupsRepeat', type: 'For Each', parent: 'shell', parameters: [{ name: 'template', value: { kind: 'literal', value: '/Components/MatchRow' } }] });
      h.nodes.find((n) => n.id === 'shell')!.children!.push('groupsRepeat');
      connect(h, 'percent', 'groups', 'groupsRepeat', 'items', 'value');
      connect(h, 'percent', 'namedGroups', 'setRuns', 'value', 'value');
      disconnect(h, (c) => c.toId === 'setRuns' && c.toProperty === 'value' && c.fromProperty === 'matchCount');
    });
    const out = emitApp(ir, catalog);
    expect(out.notes).toEqual(['App: router shell — emitted as src/App.tsx by the scaffold']);
    const src = home(out);
    expect(src).toContain('const [percentGroups, setPercentGroups] = useState<string[]>([]);');
    expect(src).toContain('setPercentGroups(percentResult.groups);');
    expect(src).toContain('{(percentGroups ?? []).map((item, index) => (');
    expect(src).toContain('runs.set(percentResult.namedGroups);');
    expect(typecheckEmittedApp(out)).toEqual([]);
  });

  test('C8 the Extract fired from a Value Changed (a non-element trigger the attach pass takes) prints inside an effect', () => {
    const ir = mutated((h) => {
      disconnect(h, (c) => c.toId === 'percent' && c.toProperty === 'extract');
      addNode(h, { id: 'changed', type: 'Value Changed' });
      connect(h, 'statusVar', 'value', 'changed', 'value', 'value');
      connect(h, 'changed', 'valueChanged', 'percent', 'extract');
    });
    const out = emitApp(ir, catalog);
    expect(planOf(ir, HOME).refusals).toEqual([]);
    expect(home(out)).toContain('const percentResult = tryExtract(status.get(), "(\\\\d+)%");');
    expect(typecheckEmittedApp(out)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§D the refused shapes, by mutation — each sentence exact', () => {
  const ONLY_MATCH = (h: ComponentIR) => disconnect(h, (c) => c.fromId === 'percent' && !(c.fromProperty === 'match' && c.toId === 'matchText'));

  test("D1 Completed wired: UUID's sentence, and the node is refused whole", () => {
    const ir = mutated((h) => {
      addNode(h, { id: 'after', type: 'Set Variable', parameters: [{ name: 'name', value: { kind: 'literal', value: 'after' } }] });
      connect(h, 'percent', 'completed', 'after', 'do');
    });
    expect(refusalOf(ir, 'percent')).toBe('its Completed output is consumed — it fires after every outcome, and this slice emits the outcome arms rather than a join beneath them');
    expect(home(emitApp(ir, catalog))).not.toContain('tryExtract(');
  });

  test('D2 an output the node has not got', () => {
    const ir = mutated((h) => connect(h, 'percent', 'result', 'matchText', 'text', 'value'));
    expect(refusalOf(ir, 'percent')).toBe('its result output is not a port this node has');
  });

  test('D3 an input the node has not got', () => {
    const ir = mutated((h) => connect(h, 'statusVar', 'value', 'percent', 'subject', 'value'));
    expect(refusalOf(ir, 'percent')).toBe('its subject input is not a port this node has');
  });

  test('D4 two wires on one input — last-writer-wins is not statically ordered (Text, and Extract All by its display name)', () => {
    const text = mutated((h) => {
      addNode(h, { id: 'otherVar', type: 'Variable2', parameters: [{ name: 'name', value: { kind: 'literal', value: 'other' } }] });
      connect(h, 'otherVar', 'value', 'percent', 'text', 'value');
    });
    expect(refusalOf(text, 'percent')).toBe('two wires feed its Text input — last-writer-wins is not statically ordered');
    const all = mutated((h) => {
      addNode(h, { id: 'aVar', type: 'Variable2', parameters: [{ name: 'name', value: { kind: 'literal', value: 'a' } }] });
      addNode(h, { id: 'bVar', type: 'Variable2', parameters: [{ name: 'name', value: { kind: 'literal', value: 'b' } }] });
      connect(h, 'aVar', 'value', 'percent', 'extractAll', 'value');
      connect(h, 'bVar', 'value', 'percent', 'extractAll', 'value');
    });
    expect(refusalOf(all, 'percent')).toBe('two wires feed its Extract All input — last-writer-wins is not statically ordered');
  });

  test('D5 Found, Not Found and Done consumed as a value: a pulse carries nothing to read — each by its display name', () => {
    for (const [port, label] of [
      ['found', 'Found'],
      ['notFound', 'Not Found'],
      ['done', 'Done']
    ] as const) {
      const ir = mutated((h) => connect(h, 'percent', port, 'matchText', 'text', 'value'));
      expect(refusalOf(ir, 'percent')).toBe(`its ${label} output is consumed as a value — a pulse carries nothing to read`);
    }
  });

  test('D6 a value read while nothing is wired to Extract: no pattern is ever run — named by the FIRST read, once (Match; then First Group alone; then Error alone)', () => {
    const match = mutated((h) => disconnect(h, (c) => c.toId === 'percent' && c.toProperty === 'extract'));
    expect(refusalOf(match, 'percent')).toBe('its Match is read, but nothing fires its Extract — no pattern is ever run');
    expect(home(emitApp(match, catalog))).not.toContain('percentMatch');
    const firstGroup = mutated((h) => disconnect(h, (c) => (c.toId === 'percent' && c.toProperty === 'extract') || (c.fromId === 'percent' && !(c.fromProperty === 'firstGroup' && c.toId === 'firstGroupText'))));
    expect(refusalOf(firstGroup, 'percent')).toBe('its First Group is read, but nothing fires its Extract — no pattern is ever run');
    const error = mutated((h) => disconnect(h, (c) => (c.toId === 'percent' && c.toProperty === 'extract') || (c.fromId === 'percent' && !(c.fromProperty === 'error' && c.toId === 'errorText'))));
    expect(refusalOf(error, 'percent')).toBe('its Error is read, but nothing fires its Extract — no pattern is ever run');
  });

  test('D7 Extract wired from a trigger the attach pass cannot take: the attach pass names it first (§59.4 #3)', () => {
    const ir = mutated((h) => {
      disconnect(h, (c) => c.toId === 'percent' && c.toProperty === 'extract');
      addNode(h, { id: 'idle', type: 'Delay', parameters: [] });
      connect(h, 'idle', 'finished', 'percent', 'extract');
      ONLY_MATCH(h);
    });
    expect(refusalOf(ir, 'percent')).toBe('trigger idle.finished is not a rendered element event or a receiver');
  });

  test('D8 a text input wired straight into Text: the read is legal only inside the input\'s own handler', () => {
    const ir = mutated((h) => {
      disconnect(h, (c) => c.toId === 'percent' && c.toProperty === 'text');
      connect(h, 'statusInput', 'text', 'percent', 'text', 'value');
    });
    expect(refusalOf(ir, 'percent')).toBeDefined();
    expect(home(emitApp(ir, catalog))).not.toContain('tryExtract(');
  });

  test('D9 the corpus stays clean: no marker, no TODO on the fixture', () => {
    expect(home(app)).not.toContain('<!-- nodegx:');
    expect(home(app)).not.toContain('TODO(export)');
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§E what building it found — pinned', () => {
  test("E1 the seeded Error row does not fold: `outcome-error` carries `seeded` for the extractor and the sink prints `{percentError}` — the first emit printed `{percentError ?? ''}`", () => {
    const homePlan = project.plans.find((p) => p.path === HOME)!;
    const bound = homePlan.bindings['errorText']?.text;
    expect(bound).toEqual({ kind: 'computed', expr: { kind: 'outcome-error', nodeId: 'percent', local: 'percentResult.error', viaState: 'percentError', seeded: true } });
    expect(home(app)).toContain('{percentError}</p>');
  });

  test("E2 a For Each over Matches: the list is `string[]`, the repeater keys by index, and the row reads nothing off the item — a match is a string, not a record", () => {
    const src = home(app);
    expect(src).toContain('const [percentMatches, setPercentMatches] = useState<string[]>([]);');
    expect(src).toContain('<MatchRow key={index} />');
  });

  test('E3 the crypto verbs had required parameters while the emitter drops trailing undefineds — `tryRandomBytes()` (browser-utilities E2) was a call the app would not typecheck; now optional, and the E2-shaped app typechecks whole', () => {
    expect(cryptoLibSource()).toContain('export async function tryHash(value?: unknown, algorithm?: unknown, encoding?: unknown): Promise<HashResult> {');
    expect(cryptoLibSource()).toContain('export function tryRandomBytes(length?: unknown, encoding?: unknown): RandomBytesResult {');
    const utility = parseProject(path.join(__dirname, 'fixtures', 'utility-desk'), catalog);
    const nonce = componentOf(utility, HOME).nodes.find((n) => n.id === 'nonce')!;
    const hash = componentOf(utility, HOME).nodes.find((n) => n.id === 'hash')!;
    nonce.parameters = [];
    hash.parameters = [];
    componentOf(utility, HOME).connections = componentOf(utility, HOME).connections.filter((c) => !(c.toId === 'hash' && c.toProperty === 'value'));
    const out = emitApp(utility, catalog);
    expect(home(out)).toContain('const nonceResult = tryRandomBytes();');
    expect(home(out)).toContain('const hashResult = await tryHash();');
    expect(typecheckEmittedApp(out)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------
describe('§F the ledger and the controls', () => {
  test('F1 the ledger row is translated with a note that names what is emitted and what is refused', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'coverage-ledger.json'), 'utf8')) as { entries: Array<{ typeName: string; status: string; note?: string; exemption?: string }> };
    const entry = ledger.entries.find((e) => e.typeName === 'net.noodl.PatternExtractor')!;
    expect(entry.status).toBe('translated');
    expect(entry.exemption).toBeUndefined();
    expect(entry.note).toContain('src/lib/pattern.ts');
    expect(entry.note).toContain('Refused by name');
  });

  test('F2 the libs are earned, not shipped by default: alarm-desk ships neither; utility-desk (the crypto verbs) ships crypto.ts and not pattern.ts', () => {
    const alarm = emitApp(parseProject(path.join(__dirname, 'fixtures', 'alarm-desk'), catalog), catalog);
    expect(alarm.files[PATTERN_LIB_PATH]).toBeUndefined();
    expect(alarm.files[CRYPTO_LIB_PATH]).toBeUndefined();
    const utility = emitApp(parseProject(path.join(__dirname, 'fixtures', 'utility-desk'), catalog), catalog);
    expect(utility.files[CRYPTO_LIB_PATH]).toBeDefined();
    expect(utility.files[PATTERN_LIB_PATH]).toBeUndefined();
    expect(utility.files['src/pages/Home.tsx']).not.toContain("from '../lib/pattern'");
  });

  test('F3 the pattern lib exports the one verb and its result type — nothing that throws', () => {
    const lib = patternLibSource();
    expect(lib).toContain('export function tryExtract(');
    expect(lib).toContain('export interface ExtractResult {');
    expect(lib).not.toContain('export function describeError');
    expect(lib).not.toContain('export function captureGroups');
    expect((lib.match(/^export /gm) ?? []).length).toBe(2);
  });
});
