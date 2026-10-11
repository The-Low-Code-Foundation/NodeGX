/**
 * NSP-020 — the ports-parity drive, oracle (a): `runtime-discovered`, `runtime-narrowed` and `numbered-inputs`
 * (task §3.1 decision 5).
 *
 * The runtime announces a node's dynamic ports from a module-level `setup(context, graphModel)` hook (or, for a
 * `numberedInputs` registration, `defineNode(...).setupNumberedInputDynamicPorts`), subscribed to
 * `graphModel.on('nodeAdded.<type>')` and then the node's `parameterUpdated` / `inputConnectionAdded` /
 * `inputConnectionRemoved` (noodl-runtime.ts :658-669; nodedefinition.ts :607-679). It reads the GRAPH MODEL, never a
 * running instance — so this drive mounts nothing: it fires the hook with a fake graph model built from
 * `(params, context)`, exactly as `noodl-editor/tests-unit/sb-017/cloud-ports-agree-with-the-runtime.test.ts` :124-199
 * does, reads the last `sendDynamicPorts`, and lays it over `drawnPorts(spec, params, context)` the way the editor lays
 * it over the registration (`nsp-020-oracle-a.ts` says how). A mismatch is a row (R3 (a): the runtime wins), never a
 * bumped expectation.
 *
 * s79 drove And and String Format. s80 (L4) grows it into the MODULE TABLE (`nsp-020-module-table.ts`): every module
 * with such a hook, found on disk by the census below, is graded, owed by a named lane, or excluded with a reason.
 *
 *   npx jest test/node-spec/nsp-020-ports-parity.test.ts
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  DRAWN_PORT_TYPES,
  drawnPorts,
  specs,
  type AnyNodeSpec,
  type PortContext,
  type ValueInputDecl
} from '../../../nodegx-node-spec/src';
import { EXCLUDED, LIBRARIES, TABLE, type Case, type TableRow } from './nsp-020-module-table';
import {
  announcedPorts,
  byName,
  hookOf,
  load,
  matchesPin,
  PACKAGES,
  pinned,
  registrationsOf,
  compareWithSpec,
  fromAnnounced,
  fromDrawn,
  specDynamicPorts,
  type Hook
} from './nsp-020-oracle-a';

// The viewer's modules read the `Noodl` global at import (node-shared-port-definitions.ts); the p82 and fb-026 fixtures set it the same way.
(globalThis as unknown as Record<string, unknown>).Noodl = { deployed: false, baseUrl: '/' };

// eslint-disable-next-line @typescript-eslint/no-require-imports
const catalog = require('../../../noodl-types/src/node-catalog.json') as {
  nodes: Array<{
    typeName: string;
    parameterEncoding?: {
      known?: boolean;
      patterns?: Array<{
        pattern: string;
        example: string;
        when?: Record<string, unknown>;
        variables?: Record<string, string>;
      }>;
    };
  }>;
};

/**
 * The catalog's `parameterEncoding` probe for a type: each pattern's `example` read back through its pattern into the
 * parameter its variable's description names (a comma-separated list, a row label or id of a list, an expression
 * variable, a format placeholder). Undefined when the catalog has no known encoding, or none of its patterns says which
 * parameter seeds it (the Record family's names come from the schema — the description says so).
 */
function catalogProbe(type: string): Case | undefined {
  const pe = catalog.nodes.find((n) => n.typeName === type)?.parameterEncoding;
  if (!pe?.known || !pe.patterns) return undefined;
  const params: Record<string, unknown> = {};
  const add = (name: string, value: unknown, asList: boolean) => {
    if (!asList) return void (params[name] = value);
    const list = (params[name] as unknown[]) ?? [];
    if (!list.some((x) => JSON.stringify(x) === JSON.stringify(value))) params[name] = [...list, value];
  };
  for (const p of pe.patterns) {
    if (p.when) Object.assign(params, p.when);
    const vars = Object.entries(p.variables ?? {});
    if (vars.length !== 1) continue;
    const [variable, description] = vars[0];
    const m = new RegExp(
      '^' + p.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('<' + variable + '>', '(.+)') + '$'
    ).exec(p.example);
    if (!m) continue;
    const value = m[1];
    let d: RegExpExecArray | null;
    if ((d = /comma-separated entries in the `(\w+)`/.exec(description))) {
      const list = typeof params[d[1]] === 'string' ? String(params[d[1]]).split(',') : [];
      if (!list.includes(value)) params[d[1]] = [...list, value].join(',');
    } else if ((d = /`label` of a row in the `(\w+)`/.exec(description))) add(d[1], { label: value }, true);
    else if ((d = /`id` of a row in the `(\w+)`/.exec(description))) add(d[1], { id: value, label: value }, true);
    else if ((d = /free variable referenced in the `(\w+)`/.exec(description))) add(d[1], value, false);
    else if ((d = /`\{placeholder\}` appearing in the `(\w+)`/.exec(description))) add(d[1], '{' + value + '}', false);
  }
  return Object.keys(params).length ? { name: 'the catalog parameterEncoding probe', params } : undefined;
}

