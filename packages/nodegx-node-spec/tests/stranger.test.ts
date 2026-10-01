/**
 * NSP-006 — a stranger's target: nodes built in plain JavaScript by an agent that was handed the
 * spec files, their scenarios, the trace schema, the adapter interface and this test — and nothing
 * of the runtime, the exporter or this phase's docs (the lab is a copy of this package with no git
 * history; NSP-006 §5 says how it was built). Round 1 (s5) is the pilot five in `stranger/`;
 * round 2 (s6) is the five plus Inverter and Boolean To String in `stranger-2/` — the two nodes
 * whose output passes through `undefined` mid-frame, the hole round 1's engine had (§5.4). The
 * rounds are listed in `tests/stranger-suite-hashes.helper.js` (plain JS, so a lab copy can point
 * its one round at its own directory).
 *
 * This file is the runner command a stranger loops on, and afterwards the permanent gate, per round:
 *
 *   AC1  every node of the round conforms on `<dir>/target.js` at 200 (this file in CI) and at
 *        the deep budget (`NSP_DEEP=10000 npx jest tests/stranger.test.ts -t deep`), with the
 *        suite's hashes unchanged — a spec or scenario the stranger edited fails the run whatever
 *        the result (`tests/stranger-suite-hashes.json`).
 *   AC2  every mutant of a spec is CAUGHT by the stranger's target: with the mutant as the
 *        reference and the stranger as the actual, at least one suite item differs. A target that
 *        satisfied the suite trivially would agree with a mutant somewhere.
 *   AC4  the target is a fixture, not a product: it imports nothing from `src/` (a static check).
 *
 *   NSP_ONLY="Counter,Switch" npx jest tests/stranger.test.ts     one node (or a comma-separated list)
 *   NSP_DEEP=10000 npx jest tests/stranger.test.ts -t deep         the deep run
 *
 * When a guarded file changes ON PURPOSE (a spec fix under NSP-006 AC3, a scenario added), every
 * round's target is re-graded and the hashes refreshed in the same commit:
 *   node -e "require('./tests/stranger-suite-hashes.helper.js').write()"
 */

import * as fs from 'fs';
import * as path from 'path';

import type { AnyNodeSpec, Step, TargetAdapter, TraceEvent } from '../src';
import { compareTraces, discoverBranches, formatReport, generateSequence, interpreterAdapter, loadScenarios, mutantsOf, play, PlayError, runConformance, validateTrace, World, type WorldScript } from '../src';
import { specFor } from '../src/nodes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rounds = require('./stranger-suite-hashes.helper.js') as {
  ROUNDS: Array<{ round: number; dir: string; session: string; nodes: string[]; guarded: string[] }>;
  GUARDED_FILES: string[];
  hashOf: (relative: string) => string;
};

const ROOT = path.join(__dirname, '..');
const HASHES_FILE = path.join(__dirname, 'stranger-suite-hashes.json');
const only = process.env.NSP_ONLY ? process.env.NSP_ONLY.split(',') : undefined;
const deep = Number(process.env.NSP_DEEP || 0);

/**
 * NSP-013 s13 (round 3): a spec that needs the world is played in a FRESH world built from the
 * scenario's or the sequence's script, one per play — as `runConformance` does; a spec with no
 * `needs` gets none (rounds 1 and 2 are unchanged by this).
 */
const worldFor = (spec: AnyNodeSpec, script: WorldScript | undefined): World | undefined => (spec.needs && spec.needs.length > 0 ? new World(script ?? {}) : undefined);

