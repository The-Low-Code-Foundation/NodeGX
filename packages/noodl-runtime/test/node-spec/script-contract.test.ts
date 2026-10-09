/**
 * @jest-environment ../nodegx-node-spec/tests/jest-env-real-process.js
 *
 * NSP-017 AC2 — each rule of the Script's contract has a fixture that goes red when the rule is broken, planted and shown.
 *
 * Each plant is ONE textual change to a COPY of the Script's node (`noodl-viewer-react/.../javascript.ts`) or of the parser it reads
 * the code with (`javascriptnodeparser.js`), made in memory from the source text and registered on a fresh target (the real files are
 * never touched — `git checkout --` kills a peer's edit). The node's copy is always handed the parser's copy, planted or not. The
 * Script spec's scenarios (`scenarios/Javascript2.json`, one fixture per rule: `SCRIPT_FIXTURES`) are played on that target, and the
 * scenario that names the rule must fail.
 *
 * The control: both copies with NO change conform on every scenario — so a red below is the plant, not the copying.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import type { NodeModule } from '@noodl/types';

import { runConformance, Script } from '../../../nodegx-node-spec/src';
import { runtimeTarget, withViewerNodes, type RuntimeTarget } from '../helpers/node-spec-target';

import NodeDefinition = require('../../src/nodedefinition');

const NODE_FILE = path.join(__dirname, '..', '..', '..', 'noodl-viewer-react', 'src', 'nodes', 'std-library', 'javascript.ts');
const PARSER_FILE = path.join(__dirname, '..', '..', 'src', 'javascriptnodeparser.js');
const ORIGINAL = { node: fs.readFileSync(NODE_FILE, 'utf8'), parser: fs.readFileSync(PARSER_FILE, 'utf8') };
const PARSER_SPECIFIER = '@noodl/runtime/src/javascriptnodeparser';

type Plant = { file: 'node' | 'parser'; find: string; replace: string };

function planted(file: 'node' | 'parser', plant: Plant | undefined): string {
  const source = ORIGINAL[file];
  if (!plant || plant.file !== file) return source;
  const at = source.indexOf(plant.find);
  if (at < 0 || source.indexOf(plant.find, at + 1) >= 0) throw new Error(`${file} must contain ${JSON.stringify(plant.find)} exactly once — re-read the file`);
  return source.replace(plant.find, plant.replace);
}

/** A module's text run as CommonJS, its relative requires resolved from `dir`, with `extra` answering named specifiers. */
function load(js: string, dir: string, extra: Record<string, unknown> = {}): unknown {
  const module = { exports: {} as Record<string, unknown> };
  const localRequire = (spec: string) => (spec in extra ? extra[spec] : spec.startsWith('.') ? require(path.resolve(dir, spec)) : require(spec));
  new Function('require', 'module', 'exports', js)(localRequire, module, module.exports);
  return module.exports;
}

