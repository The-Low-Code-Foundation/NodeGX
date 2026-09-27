/**
 * GAM-005 — a Variable inside a component drawn more than once.
 *
 * The predicate, pure. The MCP spec (`noodl-mcp/tests/gam005VariableInRepeatedComponent.test.ts`)
 * grades the doors an agent calls; this grades the counting the doors rely on, and the editor
 * client's shape of the escape (`GraphNode.comment` is flat, where a stored node nests it in
 * `metadata`).
 *
 * 🔴 Every quiet case sits beside a firing twin that differs in one thing, so "silent" is never
 * "did not run".
 *
 * @module noodl-editor/tests-unit/gam-005/repeatedComponentVariable
 */
import { authoredPreconditionDiagnostics } from '@noodl-models/../validation/authoredCandidate';
import { loadDefaultCatalog } from '@noodl-models/../validation/catalog';
import { DiagnosticCode } from '@noodl-models/../validation/diagnostics';
import {
  checkVariableInRepeatedComponent,
  componentCopies,
  type VariableView,
  type VariableViewNode
} from '@noodl-models/../validation/repeatedComponentVariable';

const BANNER = '/Game/Feedback banner';

function banner(extra: Partial<VariableViewNode> = {}): VariableView {
  return {
    name: BANNER,
    nodes: [
      { id: 'root', type: 'Group' },
      { id: 'open', type: 'Variable2', label: 'Is it open', parameters: { name: 'bannerOpen' } },
      { id: 'setOpen', type: 'Set Variable', parameters: { name: 'bannerOpen' }, ...extra }
    ]
  };
}

const page = (name: string, nodes: VariableViewNode[]): VariableView => ({ name, nodes });
const instance = (id: string, type = BANNER): VariableViewNode => ({ id, type });
const ours = (component: string, views: VariableView[]) =>
  checkVariableInRepeatedComponent({ component, views }).filter(
    (d) => d.code === DiagnosticCode.VariableInRepeatedComponent
  );

describe('GAM-005 — counting copies', () => {
  it('a component nothing places is one copy; two instances are two', () => {
    const views = [banner(), page('/Pages/Race', [instance('a'), instance('b')])];
    const copies = componentCopies(views);
    expect(copies.get('Pages/Race')?.copies).toBe(1);
    expect(copies.get('Game/Feedback banner')).toMatchObject({ copies: 2, exact: true });
  });

  it('a placement inside a component drawn twice counts twice', () => {
    const views = [
      banner(),
      page('/Game/Card', [instance('only')]),
      page('/Pages/Race', [instance('c1', '/Game/Card'), instance('c2', '/Game/Card')])
    ];
    expect(componentCopies(views).get('Game/Feedback banner')?.copies).toBe(2);
    // The one-placement control: the same card placed once draws one banner.
    const once = [banner(), page('/Game/Card', [instance('only')]), page('/Pages/Race', [instance('c1', '/Game/Card')])];
    expect(componentCopies(once).get('Game/Feedback banner')?.copies).toBe(1);
  });

  it('an explicit For Each is more than one copy and not an exact count; a dynamic one is not read', () => {
    const explicit = [banner(), page('/Pages/Race', [{ id: 'rows', type: 'For Each', parameters: { template: BANNER } }])];
    expect(componentCopies(explicit).get('Game/Feedback banner')).toMatchObject({ copies: 2, exact: false });
    const dynamic = [
      banner(),
      page('/Pages/Race', [
        { id: 'rows', type: 'For Each', parameters: { template: BANNER, templateType: 'dynamic' } }
      ])
    ];
    expect(componentCopies(dynamic).get('Game/Feedback banner')?.copies).toBe(1);
  });

  it('a template named in path form resolves the same as the legacy name', () => {
    const views = [banner(), page('/Pages/Race', [{ id: 'rows', type: 'For Each', parameters: { template: 'Game/Feedback banner' } }])];
    expect(componentCopies(views).get('Game/Feedback banner')?.copies).toBe(2);
  });

  it('a cycle terminates', () => {
    const views = [page('/A', [instance('b', '/B')]), page('/B', [instance('a', '/A')])];
    const copies = componentCopies(views);
    expect(copies.get('A')?.copies).toBeGreaterThanOrEqual(1);
    expect(copies.get('B')?.copies).toBeGreaterThanOrEqual(1);
  });

  it('a later view of the same component replaces the earlier one (the candidate is appended last)', () => {
    const stale = page('/Pages/Race', [instance('a')]);
    const candidate = page('/Pages/Race', [instance('a'), instance('b')]);
    expect(componentCopies([banner(), stale, candidate]).get('Game/Feedback banner')?.copies).toBe(2);
    expect(componentCopies([banner(), candidate, stale]).get('Game/Feedback banner')?.copies).toBe(1);
  });
});

