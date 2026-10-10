/**
 * NSP-010 AC3 — Counter's history: the FH-022 slice 3 Reset change, recorded with its before and after traces, and the
 * before-traces REPRODUCED on the runtime as it was at the commit before the change.
 *
 * The old runtime's Counter is read with `git show 328a025dc^:<path>` and compiled in memory (the pattern of
 * conformance.test.ts `copyOfCounterWith`): nothing is checked out and nothing is written to the tree. It is registered on
 * a fresh runtime target under its own name, so the target plays the Counter of 5 August 2026 with today's runtime around it.
 *
 * The history file (`packages/nodegx-node-spec/golden/changes/Counter@1.json`) holds the hand scenarios whose trace the
 * change moved: `before` from the old runtime, `after` from the spec (the golden file). `NSP010_WRITE=1` rewrites it.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { NodeModule } from '@noodl/types';

import { canonicalise, Counter, loadScenarios, play } from '../../../nodegx-node-spec/src';
import type { Golden, TraceEvent } from '../../../nodegx-node-spec/src';
import { runtimeTarget } from '../helpers/node-spec-target';

import NodeDefinition = require('../../src/nodedefinition');

const REPO = path.join(__dirname, '..', '..', '..', '..');
const COUNTER_REL = 'packages/noodl-runtime/src/nodes/std-library/counter.ts';
const GOLDEN = path.join(REPO, 'packages', 'nodegx-node-spec', 'golden');
const HISTORY_FILE = path.join(GOLDEN, 'changes', 'Counter@1.json');

const change = Counter.changes?.find((c) => c.version === 1);
const BEFORE = `${change?.commit}^`;

interface History {
  type: string;
  version: number;
  row?: string;
  commit: string;
  /** The runtime the before-traces were played on. */
  before: string;
  scenarios: Array<{ name: string; before: TraceEvent[]; after: TraceEvent[] }>;
}

/** The runtime's Counter at a commit, compiled in memory; its relative imports resolve against today's tree (outcome.ts is unchanged since). */
function counterAt(rev: string): NodeModule {
  const shown = spawnSync('git', ['show', `${rev}:${COUNTER_REL}`], { cwd: REPO, encoding: 'utf8' });
  if (shown.status !== 0) throw new Error(`git show ${rev}:${COUNTER_REL} — ${shown.stderr.trim()}`);
  const js = ts.transpileModule(shown.stdout, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
  const dir = path.join(REPO, path.dirname(COUNTER_REL));
  const module = { exports: {} as NodeModule };
  const localRequire = (spec: string) => (spec.startsWith('.') ? require(path.resolve(dir, spec)) : require(spec));
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  return module.exports;
}

const hasCommit = spawnSync('git', ['cat-file', '-e', `${BEFORE}:${COUNTER_REL}`], { cwd: REPO }).status === 0;
// a shallow CI clone has no history to read the old runtime from; anywhere else a missing commit is a failure, not a skip
const shallow = !hasCommit && !!process.env.CI;

describe('NSP-010 AC3 — Counter v1 records FH-022 slice 3', () => {
  test('the change entry names the commit and answers the migration', () => {
    expect(change).toBeDefined();
    expect(change!.commit).toBe('328a025dc');
    expect(Object.keys(change!.migration)).toEqual(['none']);
  });

  (shallow ? test.skip : test)(`the before-traces reproduce on the runtime at ${BEFORE} (read with git show, never checked out)`, async () => {
    expect(hasCommit).toBe(true);
    const old = runtimeTarget();
    old.context.nodeRegister.register(NodeDefinition.defineNode(counterAt(BEFORE).node));
    const golden = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'Counter.json'), 'utf8')) as Golden;
    const after = new Map(golden.scenarios.map((s) => [s.name, s.trace]));

    const moved: History['scenarios'] = [];
    for (const sc of loadScenarios('Counter')) {
      const before = canonicalise(await play(old, 'Counter', sc.params, sc.steps)) as unknown as TraceEvent[];
      const now = after.get(sc.name)!;
      if (JSON.stringify(before) !== JSON.stringify(now)) moved.push({ name: sc.name, before, after: now });
    }

    if (process.env.NSP010_WRITE) {
      const history: History = { type: 'Counter', version: 1, row: change!.row, commit: change!.commit!, before: BEFORE, scenarios: moved };
      fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 1) + '\n');
    }
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) as History;
    // the arm has a predicate: the change moved at least one hand scenario, and the old runtime is not today's
    expect(moved.length).toBeGreaterThan(0);
    expect(moved).toEqual(history.scenarios);
    for (const s of moved) expect(s.before).not.toEqual(s.after);
  });

  test("the after-traces are today's golden file", () => {
    const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) as History;
    const golden = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'Counter.json'), 'utf8')) as Golden;
    for (const s of history.scenarios) expect(golden.scenarios.find((g) => g.name === s.name)?.trace).toEqual(s.after);
  });
});
