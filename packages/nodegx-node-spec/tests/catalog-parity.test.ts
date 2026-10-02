/**
 * The editor is a client of the spec (README §1, third sentence — R6, 2026-09-30).
 *
 * For every spec in the registry, the ports the EDITOR draws today (node-catalog.json, generated
 * from the runtime's registration) must equal the ports the spec declares: same names, same
 * kinds (value / signal), same display names, groups, descriptions and defaults. The outcome
 * ports (`done` / `unchanged` / `failure` / `completed`) are derived from the spec's `outcomes`.
 *
 * Why this gate exists now, with one node in it: it is the measurement that says a spec is
 * complete enough for an editor to draw the node from it alone. NSP-018 flips the direction —
 * the catalog is GENERATED from the specs — and this test is what makes that flip safe, one node
 * at a time. It reads the catalog JSON only (data, not code): the package still depends on
 * nothing in the runtime.
 */

import * as fs from 'fs';
import * as path from 'path';

import { specs, OUTCOME_PORTS } from '../src';

interface CatalogPort {
  name: string;
  displayName?: string;
  group?: string;
  description?: string;
  isSignal: boolean;
  default?: unknown;
  type: { name: string } | string;
}
interface CatalogNode {
  typeName: string;
  inputs: CatalogPort[];
  outputs: CatalogPort[];
  dynamicPorts: null | { mechanisms: string[]; numberedInputs?: Array<{ nameBase: string; displayPrefix: string; type: { name: string } }> };
  parameterEncoding: null | { known: boolean; seededBy?: string[] };
}

const catalogPath = path.join(__dirname, '..', '..', 'noodl-types', 'src', 'node-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as { nodes: CatalogNode[] };
const byName = new Map(catalog.nodes.map((n) => [n.typeName, n]));

const shape = (p: CatalogPort) => ({
  name: p.name,
  signal: p.isSignal,
  displayName: p.displayName,
  group: p.group,
  description: p.description,
  default: p.default
});

describe('catalog parity — every spec draws the same ports the editor draws', () => {
  for (const [typeName, spec] of Object.entries(specs)) {
    test(`${typeName}: inputs`, () => {
      const node = byName.get(typeName);
      expect(node).toBeDefined();
      const fromSpec = Object.entries(spec.inputs)
        .map(([name, d]) => ({
          name,
          signal: d.type === 'signal',
          displayName: d.displayName,
          group: d.group,
          description: d.description,
          default: d.type === 'signal' ? undefined : d.default
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const fromCatalog = node!.inputs.map(shape).sort((a, b) => a.name.localeCompare(b.name));
      expect(fromSpec).toEqual(fromCatalog);
    });

    test(`${typeName}: dynamic ports — the spec has \`derived\` exactly when the catalog says the node has them (NSP-004, R6)`, () => {
      const node = byName.get(typeName)!;
      // `declared-port-groups` alone is visibility (which declared ports a parameter reveals — Static
      // Array's CSV / JSON); no port is derived, so no `derived` is owed (NSP-012)
      const derivesPorts = node.dynamicPorts !== null && node.dynamicPorts.mechanisms.some((m) => m !== 'declared-port-groups');
      expect(spec.derived !== undefined).toBe(derivesPorts);
      if (!node.dynamicPorts || !derivesPorts) return;
      // numbered-inputs: `ports({})` draws the first numbered port with the catalog's prefix
      for (const n of node.dynamicPorts.numberedInputs ?? []) {
        const first = spec.derived!.inputs({})[`${n.nameBase} 0`];
        expect(first).toBeDefined();
        expect(first.displayName).toBe(`${n.displayPrefix} 0`);
        expect(first.type).toBe(n.type.name);
      }
      // runtime-discovered from a parameter: the catalog names the seeding parameter. Two encodings
      // exist: a placeholder in text draws a port of that name (String Format); a comma-separated
      // list draws ports by the catalog's own patterns (`prop-<property>`, NSP-012's Object family)
      if (node.parameterEncoding?.known && node.parameterEncoding.seededBy) {
        const patterns = (node.parameterEncoding as { patterns?: Array<{ pattern: string; plug: string }> }).patterns ?? [];
        // every seed at once: a pattern may name two (States' `value-<state>-<value>`, NSP-013 s14) —
        // for a one-seed node this is the same single parameter it always was
        // a LIST parameter (`proplist` — the Record writes' Access Control Rules, NSP-014 s22) is probed with one row
        // whose id is the probe, as the editor stores it; every other seed with the text
        const isList = (seed: string) => node.inputs.some((i) => i.name === seed && typeof i.type === 'object' && i.type.name === 'proplist');
        const probe = Object.fromEntries(node.parameterEncoding.seededBy.map((seed) => [seed, isList(seed) ? [{ id: 'probe', label: 'probe' }] : 'probe']));
        // a pattern whose variable names no seed parameter is seeded by the PROJECT (`seededByProjectMetadata` — a class
        // schema's `prop-<property>`, the Class picker): no parameter draws it, so the spec must accept it on first write
        const fromParameter = (p: { variables?: Record<string, string> }) =>
          !!p.variables && Object.values(p.variables).some((v) => node.parameterEncoding!.seededBy!.some((seed) => v.includes('`' + seed + '`')));
        for (const seed of node.parameterEncoding.seededBy) {
          if (patterns.length === 0 || 'probe' in spec.derived!.inputs({ [seed]: 'x {probe}' })) {
            expect(Object.keys(spec.derived!.inputs({ [seed]: 'x {probe}' }))).toContain('probe');
            continue;
          }
          const inputs = Object.keys(spec.derived!.inputs(probe));
          const outputs = Object.keys(spec.derived!.outputs?.(probe) ?? {});
          for (const p of patterns) {
            const name = p.pattern.replace(/<[^>]+>/g, 'probe');
            if ((node.parameterEncoding as { seededByProjectMetadata?: string[] }).seededByProjectMetadata && !fromParameter(p as { variables?: Record<string, string> })) {
              if (p.plug === 'input') expect(spec.derived!.discover?.(name)).toBeDefined();
              continue;
            }
            if (p.plug === 'input' || p.plug === 'input/output') expect(inputs).toContain(name);
            if (p.plug === 'output' || p.plug === 'input/output') expect(outputs).toContain(name);
          }
        }
      }
    });

    test(`${typeName}: outputs, with the outcome ports derived from \`outcomes\``, () => {
      const node = byName.get(typeName)!;
      const declared = Object.entries(spec.outputs).map(([name, d]) => ({
        name,
        signal: d.type === 'signal',
        displayName: d.displayName,
        group: d.group,
        description: d.description
      }));
      const outcomeNames = spec.outcomes ? [...spec.outcomes, 'completed'] : [];
      const catalogOutputs = node.outputs.map(shape).sort((a, b) => a.name.localeCompare(b.name));
      // an outcome-named port the spec DECLARES is a plain signal of the node's own (Variable's and
      // Static Array's `failure`, pulsed by a value setter outside any invocation — NSP-012), not an outcome
      const isOutcomePort = (name: string) => (OUTCOME_PORTS as readonly string[]).includes(name) && !(name in spec.outputs);
      const catalogOutcome = catalogOutputs.filter((p) => isOutcomePort(p.name)).map((p) => p.name);
      const catalogRest = catalogOutputs.filter((p) => !isOutcomePort(p.name)).map(({ default: _d, ...r }) => r);
      expect(catalogOutcome.sort()).toEqual([...outcomeNames].sort());
      expect(declared.sort((a, b) => a.name.localeCompare(b.name))).toEqual(catalogRest);
    });
  }
});
