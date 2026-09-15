/**
 * CHR-008 §3.3, R8 — a switched-off group says so once.
 *
 * The rows are rebuilt from the shipped catalog exactly as CHR-007's `describeRows` spec rebuilds them —
 * through the three functions `ModelProxy.getPorts` calls — so the reason a group line is built from is
 * the reason the panel would have printed six times.
 *
 * 🔴 What this cannot see: that `Ports.renderGroups` draws the line and quiets the rows. That is AC1's
 * drive (`verdicts/CHR-008/<date>/`).
 */
import * as fs from 'fs';
import * as path from 'path';

import { evaluateDynamicPortsCondition } from '../../src/editor/src/models/nodelibrary/dynamicPortRules';
import {
  partitionGatedPorts,
  reasonsForGatedPorts,
  type PortGateReason
} from '../../src/editor/src/models/nodelibrary/portGateReason';
import {
  describeRows,
  type RowDescriptor,
  type RowPortLike
} from '../../src/editor/src/views/panels/propertyeditor/model/describeRows';
import { groupGatesFor } from '../../src/editor/src/views/panels/propertyeditor/model/groupGate';

type CatalogNode = {
  typeName: string;
  inputs?: RowPortLike[];
  dynamicPorts?: { declaredPortGroups?: { name?: string; condition?: string; inputs?: string[] }[] };
};

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../noodl-types/src/node-catalog.json'), 'utf8')
) as { nodes: CatalogNode[] };

const GROUP = CATALOG.nodes.find((node) => node.typeName === 'Group');

const SHADOW_PORTS = [
  'boxShadowOffsetX',
  'boxShadowOffsetY',
  'boxShadowInset',
  'boxShadowBlurRadius',
  'boxShadowSpreadRadius',
  'boxShadowColor'
];

function dynamicportsOf(node: CatalogNode) {
  return ((node.dynamicPorts && node.dynamicPorts.declaredPortGroups) || []).map((group) => ({
    name: group.name || 'conditionalports/basic',
    condition: group.condition,
    ports: (group.inputs || []).map((name) => ({ name }))
  }));
}

/** `ModelProxy.getPorts('input')` for `params`, defaults filling the rest — CHR-007's helper, unchanged. */
function panelPortsFor(node: CatalogNode, params: Record<string, unknown>): RowPortLike[] {
  const ports = node.inputs || [];
  const defaults = new Map(ports.map((port) => [port.name, port.default]));
  const ruleNode = {
    parameters: params,
    getParameter: (name: string) => (name in params ? params[name] : defaults.get(name))
  };

  const dynamicports = dynamicportsOf(node);
  const hidden: string[] = [];
  for (const group of dynamicports) {
    if (!group.name.startsWith('conditionalports/') || !group.condition) continue;
    if (!evaluateDynamicPortsCondition(group.condition, ruleNode)) {
      for (const port of group.ports) hidden.push(port.name);
    }
  }

  const reasons = reasonsForGatedPorts(dynamicports, hidden, ports);
  return partitionGatedPorts(ports, hidden, reasons);
}

function row(name: string, group: string, switchedOff?: Partial<PortGateReason>, extra: Partial<RowDescriptor> = {}) {
  return {
    key: name,
    name,
    displayName: name.toUpperCase(),
    group,
    widget: 'basic',
    connected: false,
    ...(switchedOff
      ? {
          switchedOff: {
            portName: name,
            gatePortName: 'mode',
            gateLabel: 'Mode',
            sentence: `${name} applies when Mode is on.`,
            condition: 'Mode is on',
            turnOn: true,
            ...switchedOff
          } as PortGateReason
        }
      : {}),
    ...extra
  } as RowDescriptor;
}

describe('CHR-008 R8 — the reason carries what a group line needs', () => {
  const ports = panelPortsFor(GROUP, {});
  const reason = (name: string) => ports.find((port) => port.name === name)['__fb021GateReason'] as PortGateReason;

  it('a boolean gate is one clause the panel can switch: condition and turnOn', () => {
    expect(reason('boxShadowColor')).toMatchObject({
      gatePortName: 'boxShadowEnabled',
      condition: 'Shadow Enabled is on',
      turnOn: true
    });
  });

  it('🔴 the per-row sentence FB-021 pins is unchanged', () => {
    expect(reason('boxShadowColor').sentence).toBe(`${ports.find((p) => p.name === 'boxShadowColor').displayName} applies when Shadow Enabled is on.`);
  });

  it('an enum gate names its values and offers no Turn on', () => {
    const reasons = reasonsForGatedPorts(
      [{ name: 'conditionalports/basic', condition: 'sizeMode = explicit OR sizeMode = contentHeight', ports: [{ name: 'width' }] }],
      ['width'],
      [
        { name: 'width', displayName: 'Width' },
        { name: 'sizeMode', displayName: 'Size Mode', type: { name: 'enum', enums: [{ value: 'explicit', label: 'Explicit' }, { value: 'contentHeight', label: 'Content Height' }] } }
      ]
    );
    const width = reasons.get('width');
    expect(width.condition).toBe('Size Mode is Explicit or Content Height');
    expect(width.turnOn).toBeFalsy();
  });

  it('`= false` is not a Turn on — pressing it would set the wrong value', () => {
    const reasons = reasonsForGatedPorts(
      [{ name: 'conditionalports/basic', condition: 'hidden = false', ports: [{ name: 'x' }] }],
      ['x'],
      [{ name: 'x' }, { name: 'hidden', displayName: 'Hidden', type: 'boolean' }]
    );
    expect(reasons.get('x').turnOn).toBeFalsy();
  });
});

