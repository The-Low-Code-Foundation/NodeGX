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

import type { AnyNodeSpec, MountContext, Step, TargetAdapter, TraceEvent } from '../src';
import { compareTraces, discoverBranches, formatReport, generateSequence, interpreterAdapter, loadScenarios, mutantsOf, play, playContextOfScenario, PlayError, runConformance, validateTrace, withoutUnseenDiagnostics, World, type WorldScript } from '../src';
import { specFor } from '../src/nodes';
import { EQUIVALENT_MUTANTS } from '../src/nodes/equivalent-mutants';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rounds = require('./stranger-suite-hashes.helper.js') as {
  ROUNDS: Array<{ round: number; dir: string; session: string; nodes: string[]; guarded: string[]; page: boolean }>;
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

/**
 * NSP-023 step 8 (round 4) — the page a person acts on (`tests/stranger-page.js`): one per process, handed to a page round's
 * target as `strangerTarget(page)`.
 */
type Page = { window: unknown; document: unknown; act(root: unknown, act: string, value?: unknown): void };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pageOf = (): Page => (require('./stranger-page.js') as { makePage(): Page }).makePage();

/**
 * NSP-023 step 8 — a mutant the spec's own ports cannot tell from the original (`EQUIVALENT_MUTANTS`, runner/conformance.ts
 * `isEquivalent`): no target can disagree with it, so it is no survivor of the stranger's either. Matched as the runner matches.
 */
const declaredEquivalent = (type: string, m: { reducer: string; kind: string; branch: string; swappedWith?: string }): boolean =>
  (EQUIVALENT_MUTANTS[type] ?? []).some(
    (e) => e.reducer === m.reducer && (e.kind === undefined || e.kind === m.kind) && (e.branch === undefined || m.branch.includes(e.branch)) && (e.swappedWith === undefined || (m.swappedWith ?? '').includes(e.swappedWith))
  );

/** `<dir>/target.js` exports `strangerTarget(): TargetAdapter` — a FRESH target per call; a page round's takes the page. */
function loadTarget(targetFile: string, page?: Page): TargetAdapter {
  if (!fs.existsSync(targetFile)) {
    throw new Error(`${targetFile} does not exist — the stranger's target is a CommonJS module there exporting strangerTarget(): TargetAdapter`);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require(targetFile) as { strangerTarget?: unknown };
  if (typeof mod.strangerTarget !== 'function') throw new Error(`${targetFile} must export a function strangerTarget() returning a TargetAdapter`);
  const target = page ? (mod.strangerTarget as (p: Page) => TargetAdapter)(page) : (mod.strangerTarget as () => TargetAdapter)();
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
  const strangerTarget = (page: Page | undefined = round.page ? pageOf() : undefined) => loadTarget(TARGET_FILE, page);
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
        const report = await runConformance(spec, strangerTarget(), { sequences: 200, mutants: true, equivalent: EQUIVALENT_MUTANTS[spec.type] });
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
        // s105 — each item keeps the wires its scenario names (`wired`, C155) and its mount context (`wiredOutputs`, R38's
        // `parent`), as runConformance plays it: without them a play the spec reads a wire in (R38's warning) was not the scenario
        const suite: Array<{ name: string; params: Record<string, unknown>; steps: Step[]; world?: WorldScript; wired?: readonly string[]; context?: Readonly<MountContext> }> = loadScenarios(spec.type).map((s) => ({ name: `scenario ${s.name}`, params: s.params, steps: s.steps, world: s.world, wired: s.wired, context: playContextOfScenario(s) }));
        for (let i = 0; i < 200; i++) {
          const seq = generateSequence(spec, 20726, i);
          suite.push({ name: `sequence ${i}`, params: seq.params, steps: seq.steps, world: seq.world, context: playContextOfScenario(seq) });
        }
        // branches are DISCOVERED by playing the suite through the wrapped spec (as runConformance does)
        const discovered = discoverBranches(spec);
        const probe = interpreterAdapter({ resolve: () => discovered.spec });
        for (const item of suite) await play(probe, spec.type, item.params, item.steps, worldFor(spec, item.world), item.wired, item.context);
        const mutants = mutantsOf(spec, discovered.branches);
        expect(mutants.length).toBeGreaterThan(0);
        // NSP-019 s95 — the reference as this target can see it (runConformance does the same): a stranger's target has no
        // editor, so a `diagnostic` event in the reference would "catch" every mutant of a node that declares one, for nothing
        const seenBy = strangerTarget();
        // NSP-019 R35 (s103) — what an editor would see of the spec itself: a mutant this target cannot catch that differs from it
        // there changes only what the node tells the editor (runConformance's `editorOnly`), graded where there is one
        const truth: TraceEvent[][] = [];
        for (const item of suite) truth.push(await play(interpreterAdapter({ resolve: () => spec }), spec.type, item.params, item.steps, worldFor(spec, item.world), item.wired, item.context));
        const survivors: string[] = [];
        let editorOnly = 0;
        for (const m of mutants) {
          const mutant = interpreterAdapter({ resolve: () => m.spec });
          let caught: string | undefined;
          let seenByEditor = false;
          for (const [i, item] of suite.entries()) {
            let reference: TraceEvent[];
            try {
              const full = await play(mutant, spec.type, item.params, item.steps, worldFor(spec, item.world), item.wired, item.context);
              if (!seenBy.diagnostics && !seenByEditor && compareTraces(truth[i], full).index >= 0) seenByEditor = true;
              reference = withoutUnseenDiagnostics(full, seenBy);
            } catch (e) {
              caught = `${item.name}: the mutant broke a spec rule (${(e as Error).message})`;
              break;
            }
            let actual: TraceEvent[];
            try {
              actual = await play(strangerTarget(), spec.type, item.params, item.steps, worldFor(spec, item.world), item.wired, item.context);
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
          if (!caught && seenByEditor) editorOnly++;
          else if (!caught && !declaredEquivalent(spec.type, m)) survivors.push(`${m.reducer} ${m.kind} on ${m.branch}${m.swappedWith ? ' ↔ ' + m.swappedWith : ''}`);
        }
        // eslint-disable-next-line no-console
        console.log(`${spec.type}: ${mutants.length - survivors.length - editorOnly} / ${mutants.length} mutants caught by the stranger's target${editorOnly ? `, ${editorOnly} seen only by an editor` : ''}`);
        expect(survivors).toEqual([]);
      }, 300_000);
    }
  });

  /**
   * NSP-023 step 8 (AC5) — the person reaches the node THROUGH THE PAGE. A target that answered an act from its own copy of the
   * spec's reducer would conform as well as one whose answer comes from the listeners on the elements it drew. So each act is
   * made deaf in turn — `page.act` raises nothing for it — and the target must then disagree with the spec somewhere in the
   * suite (the hand scenarios and 200 sequences, seed 20726): an act whose answer survives a deaf page did not come from it.
   */
  if (round.page) describe(`NSP-023 AC5 ${label} — every act reaches the node through the page: deafen it and the target disagrees`, () => {
    for (const spec of graded) {
      test(`${spec.type}: each declared act, raised on no element, changes some trace`, async () => {
        // s105 — each item keeps the wires its scenario names (`wired`, C155) and its mount context (`wiredOutputs`, R38's
        // `parent`), as runConformance plays it: without them a play the spec reads a wire in (R38's warning) was not the scenario
        const suite: Array<{ name: string; params: Record<string, unknown>; steps: Step[]; world?: WorldScript; wired?: readonly string[]; context?: Readonly<MountContext> }> = loadScenarios(spec.type).map((s) => ({ name: `scenario ${s.name}`, params: s.params, steps: s.steps, world: s.world, wired: s.wired, context: playContextOfScenario(s) }));
        for (let i = 0; i < 200; i++) {
          const seq = generateSequence(spec, 20726, i);
          suite.push({ name: `sequence ${i}`, params: seq.params, steps: seq.steps, world: seq.world, context: playContextOfScenario(seq) });
        }
        const reference = interpreterAdapter({ resolve: () => spec });
        const references: TraceEvent[][] = [];
        for (const item of suite) references.push(await play(reference, spec.type, item.params, item.steps, worldFor(spec, item.world), item.wired, item.context));
        const page = pageOf();
        const unheard: string[] = [];
        for (const act of Object.keys(spec.acts ?? {})) {
          const deaf: Page = { ...page, act: (root, name, value) => (name === act ? undefined : page.act(root, name, value)) };
          let heard = false;
          for (let i = 0; i < suite.length && !heard; i++) {
            if (!suite[i].steps.some((st) => typeof st === 'object' && 'act' in st && st.act === act)) continue;
            try {
              heard = compareTraces(references[i], await play(strangerTarget(deaf), spec.type, suite[i].params, suite[i].steps, worldFor(spec, suite[i].world), suite[i].wired, suite[i].context)).index >= 0;
            } catch (e) {
              if (!(e instanceof PlayError)) throw e;
              heard = true;
            }
          }
          if (!heard) unheard.push(act);
        }
        expect(Object.keys(spec.acts ?? {}).length).toBeGreaterThan(0);
        expect(unheard).toEqual([]);
      }, 600_000);
    }
  });

  (deep > 0 ? describe : describe.skip)(`NSP-006 AC1 deep run ${label} — ${deep} sequences on the stranger's target, shrink on`, () => {
    for (const spec of graded) {
      test(`${spec.type} at ${deep}`, async () => {
        const report = await runConformance(spec, strangerTarget(), { sequences: deep, shrink: true, mutants: true, equivalent: EQUIVALENT_MUTANTS[spec.type], replayDir: process.env.NSP_REPLAY_DIR });
        // eslint-disable-next-line no-console
        console.log(formatReport(report));
        expect(report.generated.divergences.map((d) => JSON.stringify([d.params, d.steps, d.difference]))).toEqual([]);
        expect(report.conforms).toBe(true);
      }, 3_600_000);
    }
  });
}