/** `<dir>/target.js` exports `strangerTarget(): TargetAdapter` — a FRESH target per call. */
function loadTarget(targetFile: string): TargetAdapter {
  if (!fs.existsSync(targetFile)) {
    throw new Error(`${targetFile} does not exist — the stranger's target is a CommonJS module there exporting strangerTarget(): TargetAdapter`);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(targetFile) as { strangerTarget?: unknown };
  if (typeof mod.strangerTarget !== 'function') throw new Error(`${targetFile} must export a function strangerTarget() returning a TargetAdapter`);
  const target = (mod.strangerTarget as () => TargetAdapter)();
  for (const m of ['mount', 'set', 'signal', 'settle', 'trace', 'dispose'] as const) {
    if (typeof target[m] !== 'function') throw new Error(`the stranger's target has no ${m}()`);
  }
  if (typeof target.name !== 'string' || !target.name) throw new Error("the stranger's target needs a name");
  return target;
}

describe('NSP-006 — the suite the strangers were handed is unchanged (hash gate; fails the run whatever the result)', () => {
  test('every guarded file hashes as recorded in tests/stranger-suite-hashes.json', () => {
    if (!fs.existsSync(HASHES_FILE)) throw new Error(`${HASHES_FILE} missing — write it with: node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`);
    const recorded = JSON.parse(fs.readFileSync(HASHES_FILE, 'utf8')) as Record<string, string>;
    const changed: string[] = [];
    for (const f of rounds.GUARDED_FILES) {
      if (recorded[f] !== rounds.hashOf(f)) changed.push(`${f}: recorded ${recorded[f] ?? '<none>'} now ${rounds.hashOf(f)}`);
    }
    expect(changed).toEqual([]);
    expect(Object.keys(recorded).sort()).toEqual([...rounds.GUARDED_FILES].sort());
  });
});

for (const round of rounds.ROUNDS) {
  const STRANGER_DIR = path.join(ROOT, round.dir);
  const TARGET_FILE = path.join(STRANGER_DIR, 'target.js');
  const strangerTarget = () => loadTarget(TARGET_FILE);
  const handed = round.nodes.map((n) => {
    const spec = specFor(n);
    if (!spec) throw new Error(`round ${round.round} names a node with no spec: ${n}`);
    return spec as AnyNodeSpec;
  });
  const graded = handed.filter((s) => !only || only.includes(s.type));
  const label = `round ${round.round} (${round.session}, ${round.dir}/)`;

  describe(`NSP-006 AC4 ${label} — the target is a second, independent implementation: it imports nothing from src/`, () => {
    test(`every file under ${round.dir}/ requires only its own siblings`, () => {
      const offences: string[] = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (/\.(c?js|mjs|ts)$/.test(entry.name)) {
            const text = fs.readFileSync(full, 'utf8');
            const specifiers = [...text.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g), ...text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g), ...text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
            for (const s of specifiers) {
              const resolved = s.startsWith('.') ? path.resolve(path.dirname(full), s) : null;
              if (!resolved || !resolved.startsWith(STRANGER_DIR + path.sep)) offences.push(`${path.relative(ROOT, full)} → ${s}`);
            }
          }
        }
      };
      expect(fs.existsSync(STRANGER_DIR)).toBe(true);
      walk(STRANGER_DIR);
      expect(offences).toEqual([]);
    });
  });

  describe(`NSP-006 AC1 ${label} — every node handed conforms on the stranger's target at 200 (the day's seed), every mutant killed`, () => {
    const reports = new Map<string, ReturnType<typeof formatReport>>();
    for (const spec of graded) {
      test(`${spec.type} conforms on the stranger's target`, async () => {
        const report = await runConformance(spec, strangerTarget(), { sequences: 200, mutants: true });
        reports.set(spec.type, formatReport(report));
        // eslint-disable-next-line no-console
        console.log(formatReport(report));
        expect(report.refused).toBeUndefined();
        // a row-marked scenario is about the RUNTIME's defect; on the stranger it passes, and the runner says the row does not reproduce here
        expect(report.scenarios.filter((s) => s.status !== 'passed').map((s) => `${s.status} ${s.name}`)).toEqual([]);
        expect(report.generated.ran).toBe(200);
        expect(report.generated.divergences.map((d) => JSON.stringify([d.params, d.steps, d.difference]))).toEqual([]);
        expect(report.mutants!.survivors).toEqual([]);
        expect(report.mutants!.unreached).toEqual([]);
        expect(report.conforms).toBe(true);
      }, 120_000);
    }

    test('every trace the stranger produces validates against schema/trace.schema.json', async () => {
      const offences: string[] = [];
      for (const spec of graded) {
        for (const sc of loadScenarios(spec.type)) {
          const t = await play(strangerTarget(), spec.type, sc.params, sc.steps, worldFor(spec, sc.world));
          const v = validateTrace(t);
          if (v.ok === false) offences.push(`${spec.type} / ${sc.name}: ${v.path} ${v.message}`);
        }
      }
      expect(offences).toEqual([]);
    });
  });

  describe(`NSP-006 AC2 ${label} — every mutant of a spec is caught by the stranger's target (the suite is not trivially satisfied)`, () => {
    for (const spec of graded) {
      test(`${spec.type}: with each mutant as the reference, the stranger disagrees somewhere`, async () => {
        const suite: Array<{ name: string; params: Record<string, unknown>; steps: Step[]; world?: WorldScript }> = loadScenarios(spec.type).map((s) => ({ name: `scenario ${s.name}`, params: s.params, steps: s.steps, world: s.world }));
        for (let i = 0; i < 200; i++) {
          const seq = generateSequence(spec, 20726, i);
          suite.push({ name: `sequence ${i}`, params: seq.params, steps: seq.steps, world: seq.world });
        }
        // branches are DISCOVERED by playing the suite through the wrapped spec (as runConformance does)
        const discovered = discoverBranches(spec);
        const probe = interpreterAdapter({ resolve: () => discovered.spec });
        for (const item of suite) await play(probe, spec.type, item.params, item.steps, worldFor(spec, item.world));
        const mutants = mutantsOf(spec, discovered.branches);
        expect(mutants.length).toBeGreaterThan(0);
        const survivors: string[] = [];
        for (const m of mutants) {
          const mutant = interpreterAdapter({ resolve: () => m.spec });
          let caught: string | undefined;
          for (const item of suite) {
            let reference: TraceEvent[];
            try {
              reference = await play(mutant, spec.type, item.params, item.steps, worldFor(spec, item.world));
            } catch (e) {
              caught = `${item.name}: the mutant broke a spec rule (${(e as Error).message})`;
              break;
            }
            let actual: TraceEvent[];
            try {
              actual = await play(strangerTarget(), spec.type, item.params, item.steps, worldFor(spec, item.world));
            } catch (e) {
              if (!(e instanceof PlayError)) throw e;
              caught = `${item.name}: the stranger threw (${e.message})`;
              break;
            }
            if (compareTraces(reference, actual).index >= 0) {
              caught = item.name;
              break;
            }
          }
          if (!caught) survivors.push(`${m.reducer} ${m.kind} on ${m.branch}${m.swappedWith ? ' ↔ ' + m.swappedWith : ''}`);
        }
        // eslint-disable-next-line no-console
        console.log(`${spec.type}: ${mutants.length - survivors.length} / ${mutants.length} mutants caught by the stranger's target`);
        expect(survivors).toEqual([]);
      }, 300_000);
    }
  });

  (deep > 0 ? describe : describe.skip)(`NSP-006 AC1 deep run ${label} — ${deep} sequences on the stranger's target, shrink on`, () => {
    for (const spec of graded) {
      test(`${spec.type} at ${deep}`, async () => {
        const report = await runConformance(spec, strangerTarget(), { sequences: deep, shrink: true, mutants: true, replayDir: process.env.NSP_REPLAY_DIR });
        // eslint-disable-next-line no-console
        console.log(formatReport(report));
        expect(report.generated.divergences.map((d) => JSON.stringify([d.params, d.steps, d.difference]))).toEqual([]);
        expect(report.conforms).toBe(true);
      }, 3_600_000);
    }
  });
}
