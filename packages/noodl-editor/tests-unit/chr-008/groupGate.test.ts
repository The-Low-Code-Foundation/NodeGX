/**
 * CHR-008 §3.3, R8 — a switched-off group says so once.
 *
 * The rows are rebuilt from the shipped catalog exactly as CHR-007's `describeRows` spec rebuilds them —
 * through the three functions `ModelProxy.getPorts` calls — so the reason a group line is built from is
 * the reason the panel would have printed six times.
 *
 * Richard's condition on R8 (no "same error repeated on 5 lines successively") changed the rule from "merge rows
 * with an identical condition" to "a group with two or more switched-off rows prints one line": this file grades
 * WHAT the line says; `repeatedSentences.test.ts` grades that no group prints two, across the catalog.
 *
 * 🔴 What this cannot see: that `Ports.renderGroups` draws the line and quiets the rows. That is the drive.
 */
import * as fs from 'fs';
import * as path from 'path';

import { evaluateDynamicPortsCondition } from '../../src/editor/src/models/nodelibrary/dynamicPortRules';
import {
  partitionGatedPorts,
  reasonsForGatedPorts,
  type LabelledClause,
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

const nodeNamed = (typeName: string) => CATALOG.nodes.find((node) => node.typeName === typeName);
const GROUP = nodeNamed('Group');
const BUTTON = nodeNamed('net.noodl.controls.button');

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

/** `ModelProxy.getPorts('input')` for a node whose parameters are `params`, defaults filling the rest. */
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

const MODE_ON: LabelledClause = { param: 'mode', op: '=', value: 'true', label: 'Mode', valueLabel: 'on', isBoolean: true };
const OTHER_ON: LabelledClause = { param: 'other', op: '=', value: 'true', label: 'Other', valueLabel: 'on', isBoolean: true };
const SIZE_EXPLICIT: LabelledClause = { param: 'sizeMode', op: '=', value: 'explicit', label: 'Size Mode', valueLabel: 'Explicit' };
const SIZE_HEIGHT: LabelledClause = { param: 'sizeMode', op: '=', value: 'contentHeight', label: 'Size Mode', valueLabel: 'Content Height' };
const SIZE_WIDTH: LabelledClause = { param: 'sizeMode', op: '=', value: 'contentWidth', label: 'Size Mode', valueLabel: 'Content Width' };

/** A synthetic row whose reason is built from clauses, the way `reasonsForGatedPorts` builds one. */
function row(
  name: string,
  group: string,
  gate?: { clauses: LabelledClause[]; connective?: 'and' | 'or'; condition?: string; gateLabel?: string } | null,
  extra: Partial<RowDescriptor> = {},
  label = name.toUpperCase()
) {
  const base = { key: name, name, displayName: label, group, widget: 'basic', connected: false, ...extra } as RowDescriptor;
  if (!gate) return base;
  const connective = gate.connective || 'and';
  const condition =
    gate.condition ?? gate.clauses.map((c) => `${c.label} is ${c.valueLabel}`).join(connective === 'and' ? ' and ' : ' or ');
  const one = gate.clauses[0];
  base.switchedOff = {
    portName: name,
    gatePortName: one ? one.param : 'x',
    gateLabel: gate.gateLabel ?? (one ? one.label : 'X'),
    sentence: `${label} applies when ${condition}.`,
    condition,
    turnOn: gate.clauses.length === 1 && Boolean(one.isBoolean) && one.value === 'true',
    clauses: gate.clauses,
    connective
  } as PortGateReason;
  return base;
}

describe('CHR-008 R8 — the reason carries what a group line needs', () => {
  const ports = panelPortsFor(GROUP, {});
  const reason = (name: string) => ports.find((port) => port.name === name)['__fb021GateReason'] as PortGateReason;

  it('a boolean gate is one clause the panel can switch: condition, clauses and turnOn', () => {
    expect(reason('boxShadowColor')).toMatchObject({
      gatePortName: 'boxShadowEnabled',
      condition: 'Shadow Enabled is on',
      turnOn: true,
      connective: 'or'
    });
    expect(reason('boxShadowColor').clauses).toEqual([
      { param: 'boxShadowEnabled', op: '=', value: 'true', label: 'Shadow Enabled', valueLabel: 'on', isBoolean: true }
    ]);
  });

  it('🔴 the per-row sentence FB-021 pins is unchanged', () => {
    expect(reason('boxShadowColor').sentence).toBe(
      `${ports.find((p) => p.name === 'boxShadowColor').displayName} applies when Shadow Enabled is on.`
    );
  });

  it('an enum gate names its values and offers no Turn on', () => {
    const reasons = reasonsForGatedPorts(
      [{ name: 'conditionalports/basic', condition: 'sizeMode = explicit OR sizeMode = contentHeight', ports: [{ name: 'width' }] }],
      ['width'],
      [
        { name: 'width', displayName: 'Width' },
        {
          name: 'sizeMode',
          displayName: 'Size Mode',
          type: { name: 'enum', enums: [{ value: 'explicit', label: 'Explicit' }, { value: 'contentHeight', label: 'Content Height' }] }
        }
      ]
    );
    const width = reasons.get('width');
    expect(width.condition).toBe('Size Mode is Explicit or Content Height');
    expect(width.turnOn).toBeFalsy();
    expect(width.clauses.map((c) => c.valueLabel)).toEqual(['Explicit', 'Content Height']);
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
    expect([...shadow.portNames].sort()).toEqual([...SHADOW_PORTS].sort());
  });

  it('offers Turn on, and the sentence names every row once and the switch once', () => {
    expect(shadow.turnOn).toBe(true);
    expect(shadow.sentence).toMatch(/ apply once Shadow Enabled is on\.$/);
    for (const name of SHADOW_PORTS) expect(shadow.sentence).toContain(rows.find((r) => r.name === name).displayName);
    expect(shadow.sentence.split('Shadow Enabled').length - 1).toBe(1);
  });

  it('reverted arm — Shadow Enabled on: no Box Shadow line', () => {
    const on = groupGatesFor(describeRows({ ports: panelPortsFor(GROUP, { boxShadowEnabled: true }) }));
    expect(on.has('Box Shadow')).toBe(false);
  });
});

describe('CHR-008 — the groups the first build repeated in, from the catalog', () => {
  it('Group › Scroll: one line naming what every row needs, travelling to Enable Scroll', () => {
    const scroll = groupGatesFor(describeRows({ ports: panelPortsFor(GROUP, { flexDirection: 'column' }) })).get('Scroll');
    expect(scroll).toBeDefined();
    expect(scroll.portNames.length).toBeGreaterThanOrEqual(5);
    expect(scroll.sentence).toMatch(/ apply only when Layout is not None and Enable Scroll is on\.$/);
    expect(scroll.gatePortName).toBe('scrollEnabled');
    // Two clauses, so one press does not have one meaning.
    expect(scroll.turnOn).toBe(false);
  });

  it('Button › Icon at defaults: one line, "only when Enable Icon is on", and Turn on', () => {
    const icon = groupGatesFor(describeRows({ ports: panelPortsFor(BUTTON, {}) })).get('Icon');
    expect(icon).toBeDefined();
    expect(icon.sentence).toMatch(/ apply only when Enable Icon is on\.$/);
    expect(icon.turnOn).toBe(true);
    expect(icon.gatePortName).toBe('useIcon');
  });

  it('Group › Border Style: one line, each row label once, true of every side', () => {
    const border = groupGatesFor(describeRows({ ports: panelPortsFor(GROUP, {}) })).get('Border Style');
    expect(border).toBeDefined();
    // Row order is port order: the catalog declares Border Color before Border Width.
    expect(border.sentence).toBe('Border Color and Border Width apply when Border Style is Solid, Dashed or Dotted.');
    expect(border.turnOn).toBe(false);
  });
});

describe('CHR-008 R8 — what the line says when the rows differ', () => {
  it('identical condition: the condition, "once", Turn on', () => {
    const gate = groupGatesFor([row('a', 'G', { clauses: [MODE_ON] }), row('b', 'G', { clauses: [MODE_ON] })]).get('G');
    expect(gate).toMatchObject({ sentence: 'A and B apply once Mode is on.', turnOn: true, gatePortName: 'mode' });
  });

  it('AND conditions sharing a boolean clause: "apply only when", and Turn on for that clause', () => {
    const gate = groupGatesFor([
      row('a', 'G', { clauses: [MODE_ON] }),
      row('b', 'G', { clauses: [MODE_ON, SIZE_EXPLICIT] })
    ]).get('G');
    expect(gate).toMatchObject({ sentence: 'A and B apply only when Mode is on.', turnOn: true, gatePortName: 'mode' });
  });

  it('AND conditions sharing only an enum clause: "apply only when", no Turn on', () => {
    const gate = groupGatesFor([
      row('a', 'G', { clauses: [SIZE_EXPLICIT, MODE_ON] }),
      row('b', 'G', { clauses: [SIZE_EXPLICIT, OTHER_ON] })
    ]).get('G');
    expect(gate).toMatchObject({ sentence: 'A and B apply only when Size Mode is Explicit.', turnOn: false, gatePortName: 'sizeMode' });
  });

  it('OR conditions sharing a clause: "apply when" — sufficient for every row, no Turn on', () => {
    const gate = groupGatesFor([
      row('w', 'G', { clauses: [SIZE_EXPLICIT, SIZE_HEIGHT], connective: 'or' }),
      row('h', 'G', { clauses: [SIZE_EXPLICIT, SIZE_WIDTH], connective: 'or' })
    ]).get('G');
    expect(gate).toMatchObject({ sentence: 'W and H apply when Size Mode is Explicit.', turnOn: false });
  });

  it('nothing shared: the controls are named instead, and the line travels to the first', () => {
    const gate = groupGatesFor([row('a', 'G', { clauses: [MODE_ON] }), row('b', 'G', { clauses: [OTHER_ON] })]).get('G');
    expect(gate).toMatchObject({ sentence: 'A and B are switched off by Mode and Other.', turnOn: false, gatePortName: 'mode' });
  });

  it('mixed connectives cannot share a clause honestly: the controls are named', () => {
    const gate = groupGatesFor([
      row('a', 'G', { clauses: [SIZE_EXPLICIT, MODE_ON], connective: 'and' }),
      row('b', 'G', { clauses: [SIZE_EXPLICIT, SIZE_HEIGHT], connective: 'or' })
    ]).get('G');
    expect(gate.sentence).toBe('A and B are switched off by Size Mode.');
  });

  it('a reason without clauses still gets one line — named by its control', () => {
    const bare = (name: string, gateLabel: string) => {
      const r = row(name, 'G', { clauses: [], condition: `${gateLabel} is odd`, gateLabel });
      r.switchedOff.clauses = undefined;
      return r;
    };
    expect(groupGatesFor([bare('a', 'Mode'), bare('b', 'Other')]).get('G').sentence).toBe('A and B are switched off by Mode and Other.');
  });

  it('five sides of the same row label are one label', () => {
    const gate = groupGatesFor(
      ['top', 'right', 'bottom', 'left'].map((side) => row(side, 'G', { clauses: [MODE_ON] }, {}, 'Border Color'))
    ).get('G');
    expect(gate.sentence).toBe('Border Color applies once Mode is on.');
  });

  it('a single gated row already says so once: no line', () => {
    expect(groupGatesFor([row('a', 'G', { clauses: [MODE_ON] }), row('b', 'G')]).size).toBe(0);
  });

  it('rows inside a tab group, a parent or a popout do not count — renderParams never decorated them', () => {
    const gates = groupGatesFor([
      row('a', 'G', { clauses: [MODE_ON] }),
      row('b', 'G', { clauses: [MODE_ON] }, { tab: { group: 't', tab: 'x' } }),
      row('c', 'G', { clauses: [MODE_ON] }, { parent: 'a' }),
      row('d', 'G', { clauses: [MODE_ON] }, { popout: { group: 'p' } })
    ]);
    expect(gates.size).toBe(0);
  });

  it('an ungated row in the group does not stop the line, and is not covered by it', () => {
    const gates = groupGatesFor([row('switch', 'G'), row('a', 'G', { clauses: [MODE_ON] }), row('b', 'G', { clauses: [MODE_ON] })]);
    expect(gates.get('G').portNames).toEqual(['a', 'b']);
  });
});
