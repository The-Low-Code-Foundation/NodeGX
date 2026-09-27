/**
 * P102 CMP-007 row 2 — a gated row's link goes to the clause the node does not meet yet.
 *
 * Driven 2026-09-24: a Group with its shadow on and Source *Custom* showed *"Shadow Token applies
 * when Shadow Enabled is on and Shadow Source is From a style token. Show Shadow Enabled"* — a
 * link to a switch that was already on. Graded on the real `Group` declarations from the shipped
 * catalog, and against the real evaluator: for every combination of the two parameters, the link
 * names a clause that `evaluateDynamicPortsCondition` still reads as false.
 */
import * as fs from 'fs';
import * as path from 'path';

import { evaluateDynamicPortsCondition } from '../../src/editor/src/models/nodelibrary/dynamicPortRules';
import {
  reasonsForGatedPorts,
  withUnmetGate,
  type GatePortLike,
  type PortGateReason
} from '../../src/editor/src/models/nodelibrary/portGateReason';

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../noodl-types/src/node-catalog.json'), 'utf8')
) as {
  nodes: {
    typeName: string;
    inputs?: { name: string; displayName?: string; type?: unknown }[];
    dynamicPorts?: { declaredPortGroups?: { name?: string; condition?: string; inputs?: string[] }[] };
  }[];
};

const group = CATALOG.nodes.find((n) => n.typeName === 'Group')!;
const dynamicports = (group.dynamicPorts?.declaredPortGroups || []).map((g) => ({
  name: g.name || 'conditionalports/basic',
  condition: g.condition,
  ports: (g.inputs || []).map((name) => ({ name }))
}));
const ports: GatePortLike[] = (group.inputs || []).map((i) => ({ name: i.name, displayName: i.displayName, type: i.type }));
const condition = dynamicports.find((g) => g.ports.some((p) => p.name === 'boxShadowToken'))!.condition!;

function tokenReason(): PortGateReason {
  const reason = reasonsForGatedPorts(dynamicports, ['boxShadowToken'], ports).get('boxShadowToken');
  expect(reason).toBeDefined();
  return reason!;
}

describe('CMP-007 row 2 — withUnmetGate', () => {
  it('the shipped condition is the two-parameter AND this row is about', () => {
    expect(condition).toBe('boxShadowEnabled = true AND boxShadowSource = token');
    expect(tokenReason().gatePortName).toBe('boxShadowEnabled');
  });

  it('shadow on, Source Custom: the link goes to Shadow Source, not the switch that is on', () => {
    const params: Record<string, unknown> = { boxShadowEnabled: true, boxShadowSource: 'custom' };
    const reason = withUnmetGate(tokenReason(), (n) => params[n]);
    expect(reason.gatePortName).toBe('boxShadowSource');
    expect(reason.gateLabel).toBe('Shadow Source');
    expect(reason.turnOn).toBe(false);
    // The sentence is the declaration's, unchanged: only where the link goes moves.
    expect(reason.sentence).toBe(tokenReason().sentence);
  });

  it('shadow off: the link stays on Shadow Enabled, the first thing to change', () => {
    const params: Record<string, unknown> = { boxShadowEnabled: false, boxShadowSource: 'custom' };
    expect(withUnmetGate(tokenReason(), (n) => params[n]).gatePortName).toBe('boxShadowEnabled');
  });

  it('for every combination, the link names a clause the real evaluator reads as unmet', () => {
    for (const enabled of [true, false, undefined]) {
      for (const source of ['custom', 'token', undefined]) {
        const params: Record<string, unknown> = { boxShadowEnabled: enabled, boxShadowSource: source };
        const node = { parameters: params, getParameter: (n: string) => params[n] };
        if (evaluateDynamicPortsCondition(condition, node)) continue; // row is live: no link at all
        const target = withUnmetGate(tokenReason(), (n) => params[n]).gatePortName;
        const clause = tokenReason().clauses!.find((c) => c.param === target)!;
        expect({ enabled, source, met: evaluateDynamicPortsCondition(`${clause.param} = ${clause.value}`, node) }).toEqual({
          enabled,
          source,
          met: false
        });
      }
    }
  });

  it('an OR reason is returned untouched', () => {
    const reason = reasonsForGatedPorts(
      [{ name: 'conditionalports/basic', condition: 'sizeMode = explicit OR sizeMode = contentHeight', ports: [{ name: 'width' }] }],
      ['width'],
      [{ name: 'sizeMode' }, { name: 'width' }]
    ).get('width')!;
    expect(withUnmetGate(reason, () => 'contentWidth')).toBe(reason);
  });
});
