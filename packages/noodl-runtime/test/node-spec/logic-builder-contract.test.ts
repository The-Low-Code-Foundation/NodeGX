/**
 * @jest-environment ../nodegx-node-spec/tests/jest-env-real-process.js
 *
 * NSP-017 AC2 — each rule of the Visual Function's contract has a fixture that goes red when the rule is broken, planted and shown.
 *
 * Each plant is ONE textual change to a COPY of `logic-builder.ts`, made in memory from the source text, transpiled and registered on
 * a fresh target (the real file is never touched — `git checkout --` kills a peer's edit). The spec's scenarios (`scenarios/Logic
 * Builder.json`, one fixture per rule: `LOGIC_BUILDER_FIXTURES`) are played on that target, and the scenario that names the rule must
 * fail. The two rules a lone node cannot show — every run sends what it wrote, the same value too; a throw sends nothing it wrote — are
 * planted the same way and graded by their graph scenarios (`scenarios/graph/t15-a-visual-function-sends-every-run.json`).
 *
 * The control: the same copy with NO change conforms on every scenario and bears every graph claim out — so a red below is the
 * plant, not the copying.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { NodeModule } from '@noodl/types';

import { checkClaims, LogicBuilder, loadGraphScenarios, playGraph, runConformance } from '../../../nodegx-node-spec/src';
import { runtimeTarget, withViewerNodes, type RuntimeTarget } from '../helpers/node-spec-target';

import NodeDefinition = require('../../src/nodedefinition');

const FILE = path.join(__dirname, '..', '..', 'src', 'nodes', 'std-library', 'logic-builder.ts');
const ORIGINAL = fs.readFileSync(FILE, 'utf8');

/** A copy of the Visual Function's module with one textual change (none for the control), compiled in memory. */
function copyWith(find?: string, replace?: string): NodeModule {
  let source = ORIGINAL;
  if (find !== undefined) {
    const at = source.indexOf(find);
    if (at < 0 || source.indexOf(find, at + 1) >= 0) throw new Error(`logic-builder.ts must contain ${JSON.stringify(find)} exactly once — re-read the file`);
    source = source.replace(find, replace!);
  }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const dir = path.dirname(FILE);
  const module = { exports: {} as NodeModule };
  const localRequire = (spec: string) => (spec.startsWith('.') ? require(path.resolve(dir, spec)) : require(spec));
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  return module.exports;
}

function targetWith(module: NodeModule): RuntimeTarget {
  const target = withViewerNodes(runtimeTarget());
  target.context.nodeRegister.register(NodeDefinition.defineNode(module.node!));
  return target;
}

async function failedScenarios(module: NodeModule): Promise<string[]> {
  const report = await runConformance(LogicBuilder, targetWith(module), { sequences: 0 });
  return report.scenarios.filter((s) => s.status !== 'passed').map((s) => s.name);
}

const GRAPH = loadGraphScenarios().filter((s) => s.file?.endsWith('t15-a-visual-function-sends-every-run.json'));

async function failedClaims(module: NodeModule): Promise<string[]> {
  const failed: string[] = [];
  for (const sc of GRAPH) {
    const trace = await playGraph(targetWith(module), sc);
    if (checkClaims(trace, sc.claims).length > 0) failed.push(sc.name);
  }
  return failed;
}

const LANDING = 'internal.outputValues[outputName] = context.Outputs[outputName];\n          this.registerOutputIfNeeded(outputName);\n          this.flagOutputDirty(outputName);';

