/**
 * P112-OWN020-PILLWRAP and P112-OWN020-FILLGROW — a node with no size setting fills its parent.
 *
 * Every Text and Group says `width: 100%`, and every Group `height: 100%`, unless told otherwise. In a row a percentage
 * width means "grow"; in a column a percentage height does (`noodl-viewer-react/src/layout.ts` `Layout.size`: flexGrow
 * = the percentage, flexShrink 1). That default suits a page section and is a trap inside small content: GLM-5.3 hit
 * both in one quiz (CGQ1), rendered it, and reported it verified. Richard ruled 2026-10-26: warn and teach, no default
 * change, "but make sure it works because adding texts with default sizing and seeing them have weird layout used to
 * drive me nuts". So these are live rules (`ALL_RULES`): the Problems panel says them while a person edits, and an
 * agent's write gets them too.
 *
 * Both are narrow on purpose, because a filling child is usually right:
 *  - the row must size to its own content (a full-width row SHOULD share its width out), and two or more children
 *    must be growing (one grower in a content row gets exactly the room left);
 *  - the filling row must hold only content-height children (nothing in it can use the height), and have a sibling
 *    (a lone child filling its box is a choice), in a column whose height is decided all the way up to its Page (a
 *    content-sized box anywhere above leaves nothing spare; a component that is not a page is placed elsewhere).
 *    Whether the band shows today depends on the page being shorter than the screen, and the message says so.
 * Abstentions shared with the authored-precondition checks: wired sizing, a component instance (its root's sizing is
 * not in this graph), an out-of-flow child, a capped grower (`maxWidth`/`maxHeight` bind as plain CSS).
 */
import type { CatalogIndex } from '../CatalogIndex';
import { DiagnosticCode, type Diagnostic } from '../diagnostics';
import { DISTRIBUTING, parentAxis, widthIsPercentage } from '../layoutInertCombination';
import { isComponentRef, type NormComponent, type NormNode } from '../model';
import { resolveAgainstDefaults } from '../portConditions';
import type { Rule, RuleContext } from './types';

const GROUP = 'Group';
const CONTENT_WIDTH = new Set(['contentSize', 'contentWidth']);
const CONTENT_HEIGHT = new Set(['contentSize', 'contentHeight']);

const resolved = (node: NormNode, catalog: CatalogIndex) =>
  resolveAgainstDefaults(node.parameters ?? {}, catalog.inputDefaults(node.type));

const wired = (component: NormComponent, node: NormNode, ports: readonly string[]) =>
  component.connections.some((c) => c.toId === node.id && ports.includes(c.toProperty));

const isSet = (value: unknown) => value !== undefined && value !== null && value !== '';

const named = (node: NormNode) => (node.label ? `"${node.label}"` : node.id);

/** The visual, in-flow children whose sizing this graph decides, with their resolved parameters. */
function inFlowChildren(parent: NormNode, component: NormComponent, nodeById: Map<string, NormNode>, catalog: CatalogIndex) {
  const out: { node: NormNode; params: Record<string, unknown> }[] = [];
  for (const id of parent.children ?? []) {
    const node = nodeById.get(id);
    if (!node || isComponentRef(node.type) || !catalog.getNode(node.type)?.isVisual) continue;
    const params = resolved(node, catalog);
    if (params['position'] === 'absolute' || params['position'] === 'sticky') continue;
    out.push({ node, params });
  }
  return out;
}

/**
 * Whether `column` can be handed height to spare: its height is decided all the way up to its `Page` (every box on the
 * way a percentage of the one above, or a fixed length, none of them sized to its content). Whether there IS spare
 * height then depends on how much the page holds against the screen, which no graph says: so the message says "when
 * the page is shorter than the screen". A component's root that is not a page is placed by someone else (undefined).
 *
 * Calibrated 2026-10-26 over 196 local projects (42 hits) and rendered at 390 and 1280: every hit on a page shorter
 * than the screen was a tall empty band (Members area "Ways in" 398 px for 26, the site builder's "New page" 774 for
 * 48, five quizzes by five models 181–279 px of slack); the hits on pages taller than the screen measured none today.
 * Neither `bodyScroll` nor a `minHeight` separates the two (two quizzes on scrolling pages, no minHeight, measured the
 * band), so the rule does not pretend to.
 */