function casesOf(row: TableRow): Case[] {
  const probe = catalogProbe(row.type);
  return [{ name: 'the catalog defaults', params: {} }, ...(probe ? [probe] : []), ...row.cases];
}

function rowKey(module: string, type: string, numbered: boolean): string {
  return `${module}#${type}${numbered ? ' (numbered)' : ''}`;
}

interface Outcome {
  row: TableRow;
  perCase: Array<{ c: Case; announced: number; diffs: string[]; error?: string }>;
}

const tally = { outcomePorts: 0, editorRule: 0 };

function drive(row: TableRow, spec: AnyNodeSpec = specs[row.type]): Outcome {
  const hook = hookOf(row);
  return {
    row,
    perCase: casesOf(row).map((c) => {
      try {
        const announced = announcedPorts(hook, row.type, c.params, c.context, c.meta);
        return { c, announced: announced.length, diffs: compareWithSpec(spec, announced, c.params, c.context, tally) };
      } catch (e) {
        return { c, announced: 0, diffs: [], error: (e as Error).message };
      }
    })
  };
}

// ------------------------------------------------------------------------------------------------------------------
// The census: every module on disk with a hook is in the table, excluded with a reason, or a library.

const ROOTS = ['noodl-runtime/src/nodes', 'noodl-viewer-react/src/nodes', 'noodl-viewer-react/src/nodes-deprecated'];
/** A module-level hook in any of the shapes the two packages write one, a mixin that installs one, a numbered registration, or an announcement. */
const CANDIDATE =
  /(\bsetup\s*\(\s*context|\bsetup\s*:\s*(function|setup\b|def\.setup)|\.setup\s*=\s*function|function setup\s*\(|numberedInputs|sendDynamicPorts|modelcrudbase|dbmodelcrudbase|componentutils\/base|from '\.\/base')/;

function walk(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(dir, e.name))
        : /\.(ts|tsx|js)$/.test(e.name) && !/\.d\.ts$/.test(e.name)
        ? [path.join(dir, e.name)]
        : []
    );
}

function census(): { hooks: Map<string, string>; libraries: string[] } {
  const hooks = new Map<string, string>(); // key -> module
  const libraries: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(path.join(PACKAGES, root))) {
      if (!CANDIDATE.test(fs.readFileSync(file, 'utf8'))) continue;
      const module = path
        .relative(PACKAGES, file)
        .split(path.sep)
        .join('/')
        .replace(/\.(ts|tsx|js)$/, '');
      const regs = registrationsOf(load(module));
      if (!regs.length) libraries.push(module);
      for (const r of regs) {
        if (typeof r.setup === 'function') hooks.set(rowKey(module, r.node!.name!, false), module);
        if (r.node!.numberedInputs) hooks.set(rowKey(module, r.node!.name!, true), module);
      }
    }
  }
  return { hooks, libraries };
}

/** The census against a table: what is on disk and accounted for nowhere, and what is accounted for and not on disk. */
function accountFor(
  found: ReturnType<typeof census>,
  table: TableRow[],
  excluded: Record<string, string>,
  libraries: Record<string, string>
) {
  const listed = new Set([
    ...table.map((r) => rowKey(r.module, r.type, r.hook === 'numbered')),
    ...Object.keys(excluded)
  ]);
  return {
    unaccounted: [...found.hooks.keys()].filter((k) => !listed.has(k)).sort(),
    stale: [...listed].filter((k) => !found.hooks.has(k)).sort(),
    unlistedLibraries: found.libraries.filter((m) => !(m in libraries)).sort(),
    staleLibraries: Object.keys(libraries)
      .filter((m) => !found.libraries.includes(m))
      .sort()
  };
}

