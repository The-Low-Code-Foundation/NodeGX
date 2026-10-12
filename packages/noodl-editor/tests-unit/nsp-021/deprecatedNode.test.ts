/**
 * P107 NSP-021 s90 — a retired node type, named with its replacement (R25, "Warn on any").
 *
 * The editor refuses to create a deprecated type (picker, paste, drag); the checker the Problems panel and the agent
 * server share never asked. Measured over 357 projects: 52 such nodes, 34 of them the old REST. The successor is the
 * node's own definition's `replacedBy`, which the runtime export and both catalogs carry.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-021/deprecatedNode
 */
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { NormNode, NormProject } from '../../src/editor/src/validation/model';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const catalogJson = require('../../../noodl-types/src/node-catalog.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const enrichedJson = require('../../../noodl-types/src/node-catalog-enriched.json');

const catalog = loadDefaultCatalog();

function node(id: string, type: string, label?: string): NormNode {
  return { id, type, label, children: [], instancePorts: [] } as unknown as NormNode;
}

function run(nodes: NormNode[]) {
  const project = { components: [{ name: '/Page', nodes, connections: [] }] } as unknown as NormProject;
  return new SemanticValidator(catalog).validate(project, { only: new Set([DiagnosticCode.DeprecatedNode]) }).diagnostics;
}

describe('NSP-021: a retired node type is named with its replacement (R25)', () => {
  test('both catalogs carry the definitions’ successors, and every successor is a type an author can add', () => {
    for (const doc of [catalogJson, enrichedJson]) {
      const byName = new Map(doc.nodes.map((n: { typeName: string }) => [n.typeName, n]));
      const named = doc.nodes.filter((n: { replacedBy?: string }) => n.replacedBy !== undefined);
      expect(named.length).toBe(16);
      for (const n of named) {
        expect(n.isDeprecated).toBe(true);
        expect((byName.get(n.replacedBy) as { isDeprecated: boolean }).isDeprecated).toBe(false);
      }
      expect(byName.get('REST2')).toMatchObject({ replacedBy: 'net.noodl.HTTP' });
    }
  });

  test('the old REST warns, naming HTTP Request', () => {
    const [d, ...rest] = run([node('r', 'REST2')]);
    expect(rest).toHaveLength(0);
    expect(d.severity).toBe('warning');
    expect(d.suggestion).toBe('net.noodl.HTTP');
    expect(d.message).toContain('Use HTTP Request (net.noodl.HTTP) instead');
    expect(d.location).toMatchObject({ nodeId: 'r', nodeType: 'REST2' });
  });

  test('a retired type with no single successor still warns, without naming one', () => {
    const [d] = run([node('a', 'Animation', 'Fade')]);
    expect(d.severity).toBe('warning');
    expect(d.suggestion).toBeUndefined();
    expect(d.message).toContain('"Fade" (Animation)');
  });

  test('a current type raises nothing (control)', () => {
    expect(run([node('h', 'net.noodl.HTTP'), node('v', 'Variable2')])).toHaveLength(0);
  });
});