function hasSpareHeight(column: NormNode, nodeById: Map<string, NormNode>, catalog: CatalogIndex): boolean | undefined {
  for (let node: NormNode | undefined = column; node; node = node.parent ? nodeById.get(node.parent) : undefined) {
    if (node.type === 'Page') return true;
    const params = resolved(node, catalog);
    if (CONTENT_HEIGHT.has(params['sizeMode'] as string)) return false;
    const percentage = widthIsPercentage(params['height']);
    if (percentage === false) return true; // a fixed length
    if (percentage === undefined) return undefined;
    if (!node.parent) return undefined;
  }
  return undefined;
}

function location(component: NormComponent, node: NormNode) {
  return {
    component: component.name,
    nodeId: node.id,
    nodeType: node.type,
    ...(node.label ? { nodeLabel: node.label } : {}),
    port: 'sizeMode',
    plug: 'input' as const
  };
}

export const contentRowSplitsItsChildren: Rule = {
  code: DiagnosticCode.ContentRowSplitsItsChildren,
  description: 'A row that sizes to its content shares it out equally between children with no width, so words wrap.',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { component, nodeById } of ctx.components) {
      for (const row of component.nodes) {
        if (row.type !== GROUP) continue;
        const params = resolved(row, ctx.catalog);
        if (params['flexDirection'] !== 'row' || !CONTENT_WIDTH.has(params['sizeMode'] as string)) continue;
        if (wired(component, row, ['sizeMode', 'flexDirection'])) continue;
        // A distributing justifyContent over growers is `justify-content-distributes-nothing`'s sentence.
        if (DISTRIBUTING.has(params['justifyContent'] as string)) continue;
        const growing = inFlowChildren(row, component, nodeById, ctx.catalog).filter(({ node, params: p }) => {
          if (CONTENT_WIDTH.has(p['sizeMode'] as string)) return false;
          if (wired(component, node, ['sizeMode', 'width', 'maxWidth']) || isSet(p['maxWidth'])) return false;
          return widthIsPercentage(p['width']) === true;
        });
        if (growing.length < 2) continue;
        out.push({
          code: DiagnosticCode.ContentRowSplitsItsChildren,
          severity: 'warning',
          message:
            `This row sizes to its content, but ${growing.length} of its children (${growing.map((g) => named(g.node)).join(', ')}) ` +
            'have no width of their own, so they take equal shares of the row: the longer one wraps onto a second line ' +
            'although the words would fit. Set each of them to Size: Content (sizeMode "contentSize") so they hug their words.',
          location: location(component, row),
          suggestion: 'sizeMode: "contentSize" on each child'
        });
      }
    }
    return out;
  }
};

export const rowOfWordsFillsItsColumn: Rule = {
  code: DiagnosticCode.RowOfWordsFillsItsColumn,
  description: 'A row of words with no height of its own takes all the spare height of its column.',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { component, nodeById } of ctx.components) {
      for (const row of component.nodes) {
        if (row.type !== GROUP || !row.parent) continue;
        const params = resolved(row, ctx.catalog);
        if (params['flexDirection'] !== 'row') continue;
        if (CONTENT_HEIGHT.has(params['sizeMode'] as string)) continue;
        if (params['position'] === 'absolute' || params['position'] === 'sticky') continue;
        if (widthIsPercentage(params['height']) !== true) continue;
        if (wired(component, row, ['sizeMode', 'height', 'maxHeight', 'flexDirection']) || isSet(params['maxHeight'])) continue;

        const parent = nodeById.get(row.parent);
        if (!parent || parentAxis(parent, ctx.catalog) !== 'column') continue;
        // A column whose height is not decided all the way up to the page has none to hand out (or none we can know).
        if (hasSpareHeight(parent, nodeById, ctx.catalog) !== true) continue;
        if (inFlowChildren(parent, component, nodeById, ctx.catalog).length < 2) continue;

        // Only words (or other content-height things) in it: nothing in the row can use the height it takes.
        const inside = inFlowChildren(row, component, nodeById, ctx.catalog);
        if (inside.length === 0) continue;
        if (!inside.every(({ params: p }) => CONTENT_HEIGHT.has(p['sizeMode'] as string))) continue;

        out.push({
          code: DiagnosticCode.RowOfWordsFillsItsColumn,
          severity: 'warning',
          message:
            'This row has no height of its own, so whenever the page is shorter than the screen it takes all the spare ' +
            'height of its column: what it holds floats in the middle of a tall empty band, far from the content around ' +
            'it. Set it to Size: Content height (sizeMode "contentHeight") so it is as tall as its words. If it is meant ' +
            'to fill the space, give it a height to say so.',
          location: location(component, row),
          suggestion: 'sizeMode: "contentHeight"'
        });
      }
    }
    return out;
  }
};
