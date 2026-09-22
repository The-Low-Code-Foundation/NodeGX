/**
 * P99 HLT-014 §3.1 — a popup a screen reader announces as "dialog" and nothing else.
 *
 * The rule is exercised directly rather than through `SemanticValidator`: it reads structure and
 * parameters and needs no catalog, which keeps this in `tests-unit/` (and so in `test:main`)
 * rather than the Electron suite.
 *
 * 🔴 **Every arm that asserts the rule is SILENT sits beside one that asserts it FIRES on the same
 * shape with one thing changed.** A rule that returned `[]` unconditionally would pass six of the
 * arms below; the pairing is what makes the silence mean something
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 */

import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { NormComponent, NormNode } from '../../src/editor/src/validation/model';
import { dialogWithoutName } from '../../src/editor/src/validation/rules/dialogWithoutName';
import type { RuleContext } from '../../src/editor/src/validation/rules/types';

function node(id: string, type: string, parameters: Record<string, unknown> = {}): NormNode {
  return { id, type, children: [], instancePorts: [], parameters } as unknown as NormNode;
}

function component(name: string, nodes: NormNode[]): NormComponent {
  return { name, nodes, connections: [] };
}

/** Run the rule over a whole project; the first component is the one being "checked". */
function run(components: NormComponent[]) {
  const ctx = {
    project: { components, componentRefs: new Set(components.map((c) => c.name)) },
    catalog: undefined,
    options: {},
    components: components.map((c) => ({ component: c, nodeById: new Map(c.nodes.map((n) => [n.id, n])) })),
    counters: { nodesChecked: 0, endpointsChecked: 0 }
  } as unknown as RuleContext;
  return dialogWithoutName.run(ctx);
}

/** A page that opens `target`, with whatever Show Popup parameters the arm needs. */
const opener = (target: string, extra: Record<string, unknown> = {}) =>
  component('/Pages/Home', [node('show', 'NavigationShowPopup', { target, ...extra })]);

const heading = (tag: string) => node('title', 'Text', { text: 'Delete this project?', as: tag });
const plainText = () => node('title', 'Text', { text: 'Delete this project?' });

describe('dialog-without-name (HLT-014 §3.1)', () => {
  it('warns when the popup has neither an Accessible Name nor a heading', () => {
    const found = run([opener('/Components/Confirm'), component('/Components/Confirm', [plainText()])]);

    expect(found).toHaveLength(1);
    expect(found[0].code).toBe(DiagnosticCode.DialogWithoutName);
    expect(found[0].severity).toBe('warning');
    expect(found[0].location.nodeId).toBe('show');
    expect(found[0].location.component).toBe('/Pages/Home');
    expect(found[0].location.port).toBe('accessibleName');
    // It must name the popup it is talking about; "a popup somewhere" is not actionable.
    expect(found[0].message).toContain('/Components/Confirm');
  });

  it('(control) is silent once an Accessible Name is typed in — same fixture, one parameter', () => {
    expect(
      run([
        opener('/Components/Confirm', { accessibleName: 'Delete project' }),
        component('/Components/Confirm', [plainText()])
      ])
    ).toEqual([]);
  });

  it('a whitespace-only Accessible Name is not a name', () => {
    const found = run([
      opener('/Components/Confirm', { accessibleName: '   ' }),
      component('/Components/Confirm', [plainText()])
    ]);
    expect(found).toHaveLength(1);
  });

  describe('what counts as a heading — the runtime looks for h1–h3, on the `as` port', () => {
    // 🔴 The default `as` is `div`. A Text with no tag is the 728-popup case: it looks like a
    // title on screen and names nothing to a screen reader.
    it('a Text with no `as` is NOT a heading', () => {
      expect(run([opener('/C'), component('/C', [plainText()])])).toHaveLength(1);
    });

    for (const tag of ['h1', 'h2', 'h3']) {
      it(`a Text with as="${tag}" names the dialog`, () => {
        expect(run([opener('/C'), component('/C', [heading(tag)])])).toEqual([]);
      });
    }

    // `querySelector('h1, h2, h3')` does not match these. The rule reports what the runtime does.
    for (const tag of ['h4', 'h5', 'h6', 'p', 'div', 'span']) {
      it(`a Text with as="${tag}" does NOT name the dialog`, () => {
        expect(run([opener('/C'), component('/C', [heading(tag)])])).toHaveLength(1);
      });
    }
  });

  describe('🔴 the runtime searches the rendered subtree, so the rule recurses', () => {
    it('a heading one component down names the dialog', () => {
      expect(
        run([
          opener('/Components/Confirm'),
          component('/Components/Confirm', [node('inner', '/Components/DialogHeader')]),
          component('/Components/DialogHeader', [heading('h2')])
        ])
      ).toEqual([]);
    });

    it('a heading TWO components down names the dialog', () => {
      expect(
        run([
          opener('/Components/Confirm'),
          component('/Components/Confirm', [node('a', '/Components/Mid')]),
          component('/Components/Mid', [node('b', '/Components/Deep')]),
          component('/Components/Deep', [heading('h1')])
        ])
      ).toEqual([]);
    });

    it('(the firing half of the pair) the same nesting with no heading anywhere still warns', () => {
      expect(
        run([
          opener('/Components/Confirm'),
          component('/Components/Confirm', [node('a', '/Components/Mid')]),
          component('/Components/Mid', [node('b', '/Components/Deep')]),
          component('/Components/Deep', [plainText()])
        ])
      ).toHaveLength(1);
    });

    it('a component cycle terminates instead of hanging, and still warns', () => {
      expect(
        run([
          opener('/Components/A'),
          component('/Components/A', [node('b', '/Components/B')]),
          component('/Components/B', [node('a', '/Components/A')])
        ])
      ).toHaveLength(1);
    });
  });

  describe('what this rule deliberately does not say', () => {
    it('says nothing about a Show Popup with no target — that is another code', () => {
      expect(run([opener(''), component('/C', [plainText()])])).toEqual([]);
    });

    it('says nothing when the target does not resolve — that is another code', () => {
      expect(run([opener('/Components/Missing'), component('/C', [plainText()])])).toEqual([]);
    });

    it('(the firing half) the same opener resolves and warns once the target exists', () => {
      expect(run([opener('/Components/Missing'), component('/Components/Missing', [plainText()])])).toHaveLength(1);
    });
  });

  it('reports once per Show Popup, not once per popup component', () => {
    const page = component('/Pages/Home', [
      node('s1', 'NavigationShowPopup', { target: '/C' }),
      node('s2', 'NavigationShowPopup', { target: '/C' })
    ]);
    const found = run([page, component('/C', [plainText()])]);
    expect(found).toHaveLength(2);
    expect(found.map((d) => d.location.nodeId).sort()).toEqual(['s1', 's2']);
  });

  it('is registered, enabled by default, and described for --list-rules', () => {
    expect(dialogWithoutName.code).toBe(DiagnosticCode.DialogWithoutName);
    expect(dialogWithoutName.defaultEnabled).toBe(true);
    expect(dialogWithoutName.description.length).toBeGreaterThan(20);
  });
});
