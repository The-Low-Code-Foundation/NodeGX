/**
 * P107 NSP-021 §3.2 (s89) — where a node may sit in the visual tree has one rule, and the agent's checker reads it (R23).
 *
 * The editor marks four placements as errors on the node (`NodeGraphNode.evaluateHealth`); until s89 the validator the
 * Problems panel and the agent server share asked none of them. The rule is `@nodegx/project-contract/hierarchy`; the
 * editor's node warnings and `ComponentModel` call it, and so does `invalid-hierarchy`. The catalog carries the runtime
 * export's own child/parent fields (it mirrored them by hand until s89, and the mirror had no `haveComponentChildren`).
 *
 * The counts below were read in the running editor on 2026-10-12 (`WarningsModel`, copies of each project): nightbook
 * 26 `node-not-child` + 26 `node-invalid-child`; phase55-s6-haiku 3 `node-no-children` + 3 `node-invalid-child`; the
 * admin-shell project (a component with a `Component Children` slot holding a Group) 0.
 *
 *   cd packages/noodl-editor && npx jest tests-unit/nsp-021/hierarchy
 */
import * as fs from 'fs';
import * as path from 'path';

import { hierarchyFindings } from '@nodegx/project-contract/hierarchy';
import { TYPECASTS } from '@nodegx/project-contract/typecasts';

import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { loadV2Directory } from '../../src/editor/src/validation/loadV2Project';
import type { NormNode, NormProject } from '../../src/editor/src/validation/model';
import { hierarchyTyper } from '../../src/editor/src/validation/rules/invalidHierarchy';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const catalogJson = require('../../../noodl-types/src/node-catalog.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const enrichedJson = require('../../../noodl-types/src/node-catalog-enriched.json');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const catalog = loadDefaultCatalog();

function node(id: string, type: string, children: string[] = [], parent?: string): NormNode {
  return { id, type, label: id, parent, children, instancePorts: [] } as unknown as NormNode;
}

/** Only this rule, so a neighbour's finding cannot be mistaken for it. */
function run(project: NormProject) {
  return new SemanticValidator(catalog).validate(project, { only: new Set([DiagnosticCode.InvalidHierarchy]) }).diagnostics;
}

const CARD = { name: '/Components/Card', nodes: [node('cg', 'Group', ['cc']), node('cc', 'Component Children', [], 'cg')], connections: [] };
const LOGIC = { name: '/Data/Profile', nodes: [node('fn', 'JavaScriptFunction')], connections: [] };

describe('NSP-021: where a node may sit has one rule (R23)', () => {
  test('the premise: the catalog says what the rule reads', () => {
    expect(catalog.getNode('Group')?.allowChildrenWithCategory).toEqual(['Visual']);
    expect(catalog.getNode('JavaScriptFunction')?.allowAsChild).toBeFalsy();
    expect(catalog.getNode('For Each')?.allowChildrenWithCategory).toBeUndefined();
  });

  test('both catalogs carry Component Children’s haveComponentChildren (the field the hand mirror never had)', () => {
    for (const doc of [catalogJson, enrichedJson]) {
      const cc = doc.nodes.find((n: { typeName: string }) => n.typeName === 'Component Children');
      expect(cc.haveComponentChildren).toEqual(['Visual']);
    }
  });

  test('the enriched catalog the agent server reads carries the typecast table too (s88 regenerated only one)', () => {
    expect(enrichedJson.typecasts).toEqual(TYPECASTS);
  });

  test('a logic node inside a Group: one error on it, naming the move', () => {
    const found = run({ components: [{ name: '/Pages/Home', nodes: [node('g', 'Group', ['fn']), node('fn', 'JavaScriptFunction', [], 'g')], connections: [] }] } as unknown as NormProject);
    expect(found.map((d) => [d.severity, d.location.nodeId])).toEqual([['error', 'fn']]);
    expect(found[0].message).toContain('Make it a root of the component');
  });

  test('a component with no visual root, inside a Group: an error, as the editor marks it', () => {
    const found = run({ components: [LOGIC, { name: '/Pages/Home', nodes: [node('g', 'Group', ['p']), node('p', '/Data/Profile', [], 'g')], connections: [] }] } as unknown as NormProject);
    expect(found.map((d) => d.location.nodeId)).toEqual(['p']);
  });

  test('cards inside a For Each: the For Each holds nothing, and the card is out of place', () => {
    const found = run({ components: [CARD, { name: '/Pages/Home', nodes: [node('fe', 'For Each', ['c']), node('c', '/Components/Card', [], 'fe')], connections: [] }] } as unknown as NormProject);
    expect(found.map((d) => d.location.nodeId).sort()).toEqual(['c', 'fe']);
  });

  test('a Group inside a component with a Component Children slot is fine (the control the catalog used to fail)', () => {
    const p = { components: [CARD, { name: '/Pages/Home', nodes: [node('card', '/Components/Card', ['inside']), node('inside', 'Group', [], 'card')], connections: [] }] } as unknown as NormProject;
    expect(run(p)).toEqual([]);
    // and without the field it would not be: the planted gap is visible through the same rule
    const typeOf = hierarchyTyper({ catalog, project: p });
    const blind = (t: string) => {
      const r = typeOf(t);
      return r && t === 'Component Children' ? { ...r, haveComponentChildren: undefined } : r;
    };
    expect(hierarchyFindings(p.components[1].nodes, (t) => (t === '/Components/Card' ? { allowAsChild: true, category: 'Visual' } : blind(t))).map((f) => f.key).sort()).toEqual([
      'node-invalid-child',
      'node-no-children'
    ]);
  });

  test('nightbook (committed template): the running editor’s 26 + 26, one error per node here', () => {
    const p = loadV2Directory(path.join(REPO, 'templates', 'nightbook'));
    const typeOf = hierarchyTyper({ catalog, project: p });
    const keys = p.components.flatMap((c) => hierarchyFindings(c.nodes, typeOf).map((f) => f.key));
    expect(keys.filter((k) => k === 'node-not-child')).toHaveLength(26);
    expect(keys.filter((k) => k === 'node-invalid-child')).toHaveLength(26);
    expect(keys).toHaveLength(52);
    expect(run(p)).toHaveLength(26);
  });

  const HAIKU = '/Users/richardosborne/vscode_projects/NodeGX test projects/phase55-s6-haiku';
  (fs.existsSync(HAIKU) ? test : test.skip)('phase55-s6-haiku (Richard’s, local): the running editor’s 3 + 3', () => {
    const p = loadV2Directory(HAIKU);
    const typeOf = hierarchyTyper({ catalog, project: p });
    const keys = p.components.flatMap((c) => hierarchyFindings(c.nodes, typeOf).map((f) => f.key)).sort();
    expect(keys).toEqual(['node-invalid-child', 'node-invalid-child', 'node-invalid-child', 'node-no-children', 'node-no-children', 'node-no-children']);
  });
});
