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
      const catalogOutcome = catalogOutputs.filter((p) => (OUTCOME_PORTS as readonly string[]).includes(p.name)).map((p) => p.name);
      const catalogRest = catalogOutputs.filter((p) => !(OUTCOME_PORTS as readonly string[]).includes(p.name)).map(({ default: _d, ...r }) => r);
      expect(catalogOutcome.sort()).toEqual([...outcomeNames].sort());
      expect(declared.sort((a, b) => a.name.localeCompare(b.name))).toEqual(catalogRest);
    });
  }
});
