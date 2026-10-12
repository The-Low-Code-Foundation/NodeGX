/**
 * P107 NSP-021 (s89), R23 — where a node may sit in the visual tree: the rule the editor's node warnings, its component
 * types and the agent's checker (`invalid-hierarchy`) all call. Types here are written out by hand, as the runtime's
 * node library exports them (`nodelibraryexport.ts`): a Visual node may be a child and, with `allowChildren`, holds
 * Visual children; `Component Children` carries `haveComponentChildren: ['Visual']`.
 */
import {
  cannotBeAChild,
  cannotHaveChildren,
  cannotHoldChild,
  componentHierarchyType,
  hierarchyFindings,
  rootCategoryDisagrees,
  type HierarchyType
} from '../hierarchy';

const GROUP: HierarchyType = { category: 'Visual', allowAsChild: true, allowChildrenWithCategory: ['Visual'] };
const TEXT: HierarchyType = { category: 'Visual', allowAsChild: true };
const FOR_EACH: HierarchyType = { category: 'Visual', allowAsChild: true };
const FUNCTION: HierarchyType = { category: 'CustomCode' };
const SLOT: HierarchyType = { category: 'Visual', allowAsChild: true, haveComponentChildren: ['Visual'] };

describe('hierarchy: the predicates', () => {
  test('a logic node may not be a child; a visual one may', () => {
    expect(cannotBeAChild(FUNCTION)).toBe(true);
    expect(cannotBeAChild(TEXT)).toBe(false);
  });
  test('a parent holds only the categories it names', () => {
    expect(cannotHoldChild(GROUP, TEXT)).toBe(false);
    expect(cannotHoldChild(GROUP, FUNCTION)).toBe(true);
    expect(cannotHoldChild(FOR_EACH, TEXT)).toBe(true);
    expect(cannotHoldChild(GROUP, {})).toBe(true); // no category at all
  });
  test('a node with no child categories holds nothing', () => {
    expect(cannotHaveChildren(FOR_EACH)).toBe(true);
    expect(cannotHaveChildren(GROUP)).toBe(false);
  });
  test('roots of two categories disagree; a logic root beside them does not count', () => {
    expect(rootCategoryDisagrees(GROUP, [TEXT, FUNCTION])).toBe(false);
    expect(rootCategoryDisagrees(GROUP, [{ category: 'Other', allowAsChild: true }])).toBe(true);
    expect(rootCategoryDisagrees(FUNCTION, [{ category: 'Other', allowAsChild: true }])).toBe(false);
  });
});

describe('hierarchy: a component instance', () => {
  test('a component with a visual root may be a child, with that root’s category (the last one names it)', () => {
    expect(componentHierarchyType([FUNCTION, GROUP], [FUNCTION, GROUP])).toEqual({ category: 'Visual', allowAsChild: true, allowChildrenWithCategory: undefined });
  });
  test('a component with no visual root may not', () => {
    expect(componentHierarchyType([FUNCTION], [FUNCTION]).allowAsChild).toBe(false);
  });
  test('a Component Children slot anywhere in its graph makes it hold Visual children', () => {
    expect(componentHierarchyType([GROUP], [GROUP, SLOT]).allowChildrenWithCategory).toEqual(['Visual']);
  });
});

describe('hierarchy: the findings over one component', () => {
  const types: Record<string, HierarchyType> = { Group: GROUP, Text: TEXT, 'For Each': FOR_EACH, Function: FUNCTION };
  const typeOf = (t: string) => types[t];

  test('a Function inside a Group: not a child, and not held', () => {
    const found = hierarchyFindings(
      [
        { id: 'g', type: 'Group', children: ['f'] },
        { id: 'f', type: 'Function' }
      ],
      typeOf
    );
    expect(found).toEqual([
      { key: 'node-not-child', nodeId: 'f', parentId: 'g' },
      { key: 'node-invalid-child', nodeId: 'f', parentId: 'g' }
    ]);
  });

  test('a Text inside a For Each: the For Each holds nothing (the parent is read from `children` or `parent`)', () => {
    const found = hierarchyFindings(
      [
        { id: 'fe', type: 'For Each' },
        { id: 't', type: 'Text', parent: 'fe' }
      ],
      typeOf
    );
    expect(found.map((f) => f.key)).toEqual(['node-invalid-child']);
    const viaChildren = hierarchyFindings(
      [
        { id: 'fe', type: 'For Each', children: ['t'] },
        { id: 't', type: 'Text' }
      ],
      typeOf
    );
    expect(viaChildren.map((f) => f.key).sort()).toEqual(['node-invalid-child', 'node-no-children']);
  });

  test('a type the caller cannot resolve is skipped on both ends', () => {
    expect(
      hierarchyFindings(
        [
          { id: 'g', type: 'Group', children: ['k'] },
          { id: 'k', type: 'some-kit.Widget' }
        ],
        typeOf
      )
    ).toEqual([]);
  });

  test('a clean tree has nothing to say', () => {
    expect(
      hierarchyFindings(
        [
          { id: 'g', type: 'Group', children: ['t'] },
          { id: 't', type: 'Text' },
          { id: 'f', type: 'Function' }
        ],
        typeOf
      )
    ).toEqual([]);
  });
});
