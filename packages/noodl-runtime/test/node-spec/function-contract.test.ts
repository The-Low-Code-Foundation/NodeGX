/**
 * @jest-environment ../nodegx-node-spec/tests/jest-env-real-process.js
 *
 * NSP-017 AC2 — each rule of the Function's contract has a fixture that goes red when the rule is broken, planted and shown.
 *
 * Each plant is ONE textual change to a COPY of `simplejavascript.ts`, made in memory from the source text, transpiled and
 * registered on a fresh target (the real file is never touched — `git checkout --` kills a peer's edit). The Function spec's
 * scenarios (`scenarios/JavaScriptFunction.json`, one fixture per rule: `FUNCTION_FIXTURES`) are played on that target, and the
 * scenario that names the rule must fail. The rule a lone node cannot show — an output published only when it changes — is
 * planted the same way and graded by its graph scenario (`scenarios/graph/t14-a-function-publishes-on-change.json`), whose claims
 * must stop holding.
 *
 * The control: the same copy with NO change conforms on every scenario and bears every graph claim out — so a red below is the
 * plant, not the copying.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { NodeModule } from '@noodl/types';

import { checkClaims, JavaScriptFunction, loadGraphScenarios, playGraph, runConformance } from '../../../nodegx-node-spec/src';
import { runtimeTarget, withViewerNodes, type RuntimeTarget } from '../helpers/node-spec-target';

import NodeDefinition = require('../../src/nodedefinition');

const FILE = path.join(__dirname, '..', '..', 'src', 'nodes', 'std-library', 'simplejavascript.ts');
const ORIGINAL = fs.readFileSync(FILE, 'utf8');

/** A copy of the Function's module with one textual change (none for the control), compiled in memory. */
function copyWith(find?: string, replace?: string): NodeModule {
  let source = ORIGINAL;
  if (find !== undefined) {
    const at = source.indexOf(find);
    if (at < 0 || source.indexOf(find, at + 1) >= 0) throw new Error(`simplejavascript.ts must contain ${JSON.stringify(find)} exactly once — re-read the file`);
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
  const report = await runConformance(JavaScriptFunction, targetWith(module), { sequences: 0 });
  return report.scenarios.filter((s) => s.status !== 'passed').map((s) => s.name);
}

const GRAPH = loadGraphScenarios().filter((s) => s.file?.endsWith('t14-a-function-publishes-on-change.json'));

async function failedClaims(module: NodeModule): Promise<string[]> {
  const failed: string[] = [];
  for (const sc of GRAPH) {
    const trace = await playGraph(targetWith(module), sc);
    if (checkClaims(trace, sc.claims).length > 0) failed.push(sc.name);
  }
  return failed;
}

/** The rules, each with its plant and the scenario (a prefix of its name) that must go red. */
const PLANTS: Array<{ rule: string; find: string; replace: string; red: string }> = [
  {
    rule: 'an input arrives as Inputs.<name>',
    find: 'this._internal.inputValues[name] = value;',
    replace: 'this._internal.inputValues[name.toUpperCase()] = value;',
    red: 'inputs arrive by name'
  },
  {
    rule: 'a ticked input runs the code only when its value changed',
    find: "if (this.shouldRunOnValueChanged('in-' + name, previous, value)) this.scheduleRun();",
    replace: 'this.scheduleRun();',
    red: 'undefined and an object always count as a change'
  },
  {
    rule: 'once per frame, however many asked',
    find: 'if (this.runScheduled) return;',
    replace: '',
    red: 'this is kept across runs and counts them'
  },
  {
    rule: 'this is one object kept across runs',
    find: 'await func.apply(this._internal._this, [',
    replace: 'await func.apply({}, [',
    red: 'this is kept across runs and counts them'
  },
  {
    rule: 'Inputs is the node\'s own object: what the code writes there is what the next arrival is compared with',
    find: 'await func.apply(this._internal._this, [\n          inputs,',
    replace: 'await func.apply(this._internal._this, [\n          { ...inputs },',
    red: 'the code writes to Inputs'
  },
  {
    rule: 'a signal output is a function the code calls, and it fires',
    find: 'if (this.hasOutput(key)) this.sendSignalOnOutput(key);',
    replace: '',
    red: 'a signal output is a function the code calls'
  },
  {
    rule: 'Success fires when the code has finished',
    find: "this.sendSignalOnOutput('success');",
    replace: '',
    red: 'an empty script compiles and runs'
  },
  {
    // (not "drop the `await`": that leaves the code's rejection unheard, and jest fails the whole test on it — s59's lesson —
    // before any scenario can be read)
    rule: 'the code is an async function: it may await, and what follows the await is still the run',
    find: 'func = new AsyncFunction(',
    replace: 'func = new Function(',
    red: 'a throw after an await'
  },
  {
    rule: 'a throw nobody asked for pulses Failure',
    find: "this.raiseRuntimeError('function/script-threw', message, detail);\n          this.sendSignalOnOutput('failure');",
    replace: "this.raiseRuntimeError('function/script-threw', message, detail);",
    red: 'a synchronous throw'
  },
  {
    rule: "Error is the throw's message in JavaScript's own words",
    find: 'this._internal.lastError = rawMessage;',
    replace: "this._internal.lastError = 'The script threw: ' + rawMessage;",
    red: 'a throw that is not an Error'
  },
  {
    rule: 'a script that will not compile pulses Failure at its run',
    find: "            raise: false\n            });\n          } else {\n            this.sendSignalOnOutput('failure');",
    replace: '            raise: false\n            });\n          } else {',
    red: 'a script that will not compile'
  },
  {
    rule: 'a Run with no script is answered Unchanged',
    find: "reportOutcomes(this, tokens, 'unchanged');",
    replace: "reportOutcomes(this, tokens, 'done');",
    red: 'no Script'
  }
];

describe('NSP-017 AC2 — the Function contract: every rule has a fixture that goes red when the rule is broken', () => {
  test('the control: an unchanged copy conforms on every scenario and bears every graph claim out', async () => {
    const control = copyWith();
    expect(await failedScenarios(control)).toEqual([]);
    expect(GRAPH.length).toBe(3);
    expect(await failedClaims(control)).toEqual([]);
  }, 120_000);

  for (const p of PLANTS) {
    test(`planted: ${p.rule}`, async () => {
      const failed = await failedScenarios(copyWith(p.find, p.replace));
      expect(failed.some((name) => name.startsWith(p.red))).toBe(true);
    }, 120_000);
  }

  test('planted: an output is published only when it changes — the graph scenario stops holding', async () => {
    const failed = await failedClaims(copyWith('if (value !== this._internal.outputValues[prop]) {', 'if (true) {'));
    expect(failed).toEqual([GRAPH[0].name]);
  }, 120_000);

  test('the real file was not touched by the copies', () => {
    expect(fs.readFileSync(FILE, 'utf8')).toBe(ORIGINAL);
  });
});
