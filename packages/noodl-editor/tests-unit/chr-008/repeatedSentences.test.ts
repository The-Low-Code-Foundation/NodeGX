/**
 * CHR-008 — Richard's condition on R8 (2026-09-15): *"as long as we don't have another 'same error repeated on
 * 5 lines successively' problem."*
 *
 * The gate for that sentence, over the shipped catalog. For every node type, at its defaults AND with each of its
 * boolean inputs switched on in turn (the second level of gating — `Enable Icon` on, then `Type` decides), the rows
 * are built exactly as `ModelProxy.getPorts` builds them and the panel's printing is simulated: a group line
 * (`groupGatesFor`) plus a sentence under every switched-off row the line does not cover.
 *
 * **Asserted: no group prints more than one gate sentence.** The first build of R8 failed this in 13 groups at
 * defaults alone (`Icon` ×7, `Scroll` ×5, `Border Style` ×10).
 *
 * ⚠️ The catalog drops `tab` / `parent` / `popout` (CHR-007 §6.1), so every row here counts as decorated. That can
 * only OVER-count what the panel prints, never under-count — a pass here holds for the panel.
 * 🔴 What this cannot see: that `Ports.renderGroups` draws what `groupGatesFor` decides. That is the drive.
 */
import * as fs from 'fs';
import * as path from 'path';

import { evaluateDynamicPortsCondition } from '../../src/editor/src/models/nodelibrary/dynamicPortRules';
import { partitionGatedPorts, reasonsForGatedPorts } from '../../src/editor/src/models/nodelibrary/portGateReason';
import { describeRows, type RowPortLike } from '../../src/editor/src/views/panels/propertyeditor/model/describeRows';
import { groupGatesFor } from '../../src/editor/src/views/panels/propertyeditor/model/groupGate';

type CatalogNode = {
  typeName: string;
  inputs?: RowPortLike[];
  dynamicPorts?: { declaredPortGroups?: { name?: string; condition?: string; inputs?: string[] }[] };
};

const CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../noodl-types/src/node-catalog.json'), 'utf8')
) as { nodes: CatalogNode[] };

function panelPortsFor(node: CatalogNode, params: Record<string, unknown>): RowPortLike[] {
  const ports = node.inputs || [];
  const defaults = new Map(ports.map((port) => [port.name, port.default]));
  const ruleNode = { parameters: params, getParameter: (name: string) => (name in params ? params[name] : defaults.get(name)) };
  const dynamicports = ((node.dynamicPorts && node.dynamicPorts.declaredPortGroups) || []).map((group) => ({
    name: group.name || 'conditionalports/basic',
    condition: group.condition,
    ports: (group.inputs || []).map((name) => ({ name }))
  }));
  const hidden: string[] = [];
  for (const group of dynamicports) {
    if (!group.name.startsWith('conditionalports/') || !group.condition) continue;
    if (!evaluateDynamicPortsCondition(group.condition, ruleNode)) for (const port of group.ports) hidden.push(port.name);
  }
  return partitionGatedPorts(ports, hidden, reasonsForGatedPorts(dynamicports, hidden, ports));
}

type Printed = { node: string; state: string; group: string; gated: number; texts: string[] };

/** What one node's panel prints per group, in row order. */
function printed(node: CatalogNode, params: Record<string, unknown>, state: string): Printed[] {
  const rows = describeRows({ ports: panelPortsFor(node, params) }).filter((r) => !r.tab && !r.parent && !r.popout);
  const gates = groupGatesFor(rows);
  const byGroup = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byGroup.get(row.group);
    if (list) list.push(row);
    else byGroup.set(row.group, [row]);
  }
  const out: Printed[] = [];
  for (const [group, list] of byGroup) {
    const line = gates.get(group);
    const covered = new Set(line ? line.portNames : []);
    const texts = [
      ...(line ? [line.sentence] : []),
      ...list.filter((r) => r.switchedOff && !covered.has(r.name)).map((r) => r.switchedOff.sentence)
    ];
    const gated = list.filter((r) => r.switchedOff).length;
    if (gated) out.push({ node: node.typeName, state, group, gated, texts });
  }
  return out;
}

function population(): Printed[] {
  const all: Printed[] = [];
  for (const node of CATALOG.nodes) {
    all.push(...printed(node, {}, 'defaults'));
    for (const port of node.inputs || []) {
      const type = port.type as { name?: string } | string | undefined;
      const isBoolean = type === 'boolean' || (typeof type === 'object' && type !== null && type.name === 'boolean');
      if (isBoolean) all.push(...printed(node, { [port.name]: true }, `${port.name}=true`));
    }
  }
  return all;
}

describe('CHR-008 — no group prints the same kind of gate sentence twice', () => {
  const all = population();

  it('control: the population contains groups with several switched-off rows (the case the rule is about)', () => {
    const multi = all.filter((p) => p.gated >= 2);
    expect(multi.length).toBeGreaterThan(50);
    // The three families the first build repeated in, by name.
    for (const [node, group] of [['Group', 'Scroll'], ['net.noodl.controls.button', 'Icon'], ['Group', 'Border Style']]) {
      expect(multi.some((p) => p.node === node && p.group === group)).toBe(true);
    }
  });

  it('🔴 every group prints at most ONE gate sentence, at defaults and with each switch on', () => {
    const offenders = all.filter((p) => p.texts.length > 1).map((p) => `${p.node} [${p.state}] › ${p.group}: ${p.texts.length}\n    ${p.texts.join('\n    ')}`);
    expect(offenders).toEqual([]);
  });

  it('a group with several switched-off rows says something — the line is never silently dropped', () => {
    const silent = all.filter((p) => p.gated >= 2 && p.texts.length === 0).map((p) => `${p.node} [${p.state}] › ${p.group}`);
    expect(silent).toEqual([]);
  });

  it('no line repeats a word pair back to back (the "Border Style … or Border Style" shape)', () => {
    const doubled = all
      .flatMap((p) => p.texts.filter((t) => p.gated >= 2 && /\b(\w+ \w+)\b[^.]*\bor \1\b/.test(t) && t === p.texts[0]).map((t) => `${p.node} › ${p.group}: ${t}`))
      .filter((line) => /apply|switched off/.test(line));
    expect(doubled).toEqual([]);
  });
});
