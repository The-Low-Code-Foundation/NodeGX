/**
 * EXP-008's open question — node coverage is not parameter coverage (P18 session 110).
 *
 * `export-ledger:picker` reads 130 of 130: every placeable node translates. §67–§70 were four
 * sessions of a parameter vanishing behind a `translated` row, and §75.5 #3 refused to quote 100%
 * until the parameters were measured too. `helpers/parameter-probe.ts` measures them: for every
 * translated picker node, every non-signal input is varied and the export re-run; a port whose
 * change moves no emitted byte and no note is SILENT.
 *
 * `parameter-ledger.json` holds what does not reach, adjudicated per port, and this spec holds the
 * file to the measurement in both directions:
 *
 *   §A — the silent set and the unprobed set are EXACTLY the ledger's (a port that falls silent is
 *        red; a port that starts reaching is red until it leaves the ledger and the floor rises);
 *        the reaching count IS `parameterCoverageFloor`, the total IS `parameterCoverageTotal`.
 *   §B — every `gap` names a bug row that exists; every class is one of the five.
 *   §C — the instrument can see a drop: an emitter that strips one parameter turns a reaching port
 *        silent (the control), and the stale-cache trap the probe works around stays worked around.
 *
 * 🔴 A new port on a translated node arrives here unclassified and reddens §A. That is the gate: add
 * it to `silent` as `unexamined` (honest) or better, then raise or keep the floor by the count §A
 * prints. Never edit the floor by hand; copy the measured number.
 */

import * as fs from 'fs';
import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import type { ExportIR } from '../src/ir/types';
import { probeParameters, type Emit, type Reading } from './helpers/parameter-probe';

const ROOT = path.join(__dirname, '..');
const BUGS = path.join(ROOT, '..', '..', 'dev-docs', 'bugs');

interface Adjudication {
  class: 'gap' | 'gated' | 'refused-with' | 'inert' | 'unexamined';
  why: string;
  bug?: string;
}
interface ParameterLedger {
  parameterCoverageFloor: number;
  parameterCoverageTotal: number;
  silent: Record<string, Adjudication>;
  unprobed: Record<string, string>;
}

const catalog = loadCatalog();
const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'coverage-ledger.json'), 'utf8'));
const ledger: ParameterLedger = JSON.parse(fs.readFileSync(path.join(ROOT, 'parameter-ledger.json'), 'utf8'));

const keysWith = (reading: Reading, verdicts: string[]): string[] =>
  [...reading.entries()].filter(([, r]) => verdicts.includes(r.verdict)).map(([k]) => k).sort();

/** `a − b`, both sorted. */
const minus = (a: string[], b: string[]): string[] => a.filter((k) => !b.includes(k));

let reading: Reading;

beforeAll(() => {
  reading = probeParameters({ catalog, ledger: coverage, parse: parseProject, emit: emitApp });
}, 600_000);

describe('§A the measurement is the ledger', () => {
  it('nothing threw', () => {
    expect(keysWith(reading, ['threw']).map((k) => `${k}: ${reading.get(k)?.how}`)).toEqual([]);
  });

  it('the silent ports are exactly the ledger’s', () => {
    const measured = keysWith(reading, ['silent']);
    const listed = Object.keys(ledger.silent).sort();
    // Named sets, not a count: a port leaving and another arriving would hold a count still.
    expect({ silentNotInLedger: minus(measured, listed), inLedgerNotSilent: minus(listed, measured) }).toEqual({
      silentNotInLedger: [],
      inLedgerNotSilent: []
    });
  });

  it('the unprobed ports are exactly the ledger’s, with their types', () => {
    const measured = Object.fromEntries(keysWith(reading, ['unprobed']).map((k) => [k, reading.get(k)?.how]));
    expect(measured).toEqual(ledger.unprobed);
  });

  it('the reaching count is the floor, and the total is the total', () => {
    const reaching = keysWith(reading, ['reaches', 'reaches-under']).length;
    expect({ reaching, total: reading.size }).toEqual({
      reaching: ledger.parameterCoverageFloor,
      total: ledger.parameterCoverageTotal
    });
  });
});

describe('§B the adjudication', () => {
  const ids = new Set(
    fs
      .readdirSync(BUGS)
      .filter((f) => f.endsWith('.md'))
      .map((f) => /^id:\s*(\S+)/m.exec(fs.readFileSync(path.join(BUGS, f), 'utf8'))?.[1])
      .filter((id): id is string => id !== undefined)
  );

  it('every class is one of the five, and every entry says why', () => {
    const bad = Object.entries(ledger.silent).filter(
      ([, a]) => !['gap', 'gated', 'refused-with', 'inert', 'unexamined'].includes(a.class) || a.why.trim() === ''
    );
    expect(bad).toEqual([]);
  });

  it('every gap names a bug row that exists, and only a gap names one', () => {
    const gapsWithoutRow = Object.entries(ledger.silent)
      .filter(([, a]) => a.class === 'gap' && (!a.bug || !ids.has(a.bug)))
      .map(([k, a]) => `${k} → ${a.bug ?? '(none)'}`);
    const rowsOnNonGaps = Object.entries(ledger.silent)
      .filter(([, a]) => a.class !== 'gap' && a.bug)
      .map(([k]) => k);
    expect({ gapsWithoutRow, rowsOnNonGaps }).toEqual({ gapsWithoutRow: [], rowsOnNonGaps: [] });
  });
});

describe('§C the instrument can see what it claims to', () => {
  /** An emitter that never sees one parameter — the shape of every drop this spec exists to catch. */
  const dropping =
    (name: string): Emit =>
    (ir: ExportIR, c) =>
      emitApp(
        { ...ir, components: ir.components.map((comp) => ({ ...comp, nodes: comp.nodes.map((n) => ({ ...n, parameters: n.parameters.filter((p) => p.name !== name) })) })) },
        c
      );

  it('control: Text’s Font Size reaches; with an emitter that drops it, it reads silent', () => {
    const honest = probeParameters({ catalog, ledger: coverage, parse: parseProject, emit: emitApp, only: ['Text'], syntheticOnly: true });
    const mutant = probeParameters({ catalog, ledger: coverage, parse: parseProject, emit: dropping('fontSize'), only: ['Text'], syntheticOnly: true });
    expect([honest.get('Text.fontSize')?.verdict, mutant.get('Text.fontSize')?.verdict]).toEqual(['reaches', 'silent']);
    // …and nothing else moved: the mutant drops one parameter, not the node.
    expect(keysWith(mutant, ['silent']).filter((k) => !keysWith(honest, ['silent']).includes(k))).toEqual(['Text.fontSize']);
  }, 120_000);

  it('a gated port names the sibling that opened it (a shadow colour waits for Shadow Enabled)', () => {
    expect(reading.get('Group.boxShadowColor')).toMatchObject({ verdict: 'reaches-under', how: expect.stringContaining('boxShadowEnabled=true') });
  });

  it('Page Stack’s Name reaches — the probe emits a fresh IR each time, past the per-IR stack-index cache', () => {
    expect(reading.get('Page Stack.name')?.verdict).toBe('reaches');
  });
});