/** The rules, each with its plant and the scenario (a prefix of its name) that must go red. */
const PLANTS: Array<{ rule: string; find: string; replace: string; red: string }> = [
  {
    rule: 'a value arrives as Inputs[<name>]',
    find: 'internal.inputValues[name] = value;',
    replace: 'internal.inputValues[name.toUpperCase()] = value;',
    red: 'values arrive and wait for Run'
  },
  {
    rule: 'a value arriving runs nothing',
    find: "// Don't auto-execute - wait for signal inputs",
    replace: "this._executeLogic('run');",
    red: 'values arrive and wait for Run'
  },
  {
    rule: 'a signal input the blocks declare is a signal, and runs the program',
    find: 'if (io.signalInputs.indexOf(name) !== -1) {\n        // `registerInput`',
    replace: 'if (false) {\n        // `registerInput`',
    red: 'a signal input the blocks declare'
  },
  {
    rule: 'a signal input the blocks declare answers its own invocation',
    find: 'this._executeLogic(name, this.beginOutcome());',
    replace: 'this._executeLogic(name);',
    red: 'a signal input the blocks declare'
  },
  {
    rule: '__triggerSignal__ names the input that started the run',
    find: 'context.__triggerSignal__,',
    replace: "'run',",
    red: 'a signal input the blocks declare'
  },
  {
    rule: '__p hands its value back',
    find: 'recorder ? recorder.probeValue : IDENTITY_VALUE_PROBE,',
    replace: 'recorder ? recorder.probeValue : () => undefined,',
    red: 'values arrive and wait for Run'
  },
  {
    rule: "Inputs is the node's own object: what the code writes there is what the next run reads",
    find: 'Inputs: internal.inputValues,',
    replace: 'Inputs: { ...internal.inputValues },',
    red: 'the code writes to Inputs'
  },
  {
    rule: 'a signal the code sends fires',
    find: 'self.registerOutputIfNeeded(name);\n          self.sendSignalOnOutput(name);',
    replace: 'self.registerOutputIfNeeded(name);',
    red: 'a signal sent fires at once'
  },
  {
    rule: 'Success fires when the run has gone through',
    find: "this.sendSignalOnOutput('success');",
    replace: '',
    red: 'values arrive and wait for Run'
  },
  {
    rule: 'Done answers a run that went through',
    find: "if (token) this.reportOutcome(token, 'done');",
    replace: '',
    red: 'values arrive and wait for Run'
  },
  {
    rule: "a throw: Error is its message, or its text when it has none",
    find: "'logic-builder/blocks-threw',\n          error && error.message ? String(error.message) : String(error),",
    replace: "'logic-builder/blocks-threw',\n          String(error),",
    red: 'whatever is thrown'
  },
  {
    rule: 'a throw answers the run failure',
    find: "'logic-builder/blocks-threw',",
    replace: "'logic-builder/threw',",
    red: 'a throw: the signal before it fired'
  },
  {
    rule: 'a good run after a failure clears Error to blank',
    find: 'internal.executionError = null;\n        this.flagOutputDirty(\'error\');',
    replace: '',
    red: 'a throw: the signal before it fired'
  },
  {
    rule: 'code that will not compile: Error says so in the engine\'s words, at the run',
    find: "'The blocks could not be compiled: ' + internal.compileError,",
    replace: 'internal.compileError,',
    red: 'code that will not compile'
  },
  {
    rule: 'no code: a run is answered Unchanged',
    find: "if (token) this.reportOutcome(token, 'unchanged');",
    replace: "if (token) this.reportOutcome(token, 'done');",
    red: 'no code'
  },
  {
    rule: 'a value written to a name the node owns fails the run, and the others land',
    find: 'if (reservedName !== null) {',
    replace: 'if (false) {',
    red: 'a value written to a name the node owns'
  },
  {
    // P109 ISL-051 row C149 (s34): the signal side now answers as the value side — the run fails, no Success, no Done.
    rule: 'a signal sent to a name the node owns fails the run, and the values land',
    find: 'if (internal.refusedSignal) {',
    replace: 'if (false) {',
    red: 'a signal sent to a name the node owns'
  },
  {
    rule: "a port's kind is read off the blocks the node was placed with first",
    find: "const source = (typeof fromModel === 'string' && fromModel) || internal.workspace || '';",
    replace: "const source = internal.workspace || (typeof fromModel === 'string' && fromModel) || '';",
    red: "the kinds are the placing's"
  }
];

describe('NSP-017 AC2 — the Visual Function contract: every rule has a fixture that goes red when the rule is broken', () => {
  test('the control: an unchanged copy conforms on every scenario and bears every graph claim out', async () => {
    const control = copyWith();
    expect(await failedScenarios(control)).toEqual([]);
    expect(GRAPH.length).toBe(2);
    expect(await failedClaims(control)).toEqual([]);
  }, 120_000);

  for (const p of PLANTS) {
    test(`planted: ${p.rule}`, async () => {
      const failed = await failedScenarios(copyWith(p.find, p.replace));
      expect(failed.some((name) => name.startsWith(p.red))).toBe(true);
    }, 120_000);
  }

  test('planted: a value is sent only when it changed — the graph scenario that runs the Function again stops holding', async () => {
    const failed = await failedClaims(
      copyWith(
        LANDING,
        'const changed = internal.outputValues[outputName] !== context.Outputs[outputName];\n          ' + LANDING.replace('this.flagOutputDirty(outputName);', 'if (changed) this.flagOutputDirty(outputName);')
      )
    );
    expect(failed).toEqual([GRAPH[0].name]);
  }, 120_000);

  test('planted: a value lands as the code writes it — the graph scenario where a throw sends nothing stops holding', async () => {
    const failed = await failedClaims(
      copyWith(
        "Outputs: {},",
        'Outputs: new Proxy({} as Record<string, unknown>, { set: (o, k: string, v) => { o[k] = v; internal.outputValues[k] = v; self.registerOutputIfNeeded(k); self.flagOutputDirty(k); return true; } }),'
      )
    );
    // the plant sends each value twice (as written, then landed), so the every-run scenario may go red beside it: the throw's is the one named
    expect(failed).toContain(GRAPH[1].name);
  }, 120_000);

  test('the real file was not touched by the copies', () => {
    expect(fs.readFileSync(FILE, 'utf8')).toBe(ORIGINAL);
  });
});