describe('GAM-005 — the diagnostic', () => {
  const twice = (extra?: Partial<VariableViewNode>) => [banner(extra), page('/Pages/Race', [instance('a'), instance('b')])];

  it('fires once per name, at the first node of that name, from the holder and from the placer alike', () => {
    const fromHolder = ours(BANNER, twice());
    const fromPlacer = ours('/Pages/Race', twice());
    expect(fromHolder).toHaveLength(1);
    expect(fromHolder[0].location).toMatchObject({ component: BANNER, nodeId: 'open', port: 'name' });
    expect(fromHolder[0].message).toContain(`${BANNER} is drawn 2 times`);
    expect(fromHolder[0].message).toContain('/Pages/Race places it 2 times');
    expect(fromPlacer).toEqual(fromHolder);
  });

  it('is silent from a component that neither holds nor places the banner', () => {
    const views = [...twice(), page('/Pages/Other', [{ id: 't', type: 'Text' }])];
    expect(ours('/Pages/Other', views)).toEqual([]);
    expect(ours(BANNER, views)).toHaveLength(1);
  });

  it('the editor client\'s flat comment silences it; so does a stored node\'s metadata.comment', () => {
    expect(ours(BANNER, twice({ comment: 'Shared on purpose — one answer, every banner' }))).toEqual([]);
    expect(ours(BANNER, twice({ metadata: { comment: 'shared ON PURPOSE' } }))).toEqual([]);
    expect(ours(BANNER, twice({ comment: 'Opens when the answer is checked' }))).toHaveLength(1);
  });

  it('a Variable with no name is not a Variable yet', () => {
    const views = [
      { name: BANNER, nodes: [{ id: 'v', type: 'Variable2', parameters: {} }] },
      page('/Pages/Race', [instance('a'), instance('b')])
    ];
    expect(ours(BANNER, views)).toEqual([]);
    expect(ours(BANNER, twice())).toHaveLength(1);
  });
});

describe('GAM-005 — the shared authored gate', () => {
  const run = (views?: VariableView[]) =>
    authoredPreconditionDiagnostics({
      component: '/Pages/Race',
      nodes: [
        { id: 'a', type: BANNER },
        { id: 'b', type: BANNER }
      ],
      components: [BANNER, '/Pages/Race'],
      catalog: loadDefaultCatalog(),
      ...(views ? { views } : {})
    }).filter((d) => d.code === DiagnosticCode.VariableInRepeatedComponent);

  it('runs when views are supplied, and "omitted" means do not check', () => {
    const views = [banner(), page('/Pages/Race', [instance('a'), instance('b')])];
    expect(run(views)).toHaveLength(1);
    expect(run()).toEqual([]);
  });

  it('is a warning and is not blocking for authored output', () => {
    const [d] = run([banner(), page('/Pages/Race', [instance('a'), instance('b')])]);
    expect(d.severity).toBe('warning');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isBlockingForAuthoredOutput } = require('@noodl-models/../validation/authoredCandidate');
    expect(isBlockingForAuthoredOutput(d)).toBe(false);
  });
});
