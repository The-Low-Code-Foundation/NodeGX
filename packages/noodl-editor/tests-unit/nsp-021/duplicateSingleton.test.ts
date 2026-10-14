/**
 * P107 NSP-021 §3.2 (s93) — a second Page in one component is marked, by the editor and by the checker the Problems
 * panel and the agent server share (R34, "Warn on the second one, in both").
 *
 * The editor's warning read `allowSingleInstanceOnly`, which no producer sends, and the checker had no rule. Measured
 * over 370 projects: 1,477 components hold exactly one Page or cloud Request (the case the bug's first proposal would
 * have marked) and none holds two. The rule is `@nodegx/project-contract/singleton`.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-021/duplicateSingleton
 */
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { NormNode, NormProject } from '../../src/editor/src/validation/model';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';

const catalog = loadDefaultCatalog();

function node(id: string, type: string, label?: string): NormNode {
  return { id, type, label, children: [], instancePorts: [] } as unknown as NormNode;
}

function run(nodes: NormNode[]) {
  const project = { components: [{ name: '/Pages/Home', nodes, connections: [] }] } as unknown as NormProject;
  return new SemanticValidator(catalog).validate(project, { only: new Set([DiagnosticCode.DuplicateSingleton]) }).diagnostics;
}

describe('NSP-021: a second Page in one component (R34)', () => {
  test('the premise: the catalog says which types a component holds once', () => {
    expect(catalog.getNode('Page')?.singleton).toBe(true);
    expect(catalog.getNode('noodl.cloud.request')?.singleton).toBe(true);
    expect(catalog.getNode('Group')?.singleton).toBeFalsy();
  });

  test('one Page raises nothing (every page in every project is this case)', () => {
    expect(run([node('p', 'Page'), node('g', 'Group')])).toHaveLength(0);
  });

  test('a second Page warns, on the second only', () => {
    const found = run([node('p1', 'Page'), node('g', 'Group'), node('p2', 'Page', 'Checkout')]);
    expect(found.map((d) => [d.severity, d.location.nodeId])).toEqual([['warning', 'p2']]);
    expect(found[0].message).toBe('"Checkout" (Page) is a second Page in this component, which holds only one. Remove one of them.');
  });

  test('two of a type that is not a singleton raise nothing (control)', () => {
    expect(run([node('g1', 'Group'), node('g2', 'Group')])).toHaveLength(0);
  });
});