describe('CHR-008 AC1 — a Group with Shadow Enabled off', () => {
  const rows = describeRows({ ports: panelPortsFor(GROUP, {}) });
  const gates = groupGatesFor(rows);
  const shadow = gates.get('Box Shadow');

  it('Box Shadow draws ONE line standing in for all six rows', () => {
    expect(shadow).toBeDefined();
    expect(shadow.gatePortName).toBe('boxShadowEnabled');
    expect(shadow.gateLabel).toBe('Shadow Enabled');
    expect(shadow.portNames).toEqual(rows.filter((r) => SHADOW_PORTS.includes(r.name)).map((r) => r.name));
    expect([...shadow.portNames].sort()).toEqual([...SHADOW_PORTS].sort());
  });

  it('offers Turn on, and the sentence names every row once and the switch once', () => {
    expect(shadow.turnOn).toBe(true);
    expect(shadow.sentence).toMatch(/ apply once Shadow Enabled is on\.$/);
    for (const name of SHADOW_PORTS) {
      const label = rows.find((r) => r.name === name).displayName;
      expect(shadow.sentence.split(label).length - 1).toBeGreaterThanOrEqual(1);
    }
    expect(shadow.sentence.split('Shadow Enabled').length - 1).toBe(1);
  });

  it('every line on this node covers rows that all answer to its one switch', () => {
    const byName = new Map(rows.map((r) => [r.name, r]));
    for (const gate of gates.values()) {
      for (const name of gate.portNames) expect(byName.get(name).switchedOff.gatePortName).toBe(gate.gatePortName);
    }
  });

  it('reverted arm — Shadow Enabled on: no Box Shadow line', () => {
    const on = groupGatesFor(describeRows({ ports: panelPortsFor(GROUP, { boxShadowEnabled: true }) }));
    expect(on.has('Box Shadow')).toBe(false);
  });
});

describe('CHR-008 R8 — when a group keeps its per-row sentences', () => {
  it('two different switches in one group: no line', () => {
    const gates = groupGatesFor([row('a', 'G', {}), row('b', 'G', { gatePortName: 'other', gateLabel: 'Other' })]);
    expect(gates.size).toBe(0);
  });

  it('one switch, two conditions: no line', () => {
    const gates = groupGatesFor([row('a', 'G', {}), row('b', 'G', { condition: 'Mode is off' })]);
    expect(gates.size).toBe(0);
  });

  it('a single gated row already says so once: no line', () => {
    expect(groupGatesFor([row('a', 'G', {}), row('b', 'G')]).size).toBe(0);
  });

  it('rows inside a tab group, a parent or a popout do not count — renderParams never decorated them', () => {
    const gates = groupGatesFor([
      row('a', 'G', {}),
      row('b', 'G', {}, { tab: { group: 't', tab: 'x' } }),
      row('c', 'G', {}, { parent: 'a' }),
      row('d', 'G', {}, { popout: { group: 'p' } })
    ]);
    expect(gates.size).toBe(0);
  });

  it('a reason with no condition phrase cannot be summarised: no line', () => {
    expect(groupGatesFor([row('a', 'G', { condition: undefined }), row('b', 'G', { condition: undefined })]).size).toBe(0);
  });

  it('an ungated row in the group does not stop the line, and is not covered by it', () => {
    const gates = groupGatesFor([row('switch', 'G'), row('a', 'G', {}), row('b', 'G', {})]);
    expect(gates.get('G').portNames).toEqual(['a', 'b']);
    expect(gates.get('G').sentence).toBe('A and B apply once Mode is on.');
  });

  it('an enum gate reads "when", not "once", and offers no Turn on', () => {
    const gates = groupGatesFor([
      row('a', 'G', { turnOn: false, condition: 'Size Mode is Explicit' }),
      row('b', 'G', { turnOn: false, condition: 'Size Mode is Explicit' })
    ]);
    expect(gates.get('G')).toMatchObject({ turnOn: false, sentence: 'A and B apply when Size Mode is Explicit.' });
  });
});
