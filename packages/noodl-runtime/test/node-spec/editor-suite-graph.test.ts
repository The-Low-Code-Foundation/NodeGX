/**
 * P112 OWN-003 / OWN-006 — the editor suite's graph half: an adapter that offers its own graph runner
 * (`graphTarget()`) is graded on the spec package's graph scenarios as well as on its files.
 *
 * It lives here, not in the suite's package, because the runner under test is the runtime test helper
 * (`runtimeTarget`), which compiles only where the runtime does. Three arms:
 *   - the real engine as the runner: PASS, every scenario graded (the runner the kit ships, `@nodegx/preview`'s page
 *     bundle, is this helper bundled — `graph-target-check` grades it there);
 *   - the control: the same engine with a `settle()` that runs two frames — a runner wrong in the way the task file
 *     warns of — FAILs, and the sentences name the clause;
 *   - a runner and no grader: not a pass (a check that silently skips reads green on nothing).
 */

import * as fs from 'fs';
import * as path from 'path';

import { loadGraphScenarios, playGraphForGrading, reviveGraphScenarios } from '../../../nodegx-node-spec/src';
import { referenceAdapter, runSuite, type Edit, type EditorAdapter } from '../../../nodegx-project-contract/editor-suite';
import { graphGraderFromNodeSpec, readProjectTree } from '../../../nodegx-project-contract/editor-suite-node';
import { runtimeTarget, withViewerNodes, type RuntimeTarget } from '../helpers/node-spec-target';

const fixturesDir = path.join(__dirname, '..', '..', '..', 'nodegx-project-contract', 'tests', 'fixtures', 'editor-suite');
const fixture = {
  name: 'small',
  files: readProjectTree(path.join(fixturesDir, 'small')),
  edits: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'small.edits.json'), 'utf8')) as Edit[]
};

/** The reference editor with a graph runner bolted on: what an editor that runs the kit's runner looks like to the suite. */
function withRunner(make: () => RuntimeTarget): EditorAdapter {
  const inner = referenceAdapter();
  return { name: 'reference + a runner', open: (f) => inner.open(f), apply: (e) => inner.apply(e), save: () => inner.save(), graphTarget: make };
}

/** The second door: an editor that plays each scenario itself (as a page does) and hands the trace back. */
function withPlayer(make: () => RuntimeTarget): EditorAdapter {
  const inner = referenceAdapter();
  return {
    name: 'reference + a player',
    open: (f) => inner.open(f),
    apply: (e) => inner.apply(e),
    save: () => inner.save(),
    async playGraph(scenario, file) {
      const [sc] = reviveGraphScenarios([scenario], file);
      return playGraphForGrading(make(), sc);
    }
  };
}

/** The control's runner: the same engine with a `settle()` that runs two frames. */
function twoFrames(): RuntimeTarget {
  const target = withViewerNodes(runtimeTarget());
  const settle = target.settle.bind(target);
  target.settle = async () => {
    await settle();
    await settle();
  };
  return target;
}

describe('P112 OWN-003 — the editor suite grades a graph runner', () => {
  const total = loadGraphScenarios().length;

  test('the real engine as the runner passes, every scenario graded', async () => {
    const report = await runSuite(withRunner(() => withViewerNodes(runtimeTarget())), fixture, { graph: graphGraderFromNodeSpec() });
    expect(report.sentences).toEqual([]);
    expect(report.pass).toBe(true);
    expect(report.graph?.summary).toContain(`${total} passed`);
    expect(report.graph?.summary).toContain(`of ${total}`);
  }, 120_000);

  test('the control: a settle that runs two frames fails, and the sentences name the clause', async () => {
    const report = await runSuite(withRunner(twoFrames), fixture, { graph: graphGraderFromNodeSpec() });
    expect(report.pass).toBe(false);
    const graph = report.sentences.filter((s) => s.startsWith('graph scenarios: ['));
    expect(graph.length).toBeGreaterThan(0);
    // C9 (runaway work is broken) is one the second frame always moves: the breaker's re-flag lands a frame early
    expect(graph.some((s) => /^graph scenarios: \[[^\]]*\bC9\b/.test(s))).toBe(true);
    expect(report.graph?.summary).toMatch(/\d+ failed/);
  }, 120_000);

  test('the second door: an editor that plays each scenario itself passes, every scenario graded', async () => {
    const report = await runSuite(withPlayer(() => withViewerNodes(runtimeTarget())), fixture, { graph: graphGraderFromNodeSpec() });
    expect(report.sentences).toEqual([]);
    expect(report.pass).toBe(true);
    expect(report.graph?.summary).toContain(`${total} passed`);
  }, 120_000);

  test('the second door, the control: the two-frames engine fails there too, naming C9', async () => {
    const report = await runSuite(withPlayer(twoFrames), fixture, { graph: graphGraderFromNodeSpec() });
    expect(report.pass).toBe(false);
    expect(report.sentences.some((s) => /^graph scenarios: \[[^\]]*\bC9\b/.test(s))).toBe(true);
  }, 120_000);

  test('a runner the suite was handed no grader for is not a pass', async () => {
    const report = await runSuite(withRunner(() => withViewerNodes(runtimeTarget())), fixture);
    expect(report.pass).toBe(false);
    expect(report.sentences.join('\n')).toMatch(/has a graph runner .* no grader/);
  });

  test('an adapter without a runner is graded on its files alone, as before', async () => {
    const report = await runSuite(referenceAdapter(), fixture, { graph: graphGraderFromNodeSpec() });
    expect(report.pass).toBe(true);
    expect(report.graph).toBeUndefined();
  });
});