describe('NSP-020 oracle (a): the census — every hook on disk is accounted for', () => {
  const found = census();

  test('the census finds the hooks at all (a census of nothing accounts for everything)', () => {
    // eslint-disable-next-line no-console
    console.log(
      `NSP-020 census: ${found.hooks.size} hooks in ${new Set(found.hooks.values()).size} modules; ${
        found.libraries.length
      } libraries`
    );
    expect(found.hooks.size).toBeGreaterThanOrEqual(60);
    expect(found.hooks.has(rowKey('noodl-runtime/src/nodes/std-library/stringformat', 'String Format', false))).toBe(
      true
    );
    expect(found.hooks.has(rowKey('noodl-runtime/src/nodes/std-library/and', 'And', true))).toBe(true);
  });

  test('every module with a setup hook or a numbered registration is in the table or excluded with a reason; no entry is stale', () => {
    const a = accountFor(found, TABLE, EXCLUDED, LIBRARIES);
    expect({ unaccounted: a.unaccounted, stale: a.stale }).toEqual({ unaccounted: [], stale: [] });
    for (const [key, reason] of Object.entries(EXCLUDED)) expect([key, reason.trim().length > 0]).toEqual([key, true]);
  });

  test('every file the text match finds that registers no hooked node is a named library', () => {
    const a = accountFor(found, TABLE, EXCLUDED, LIBRARIES);
    expect({ unlisted: a.unlistedLibraries, stale: a.staleLibraries }).toEqual({ unlisted: [], stale: [] });
  });

  test('every graded or owed row names a type with a spec; an excluded one for "no spec" has none', () => {
    for (const row of TABLE) expect([row.type, !!specs[row.type]]).toEqual([row.type, true]);
    for (const [key, reason] of Object.entries(EXCLUDED)) {
      if (!reason.startsWith('no spec') && !reason.startsWith('deprecated')) continue;
      const type = key.slice(key.indexOf('#') + 1).replace(/ \(numbered\)$/, '');
      expect([key, !!specs[type]]).toEqual([key, false]);
    }
  });

  test('PLANTED: a module dropped from the table is red, named', () => {
    const dropped = TABLE.filter((r) => r.type !== 'String Format');
    expect(accountFor(found, dropped, EXCLUDED, LIBRARIES).unaccounted).toEqual([
      rowKey('noodl-runtime/src/nodes/std-library/stringformat', 'String Format', false)
    ]);
  });
});

// ------------------------------------------------------------------------------------------------------------------
// The table.

const graded = TABLE.filter((r) => !r.owedBy);
const owed = TABLE.filter((r) => r.owedBy);

describe('NSP-020 oracle (a): what the runtime announces is what the spec draws — the graded rows', () => {
  const outcomes = graded.map((row) => drive(row));

  describe.each(outcomes.map((o) => [o.row.type, o] as const))('%s', (_type, o) => {
    test.each(o.perCase.map((p) => [p.c.name, p] as const))('%s', (_name, p) => {
      expect(p.error).toBeUndefined();
      const unexpected = p.diffs.filter((d) => !pinned(o.row, d));
      expect(unexpected).toEqual([]);
    });

    test('the drive is not vacuous: some case announces a port', () => {
      expect(Math.max(...o.perCase.map((p) => p.announced))).toBeGreaterThan(0);
    });

    test('every pinned disagreement still happens (a fixed one is noticed)', () => {
      const seen = o.perCase.flatMap((p) => p.diffs);
      expect(Object.keys(o.row.known ?? {}).filter((pin) => !seen.some((d) => matchesPin(pin, d)))).toEqual([]);
    });
  });

  test('the tally: graded rows, cases, pinned rows and gaps — printed', () => {
    const cases = outcomes.reduce((n, o) => n + o.perCase.length, 0);
    const pins = graded.flatMap((r) => Object.entries(r.known ?? {}));
    // eslint-disable-next-line no-console
    console.log(
      `NSP-020 oracle (a): ${graded.length} graded rows, ${cases} cases; ${
        pins.filter(([, v]) => v.startsWith('P107-')).length
      } pinned to bug rows, ` +
        `${pins.filter(([, v]) => v.startsWith('GAP')).length} to format gaps; outcome ports matched ${
          tally.outcomePorts
        }, editor-rule ports skipped ${tally.editorRule}; ` +
        `${owed.length} owed (${owed.map((r) => `${r.type} → ${r.owedBy}`).join(', ')}); ${
          Object.keys(EXCLUDED).length
        } excluded`
    );
    expect(graded.length).toBeGreaterThanOrEqual(20);
  });
});

