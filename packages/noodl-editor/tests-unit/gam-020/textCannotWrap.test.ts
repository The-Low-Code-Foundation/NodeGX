/**
 * P88 GAM-020 (P78 D58) — a sentence in a content-sized Text can never wrap, and the door says so.
 *
 * `Text.tsx` renders `contentSize` and `contentWidth` as `white-space: pre` (deliberate, RKT-001 §2),
 * so a sentence is one line whatever box it sits in. Rocket School's helper did exactly that and every
 * French sentence ran off its card with zero diagnostics.
 *
 * R18 (Richard, 2026-09-17): **warn above a length threshold measured from the corpus.** The threshold is
 * the shortest line ever measured clipping, *"Tu as atteint la planète !"* (26 characters, 320px in a 304px
 * banner, RKT-001 §6). The longest heading in the corpus is 20 ("An interactive story"), and every heading
 * at or under it stays silent.
 *
 * Each silent arm sits beside the AC1 arm, which fires in the same file.
 */

import {
  authoredPreconditionDiagnostics,
  connectedInputs,
  isBlockingForAuthoredOutput
} from '../../src/editor/src/validation/authoredCandidate';
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode, type Diagnostic } from '../../src/editor/src/validation/diagnostics';
import { checkLayoutInertCombination, type LayoutNode } from '../../src/editor/src/validation/layoutInertCombination';

const catalog = loadDefaultCatalog();
const COMPONENT = '/Game/Feedback banner';

/** AC1's sentence: the wrong-answer banner, cut at both ends at 390×844 FR. */
const FRENCH = "La réponse était 5. Il n'y a que cinq paires";

/** The Text inside a 304px Group, the banner's shape. */
function banner(text: Record<string, unknown>, textId = 'fbCorrection'): LayoutNode[] {
  return [
    {
      id: 'fbCard',
      type: 'Group',
      parameters: { sizeMode: 'explicit', width: { value: 304, unit: 'px' } },
      children: [textId]
    } as LayoutNode,
    { id: textId, type: 'Text', parameters: text } as LayoutNode
  ];
}

function run(nodes: LayoutNode[], wired?: ReadonlySet<string>): Diagnostic[] {
  return checkLayoutInertCombination(nodes, { component: COMPONENT, catalog, connectedInputs: wired }).filter(
    (d) => d.code === DiagnosticCode.TextCannotWrap
  );
}

describe('GAM-020 — a sentence in a content-sized Text is told it cannot wrap', () => {
  it('🔴 AC1/AC2: the French correction at contentSize is named, at the text port, with the exit', () => {
    const found = run(banner({ text: FRENCH, sizeMode: 'contentSize' }));
    expect(
      found.map((d) => ({ code: d.code, severity: d.severity, nodeId: d.location.nodeId, port: d.location.port }))
    ).toEqual([{ code: DiagnosticCode.TextCannotWrap, severity: 'warning', nodeId: 'fbCorrection', port: 'sizeMode' }]);
    expect(found[0].message).toContain('contentHeight');
    expect(found[0].suggestion).toBe('sizeMode: "contentHeight"');
  });

  it('🔴 contentWidth cannot wrap either', () => {
    expect(run(banner({ text: FRENCH, sizeMode: 'contentWidth' }))).toHaveLength(1);
  });

  it('🔴 the threshold is the shortest line measured clipping: 26 characters fires', () => {
    expect(run(banner({ text: 'Tu as atteint la planète !', sizeMode: 'contentSize' }))).toHaveLength(1);
  });

  it('AC2: silent at contentHeight, and on a bare Text (its own default wraps)', () => {
    expect(run(banner({ text: FRENCH, sizeMode: 'contentHeight' }))).toEqual([]);
    expect(run(banner({ text: FRENCH }))).toEqual([]);
  });

  it('AC2: silent when the author asked for one line (textOverflow ellipsis or clip, DEF-031)', () => {
    expect(run(banner({ text: FRENCH, sizeMode: 'contentSize', textOverflow: 'ellipsis' }))).toEqual([]);
    expect(run(banner({ text: FRENCH, sizeMode: 'contentSize', textOverflow: 'clip' }))).toEqual([]);
  });

  it('AC2: silent on a single word, however long', () => {
    expect(run(banner({ text: 'Anticonstitutionnellement', sizeMode: 'contentSize' }))).toEqual([]);
  });

  it('R18: silent on headings the corpus shows fitting, up to 25 characters', () => {
    for (const heading of ['Pixel Dungeon', 'What you carry', 'An interactive story', 'Nothing of that kind yet.']) {
      expect({ heading, found: run(banner({ text: heading, sizeMode: 'contentSize' })) }).toEqual({
        heading,
        found: []
      });
    }
  });

  it('a line break is honoured by pre: the longest LINE is what is measured', () => {
    expect(run(banner({ text: 'Tu as atteint\nla planète ! Bravo', sizeMode: 'contentSize' }))).toEqual([]);
    expect(run(banner({ text: `Bravo\n${FRENCH}`, sizeMode: 'contentSize' }))).toHaveLength(1);
  });

  it('AC2: silent when text, sizeMode or textOverflow is wired (unknowable abstains)', () => {
    const nodes = banner({ text: FRENCH, sizeMode: 'contentSize' });
    for (const port of ['text', 'sizeMode', 'textOverflow']) {
      expect({ port, found: run(nodes, new Set([`fbCorrection::${port}`])) }).toEqual({ port, found: [] });
    }
  });

  it('a token is not a sentence', () => {
    expect(run(banner({ text: 'var(--copy-banner-correction-long)  ', sizeMode: 'contentSize' }))).toEqual([]);
  });

  it('AC7: inside a Columns, the Columns warning speaks and this one does not (same exit, one diagnostic)', () => {
    const nodes: LayoutNode[] = [
      { id: 'cols', type: 'net.noodl.visual.columns', parameters: {}, children: ['t'] } as LayoutNode,
      { id: 't', type: 'Text', parameters: { text: FRENCH, sizeMode: 'contentSize' } } as LayoutNode
    ];
    const all = checkLayoutInertCombination(nodes, { component: COMPONENT, catalog });
    expect(all.map((d) => d.code)).toEqual([DiagnosticCode.ColumnsChildKeepsOwnWidth]);
  });

  it('reached through authoredPreconditionDiagnostics with real wires, and advisory', () => {
    const nodes = banner({ text: FRENCH, sizeMode: 'contentSize' });
    const composed = (wires: never[]) =>
      authoredPreconditionDiagnostics({
        component: COMPONENT,
        nodes: nodes as never,
        components: [COMPONENT],
        catalog,
        connections: connectedInputs(wires)
      } as never).filter((d) => d.code === DiagnosticCode.TextCannotWrap);
    expect(composed([])).toHaveLength(1);
    expect(composed([{ fromId: 'x', fromProperty: 'value', toId: 'fbCorrection', toProperty: 'text' }] as never)).toEqual(
      []
    );
    expect(
      isBlockingForAuthoredOutput({ code: DiagnosticCode.TextCannotWrap, severity: 'warning' } as Diagnostic)
    ).toBe(false);
  });
});