/** The Script's node and its parser, copied, with at most one change. */
function copyWith(plant?: Plant): NodeModule {
  const parser = load(planted('parser', plant), path.dirname(PARSER_FILE));
  const js = ts.transpileModule(planted('node', plant), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const node = load(js, path.dirname(NODE_FILE), { [PARSER_SPECIFIER]: parser }) as { default: NodeModule };
  return node.default;
}

function targetWith(module: NodeModule): RuntimeTarget {
  const target = withViewerNodes(runtimeTarget());
  target.context.nodeRegister.register(NodeDefinition.defineNode(module.node!));
  return target;
}

async function failedScenarios(module: NodeModule): Promise<string[]> {
  const report = await runConformance(Script, targetWith(module), { sequences: 0 });
  return report.scenarios.filter((s) => s.status !== 'passed').map((s) => s.name);
}

/** The rules, each with its plant and the scenario (a prefix of its name) that must go red. */
const PLANTS: Array<Plant & { rule: string; red: string }> = [
  // --- the node (javascript.ts)
  {
    rule: 'an input arrives on inputs by its name',
    file: 'node',
    find: 'this._internal.inputValues[name] = value;',
    replace: "this._internal.inputValues[name + '_'] = value;",
    red: 'define: inputs arrive on inputs'
  },
  {
    rule: 'a value written to an output is sent',
    file: 'node',
    find: 'self._internal.outputValues[name] = value;\n          self.flagOutputDirty(name);',
    replace: 'self._internal.outputValues[name] = value;',
    red: 'define: inputs arrive on inputs'
  },
  {
    rule: 'once a frame, however many arrivals',
    file: 'node',
    find: 'if (this._internal.runScheduled || this._internal.killed) {',
    replace: 'if (this._internal.killed) {',
    red: 'this is kept and counts the runs'
  },
  {
    rule: 'this is one object for the node\'s life',
    file: 'node',
    find: 'internal.runFunction.call(\n          internal.userFunctionScope,',
    replace: 'internal.runFunction.call(\n          {},',
    red: 'this is kept and counts the runs'
  },
  {
    rule: "the run's third argument is emptied after each run",
    file: 'node',
    find: 'this._internal.changedInputs = {};\n      this._internal.runScheduled = false;',
    replace: 'this._internal.runScheduled = false;',
    red: "the run's third argument"
  },
  {
    rule: 'a signal input calls its function once a frame, however many pulses',
    file: 'node',
    find: 'if (this._internal.signalScheduled[name] || this._internal.killed) {',
    replace: 'if (this._internal.killed) {',
    red: 'a signal input calls the function of its name'
  },
  {
    rule: 'a signal output is a function that fires it',
    file: 'node',
    find: 'if (self.hasOutput(name)) self.sendSignalOnOutput(name);',
    replace: '',
    red: 'a signal input calls the function of its name'
  },
  {
    rule: 'what arrives before the first read is held and arrives after it',
    file: 'node',
    find: 'for (const { name, value } of this._internal.inputQueue) {\n          this.setInputValue(name, value);',
    replace: 'for (const { name, value } of this._internal.inputQueue) {',
    red: 'inputs set at the placing wait for the first read'
  },
  {
    rule: 'a read asks for setup',
    file: 'node',
    find: 'if (this._internal.setupFunction) {\n        scheduleSetup.call(this);\n      }',
    replace: '',
    red: 'setup when read, destroy when the code is replaced'
  },
  {
    rule: 'setup is asked for before the first run',
    file: 'node',
    find: 'if (this._internal.setupFunction) {\n        scheduleSetup.call(this);\n      }\n\n      if (this._internal.runFunction) {\n        scheduleRun.call(this);\n      }',
    replace: 'if (this._internal.runFunction) {\n        scheduleRun.call(this);\n      }\n\n      if (this._internal.setupFunction) {\n        scheduleSetup.call(this);\n      }',
    red: 'script() with an input at the placing'
  },
  {
    rule: 'the code before is told it is going before new code is read',
    file: 'node',
    find: 'this._callDestroyFunction();\n            const parser',
    replace: 'const parser',
    red: 'setup when read, destroy when the code is replaced'
  },
  {
    rule: 'code that fails to read leaves the code before running',
    file: 'node',
    find: '      if (parser.error) {\n',
    replace: '      if (parser.error) {\n        this._internal.runFunction = undefined;\n',
    red: 'code that does not compile, or throws while read'
  },
  {
    rule: 'empty code is ignored',
    file: 'node',
    find: 'if (!value) {\n          return;\n        }\n        const self = this;',
    replace: 'if (!value) {\n          this._internal.runFunction = undefined;\n          return;\n        }\n        const self = this;',
    red: 'empty code is ignored'
  },
  {
    rule: 'a throw ends that run only: the next run runs',
    file: 'node',
    find: 'logJavaScriptNodeError(e);',
    replace: 'logJavaScriptNodeError(e);\n        internal.killed = true;',
    red: 'a throw ends the run'
  },
  {
    rule: "a throw in a signal's function ends that call only",
    file: 'node',
    // P109 ISL-051 (C148): the signal catch logs through `logScriptError` now — the plant still opens that catch
    find: "logScriptError('signal function', e);",
    replace: "internal.definedObject = undefined;\n        logScriptError('signal function', e);",
    red: "a throw in a signal's function"
  },
  {
    rule: 'the Node object\'s Inputs are the values once the code is read',
    file: 'node',
    find: 'parser.apis.Node.Inputs = this._internal.inputValues;',
    replace: '',
    red: 'the Node object'
  },
  {
    rule: 'the Node object\'s Outputs are the outputs once the code is read',
    file: 'node',
    find: 'parser.apis.Node.Outputs = this._internal.outputProperties;',
    replace: '',
    red: 'the Node object'
  },
  {
    rule: 'this.sendSignalOnOutput fires the output',
    file: 'node',
    find: 'sendSignalOnOutput: function (name: string) {\n        self.sendSignalOnOutput(name);',
    replace: 'sendSignalOnOutput: function (name: string) {',
    red: 'this.sendSignalOnOutput and this.flagOutputDirty'
  },
  // --- the parser (javascriptnodeparser.js)
  {
    rule: "define's run function may be called run",
    file: 'parser',
    find: 'this.change = userObject.run || userObject.change;',
    replace: 'this.change = userObject.change;',
    red: 'this is kept and counts the runs'
  },
  {
    rule: 'a throw while the code is read is a failure to read',
    file: 'parser',
    find: '      this._afterSourced();\n    } catch (e) {\n      this.error = e.message;',
    replace: '      this._afterSourced();\n    } catch (e) {',
    red: 'code that does not compile, or throws while read'
  },
  {
    rule: 'script(): a changed handler gets the new value and the old',
    file: 'parser',
    find: 'changedFunction.apply(this, [inputs[key], old[key]]);',
    replace: 'changedFunction.apply(this, [inputs[key]]);',
    red: 'script(): a changed handler'
  },
  {
    rule: "script(): the methods are on this",
    file: 'parser',
    find: 'this[key] = _this.methods[key];',
    replace: '',
    red: 'script(): a changed handler'
  },
  {
    rule: 'script(): each of signals is a signal function',
    file: 'parser',
    find: '_extended[key] = _this.signals[key];',
    replace: '',
    red: 'script(): a changed handler'
  },
  {
    rule: 'the Node object: a Setter is called with the value that arrived',
    file: 'parser',
    find: '_Node.Setters[key](inputs[key]);',
    replace: '_Node.Setters[key](undefined);',
    red: 'the Node object'
  },
  {
    rule: 'the Node object: OnInit at setup',
    file: 'parser',
    find: '_Node.OnInit && _Node.OnInit.apply(this);',
    replace: '',
    red: 'the Node object'
  },
  {
    rule: 'Script is the Node object',
    file: 'parser',
    find: "return \"const Script = (typeof Node !== 'undefined')?Node:undefined;\\n\";",
    replace: 'return "";',
    red: 'the Node object'
  }
];

describe('NSP-017 AC2 — the Script contract: every rule has a fixture that goes red when the rule is broken', () => {
  test('the control: unchanged copies conform on every scenario', async () => {
    expect(await failedScenarios(copyWith())).toEqual([]);
  }, 120_000);

  for (const p of PLANTS) {
    test(`planted: ${p.rule}`, async () => {
      const failed = await failedScenarios(copyWith(p));
      expect(failed.some((name) => name.startsWith(p.red))).toBe(true);
    }, 120_000);
  }

  test('the real files were not touched by the copies', () => {
    expect(fs.readFileSync(NODE_FILE, 'utf8')).toBe(ORIGINAL.node);
    expect(fs.readFileSync(PARSER_FILE, 'utf8')).toBe(ORIGINAL.parser);
  });
});
