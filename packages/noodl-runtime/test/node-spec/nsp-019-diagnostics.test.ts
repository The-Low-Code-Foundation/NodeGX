/**
 * NSP-019 s95 — what a node tells the editor about its own settings is on the trace, and the runtime's sentence is the spec's.
 *
 * Richard's drive of the "How this node works" modal (2026-10-12): Start 2, Min 3, Max 1 on a Counter, and nothing anywhere
 * said the settings were wrong. The runtime had a channel for exactly that (diagnostics.ts `setDiagnostic`,
 * DIAGNOSTICS-CONTRACT.md: "two of this node's settings contradict each other" → a diagnostic) and the Counter never used it;
 * the runtime target had no editor, so no diagnostic reached a trace. These read the runtime's own trace — not the comparison,
 * which a target recording nothing on BOTH sides would pass.
 */

import { Counter, interpreterAdapter, play } from '../../../nodegx-node-spec/src';
import type { Step, TraceEvent } from '../../../nodegx-node-spec/src';
import { runtimeTarget } from '../helpers/node-spec-target';

const RICHARDS = { startValue: 2, limitsMin: 3, limitsMax: 1, limitsEnabled: true };
const KEY = 'counter/min-above-max';
const SAID = 'Min Value 3 is above Max Value 1. With Limits Enabled on, the count gets stuck.';

const diagnostics = (trace: TraceEvent[]) => trace.filter((e) => e.t === 'diagnostic');

describe('NSP-019 s95 — the Counter tells the editor when Min is above Max', () => {
  const steps: Step[] = ['settle', { signal: 'increase' }, 'settle', { set: 'limitsMax', value: 5 }, 'settle'];

  test('the runtime raises it at load, keeps quiet while it holds, and withdraws it when Max is raised', async () => {
    const trace = await play(runtimeTarget(), 'Counter', RICHARDS, steps);
    expect(diagnostics(trace)).toEqual([
      { t: 'diagnostic', key: KEY, message: SAID },
      { t: 'diagnostic', key: KEY }
    ]);
    // the press between them is held, and says so (counter.ts :50-53)
    expect(trace).toContainEqual({ t: 'outcome', port: 'increase', value: 'unchanged' });
  });

  test('the spec says the same sentence at the same settles', async () => {
    const runtime = await play(runtimeTarget(), 'Counter', RICHARDS, steps);
    const spec = await play(interpreterAdapter({ resolve: (t) => (t === 'Counter' ? Counter : undefined) }), 'Counter', RICHARDS, steps);
    expect(spec).toEqual(runtime);
  });

  test('control: settings that agree raise nothing, on the runtime', async () => {
    const trace = await play(runtimeTarget(), 'Counter', { ...RICHARDS, limitsMin: 0 }, steps);
    expect(diagnostics(trace)).toEqual([]);
    // the same play does record — values arrive, so an empty list is about the predicate, not a dead recorder
    expect(trace.some((e) => e.t === 'value')).toBe(true);
  });

  test('a target without an editor is not graded on them; the interpreter and the runtime are', () => {
    expect(runtimeTarget().diagnostics).toBe(true);
    expect(interpreterAdapter().diagnostics).toBe(true);
  });
});
