/**
 * P107 R40 (s105) — what a node's saved settings make it tell the editor once the app runs, read before it runs: the rule
 * `settings-diagnostic`, which the Problems panel and the agent server share (SemanticValidator). It reads the node specs'
 * `settings: true` diagnostics (`@nodegx/node-spec` `settingsDiagnostics`), in the runtime's own words, through the callback
 * the two callers hand it (`settingsDiagnosticLookup`).
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-019/settingsDiagnostic
 */
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { NormConnection, NormNode, NormProject } from '../../src/editor/src/validation/model';
import { ALL_RULES } from '../../src/editor/src/validation/rules';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';
import { settingsDiagnosticLookup } from '../../src/editor/src/validation/settingsDiagnosticLookup';

const catalog = loadDefaultCatalog();

function node(id: string, type: string, parameters?: Record<string, unknown>, label?: string): NormNode {
  return { id, type, label, children: [], instancePorts: [], ...(parameters ? { parameters } : {}) } as unknown as NormNode;
}

function run(nodes: NormNode[], connections: NormConnection[] = [], read = true) {
  const project = { components: [{ name: '/Pages/Home', nodes, connections }] } as unknown as NormProject;
  const only = new Set([DiagnosticCode.SettingsDiagnostic]);
  return new SemanticValidator(catalog).validate(project, read ? { only, settingsDiagnostics: settingsDiagnosticLookup } : { only }).diagnostics;
}

describe('R40: a node whose saved settings its runtime warns about', () => {
  test('the rule runs by default (the Problems panel and the agent server run the default set)', () => {
    expect(ALL_RULES.find((r) => r.code === DiagnosticCode.SettingsDiagnostic)?.defaultEnabled).toBe(true);
  });

  test('a Counter whose Min Value is above its Max Value warns, in the runtime’s words', () => {
    const found = run([node('c', 'Counter', { limitsMin: 10, limitsMax: 2 }, 'Stock')]);
    expect(found.map((d) => [d.code, d.severity, d.location.nodeId])).toEqual([['settings-diagnostic', 'warning', 'c']]);
    expect(found[0].message).toBe('"Stock" (Counter): Min Value 10 is above Max Value 2. With Limits Enabled on, the count gets stuck.');
  });

  test('a Slider whose Max is below its Min, and a Date Add whose Unit is not one of the eight', () => {
    const found = run([node('s', 'net.noodl.controls.range', { min: 50, max: 10 }), node('d', 'net.noodl.DateAdd', { unit: 'fortnights' })]);
    expect(found.map((d) => d.location.nodeId)).toEqual(['s', 'd']);
  });

  test('settings that agree raise nothing (control)', () => {
    expect(run([node('c', 'Counter', { limitsMin: 2, limitsMax: 10 }), node('s', 'net.noodl.controls.range', { min: 0, max: 10 })])).toHaveLength(0);
  });

  test('a wire into Max Value replaces the saved one: nothing is read; a wire into Increase changes nothing', () => {
    const counter = node('c', 'Counter', { limitsMin: 10, limitsMax: 2 });
    expect(run([counter, node('n', 'Number')], [{ fromId: 'n', fromProperty: 'value', toId: 'c', toProperty: 'limitsMax' }])).toHaveLength(0);
    expect(run([counter, node('b', 'net.noodl.controls.button')], [{ fromId: 'b', fromProperty: 'onClick', toId: 'c', toProperty: 'increase' }])).toHaveLength(1);
  });

  test('a caller that hands no reading gets nothing (the CLIs under scripts/ load the validator without the specs)', () => {
    expect(run([node('c', 'Counter', { limitsMin: 10, limitsMax: 2 })], [], false)).toHaveLength(0);
  });

  test('a node with no spec, or none marked, raises nothing', () => {
    expect(run([node('g', 'Group', { height: 50 }), node('x', '/Components/Card')])).toHaveLength(0);
  });
});
