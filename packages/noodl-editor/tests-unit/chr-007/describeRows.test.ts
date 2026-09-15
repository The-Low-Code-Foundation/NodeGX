/**
 * CHR-007 AC3 — a node's rows, answered without a DOM.
 *
 * `describeRows` is fed exactly what `Ports._getPorts()` hands `renderParams`: the node's input ports
 * after `ModelProxy.getPorts` has run the `conditionalports/*` filter and marked each switched-off
 * port with its reason. This spec rebuilds that list from the shipped catalog through the same three
 * functions `ModelProxy` calls — `evaluateDynamicPortsCondition`, `reasonsForGatedPorts`,
 * `partitionGatedPorts` — so the only thing written for the test is the parameter values.
 *
 * ## Two corrections to the task file, both measured here
 *
 * 1. The Group's switch is **`boxShadowEnabled`**, not `shadowEnabled` (catalog, `Group.dynamicPorts`:
 *    `boxShadowEnabled = true` gates six ports).
 * 2. The reverted arm cannot read `on: true`. `partitionGatedPorts` marks a port only while its
 *    condition is switching it OFF; a port whose condition holds carries nothing, on the panel and in
 *    the model. So the arm asserts the mark is **gone**, which is what the panel draws.
 *
 * 🔴 What this cannot see: that `renderParams` draws what a descriptor says. That is AC1's drive.
 */
import * as fs from 'fs';
import * as path from 'path';

import { evaluateDynamicPortsCondition } from '../../src/editor/src/models/nodelibrary/dynamicPortRules';
import { partitionGatedPorts, reasonsForGatedPorts } from '../../src/editor/src/models/nodelibrary/portGateReason';
import {
  describeRows,
  showsGroupHeaders,
  type RowPortLike
} from '../../src/editor/src/views/panels/propertyeditor/model/describeRows';

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

/** The `dynamicports` shape `nodelibraryexport.ts` writes, from the catalog's flat record of it. */
function dynamicportsOf(node: CatalogNode) {
  return ((node.dynamicPorts && node.dynamicPorts.declaredPortGroups) || []).map((group) => ({
    name: group.name || 'conditionalports/basic',
    condition: group.condition,
    ports: (group.inputs || []).map((name) => ({ name }))
  }));
}

/**
 * `ModelProxy.getPorts('input')` for a node whose parameters are `params`, defaults filling the rest —
 * the conditions read `getParameter`, which falls back to the port default on a real node.
 */
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

describe('CHR-007 AC3 — describeRows reads the gates off the model', () => {
  it('finds the Group in the catalog, with its shadow ports', () => {
    expect(GROUP).toBeDefined();
    const names = (GROUP.inputs || []).map((port) => port.name);
    for (const name of [...SHADOW_PORTS, 'boxShadowEnabled']) expect(names).toContain(name);
  });

  describe('Shadow Enabled off (the default)', () => {
    const rows = describeRows({ ports: panelPortsFor(GROUP, {}) });
    const byName = new Map(rows.map((row) => [row.name, row]));

    it.each(SHADOW_PORTS)('%s is switched off by boxShadowEnabled', (name) => {
      const row = byName.get(name);
      expect(row).toBeDefined();
      expect(row.group).toBe('Box Shadow');
      expect(row.switchedOff).toMatchObject({ portName: name, gatePortName: 'boxShadowEnabled' });
      expect(row.switchedOff.sentence).toMatch(/Shadow Enabled/);
    });

    it('the switch itself is a boolean row with no gate', () => {
      const row = byName.get('boxShadowEnabled');
      expect(row.widget).toBe('boolean');
      expect(row.switchedOff).toBeUndefined();
    });

    it('exactly six Box Shadow rows are switched off', () => {
      const off = rows.filter((row) => row.group === 'Box Shadow' && row.switchedOff);
      expect(off.map((row) => row.name).sort()).toEqual([...SHADOW_PORTS].sort());
    });
  });

  describe('reverted arm — Shadow Enabled on', () => {
    const rows = describeRows({ ports: panelPortsFor(GROUP, { boxShadowEnabled: true }) });

    it('no Box Shadow row carries a gate', () => {
      const shadow = rows.filter((row) => row.group === 'Box Shadow');
      expect(shadow.length).toBe(SHADOW_PORTS.length + 1);
      expect(shadow.filter((row) => row.switchedOff)).toEqual([]);
    });
  });

  describe('the other fields a row is decorated from', () => {
    const rows = describeRows({
      ports: panelPortsFor(GROUP, {}),
      isConnected: (name) => name === 'boxShadowColor',
      capabilityGate: (name) => (name === 'boxShadowInset' ? { effective: 'unsupported', isUsable: false } : undefined)
    });
    const byName = new Map(rows.map((row) => [row.name, row]));

    it('carries the port description, trimmed', () => {
      expect(byName.get('boxShadowEnabled').description).toBe('Turns the drop shadow on');
    });

    it('carries connection and capability state from the probes', () => {
      expect(byName.get('boxShadowColor').connected).toBe(true);
      expect(byName.get('boxShadowBlurRadius').connected).toBe(false);
      expect(byName.get('boxShadowInset').capabilityGate).toEqual({ effective: 'unsupported', isUsable: false });
      expect(byName.get('boxShadowColor').capabilityGate).toBeUndefined();
    });

    it('skips ports that get no row, as _getPorts does', () => {
      const signal = (GROUP.inputs || []).find((port) => (port.type as { name?: string })?.name === 'signal');
      if (signal) expect(byName.has(signal.name)).toBe(false);
      expect(rows.length).toBeLessThan((GROUP.inputs || []).length);
    });

    it('is serialisable, because it is also the re-render hash', () => {
      expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
    });
  });

  it('keeps the lone-Other rule for group headings', () => {
    expect(showsGroupHeaders(['Other'])).toBe(false);
    expect(showsGroupHeaders(['General'])).toBe(true);
    expect(showsGroupHeaders(['Other', 'General'])).toBe(true);
  });
});