describe('NSP-020 oracle (a): the owed rows — driven, their disagreements printed and counted, not failed', () => {
  // s84 — L1 landed and none is owed; the block stays for the next lane that switches a row on
  if (owed.length === 0) {
    test('no row is owed', () => expect(owed).toEqual([]));
    return;
  }
  test.each(owed.map((r) => [`${r.type} (owed by ${r.owedBy})`, r] as const))('%s', (_name, row) => {
    const o = drive(row);
    const lines = o.perCase.map(
      (p) =>
        `  ${p.c.name}: ${p.error ? 'THREW ' + p.error : p.diffs.length + ' disagreement(s)'}${p.diffs
          .map((d) => '\n    ' + d)
          .join('')}`
    );
    // eslint-disable-next-line no-console
    console.log(`${row.type} — owed by ${row.owedBy}; the hook reads: ${row.reads}\n${lines.join('\n')}`);
    expect(o.perCase.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------------------------------------
// Planted mutants: one per mechanism the table grades, each red.

const rowOf = (type: string) => TABLE.find((r) => r.type === type)!;
const diffsFor = (type: string, spec: AnyNodeSpec, params: Record<string, unknown>, context: PortContext = {}) =>
  compareWithSpec(spec, announcedPorts(hookOf(rowOf(type)), type, params, context), params, context);

function withDerivedInputs(spec: AnyNodeSpec, inputs: NonNullable<AnyNodeSpec['derived']>['inputs']): AnyNodeSpec {
  return { ...spec, derived: { ...spec.derived!, inputs } };
}

function withNarrow(spec: AnyNodeSpec, port: string, narrow: ValueInputDecl['narrow']): AnyNodeSpec {
  return { ...spec, inputs: { ...spec.inputs, [port]: { ...(spec.inputs[port] as ValueInputDecl), narrow } } };
}

describe('NSP-020 oracle (a): planted mutants are red', () => {
  test('PLANTED (numbered): the s79 And spec, counting params alone, is red on the wire case', () => {
    const paramsOnly = withDerivedInputs(specs['And'], (params) => specs['And'].derived!.inputs(params, {}));
    const context = { wired: ['input 3'] };
    const runtime = announcedPorts(hookOf(rowOf('And')), 'And', {}, context)
      .map(fromAnnounced)
      .sort(byName);
    const spec = drawnPorts(paramsOnly, {}, context)
      .filter((p) => p.source === 'derived')
      .map(fromDrawn)
      .sort(byName);
    expect(runtime.map((p) => p.name)).toEqual(['input 0', 'input 1', 'input 2', 'input 3', 'input 4']);
    expect(spec.map((p) => p.name)).toEqual(['input 0']);
    expect(specDynamicPorts('And', {}, context)).toEqual(runtime);
    expect(diffsFor('And', paramsOnly, {}, context).length).toBeGreaterThan(0);
  });

  test('PLANTED (numbered): Or counting params alone is red on a wire — the s80 finding on the other three', () => {
    const paramsOnly = withDerivedInputs(specs['Or'], (params) => specs['Or'].derived!.inputs(params, {}));
    expect(diffsFor('Or', paramsOnly, {}, { wired: ['input 3'] })).toContain(
      'input input 4: announced; the spec does not draw it'
    );
  });

  test('PLANTED (setup): a String Format spec that draws only the first placeholder is red', () => {
    const firstOnly = withDerivedInputs(specs['String Format'], (params, context) =>
      Object.fromEntries(Object.entries(specs['String Format'].derived!.inputs(params, context)).slice(0, 1))
    );
    const params = { format: '{a} then {b}' };
    expect(diffsFor('String Format', firstOnly, params)).toEqual(['input b: announced; the spec does not draw it']);
  });

  test('PLANTED (setup): a Close Popup spec that drops a close action is red', () => {
    const dropped = withDerivedInputs(specs['NavigationClosePopup'], (params, context) => {
      const ports = { ...specs['NavigationClosePopup'].derived!.inputs(params, context) };
      delete ports['closeAction-Cancel'];
      return ports;
    });
    expect(diffsFor('NavigationClosePopup', dropped, { closeActions: 'Save,Cancel' })).toEqual([
      'input closeAction-Cancel: announced; the spec does not draw it'
    ]);
  });

  test('PLANTED (setup): an Expression spec whose ports lose their group is red', () => {
    const ungrouped = withDerivedInputs(specs['Expression'], (params, context) =>
      Object.fromEntries(
        Object.entries(specs['Expression'].derived!.inputs(params, context)).map(([n, d]) => [
          n,
          { ...d, group: undefined }
        ])
      )
    );
    const diffs = diffsFor('Expression', ungrouped, { expression: 'a + 1' });
    expect(diffs).toContain('input a: group runtime "Parameters", spec unset');
  });

  test('PLANTED (runtime-narrowed): a Dropdown narrow that returns the wrong enums is red', () => {
    const wrong = withNarrow(specs['net.noodl.controls.options'], 'value', (p, c) => ({
      ...(specs['net.noodl.controls.options'].inputs.value as ValueInputDecl).narrow!(p, c),
      enums: ['Option 1']
    }));
    expect(diffsFor('net.noodl.controls.options', wrong, {})).toEqual([
      'input value: enums runtime ["Option 1","Option 2"], spec ["Option 1"]'
    ]);
  });

  test('PLANTED (runtime-narrowed): a Dropdown with no narrow at all is red — the static string port is not what the editor draws', () => {
    const none = withNarrow(specs['net.noodl.controls.options'], 'value', undefined);
    expect(diffsFor('net.noodl.controls.options', none, {})).toEqual([
      'input value: type runtime "enum", spec "string"',
      'input value: enums runtime ["Option 1","Option 2"], spec unset'
    ]);
  });

  test('PLANTED (runtime-narrowed): a narrow the runtime does not announce is red (unreadable items keep the static port)', () => {
    const always = withNarrow(specs['net.noodl.controls.options'], 'value', () => ({ type: 'enum', enums: ['x'] }));
    expect(diffsFor('net.noodl.controls.options', always, { items: 'not a list at all' })).toEqual([
      'input value: the spec narrows it (type, enums); the runtime does not announce it'
    ]);
  });

  test('PLANTED (runtime-narrowed): a Text Input narrow that ignores Type is red on Number', () => {
    const fixed = withNarrow(specs['net.noodl.controls.textinput'], 'startValue', () => ({ type: 'string' }));
    expect(diffsFor('net.noodl.controls.textinput', fixed, { type: 'number' })).toContain(
      'input startValue: type runtime "number", spec "string"'
    );
  });

  test('PLANTED (pins): a pinned disagreement nothing produces is caught by the stale-pin check', () => {
    const row = {
      ...rowOf('Sign File URL'),
      known: { ...rowOf('Sign File URL').known, 'input nothing: announced; the spec does not draw it': 'P107-S80-NONE' }
    };
    const seen = drive(row).perCase.flatMap((p) => p.diffs);
    expect(Object.keys(row.known).filter((pin) => !seen.some((d) => matchesPin(pin, d)))).toEqual([
      'input nothing: announced; the spec does not draw it'
    ]);
  });
});

// NSP-020 s85 (R19) — the product reads `DRAWN_PORT_TYPES` (the MCP's drawn ports and wire check, the ledger's AC4): it must be
// exactly the graded rows whose names are complete — a row with no pin saying the runtime announces a port the spec does not draw
describe('DRAWN_PORT_TYPES is the graded table, less the rows whose names are incomplete', () => {
  test('both directions', () => {
    const incomplete = (row: TableRow) => Object.keys(row.known ?? {}).some((pin) => pin.includes('announced; the spec does not draw it'));
    const graded = [...new Set(TABLE.filter((row) => specs[row.type] && !row.owedBy).map((row) => row.type))];
    const complete = graded.filter((t) => !TABLE.filter((row) => row.type === t).some(incomplete)).sort();
    expect([...DRAWN_PORT_TYPES].sort()).toEqual(complete);
    // known-firing on both sides: the HTTP Request is graded and left out (its Output Fields), the Record is in
    expect(graded).toContain('net.noodl.HTTP');
    expect(DRAWN_PORT_TYPES).not.toContain('net.noodl.HTTP');
    expect(DRAWN_PORT_TYPES).toContain('DbModel2');
  });
});
