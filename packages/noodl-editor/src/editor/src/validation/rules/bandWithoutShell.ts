/**
 * Rule: a band whose content is not inside one shell (P112 OWN-028 AC3, `P112-OWN027-NOSHELLGATE`).
 *
 * The style vocabulary's spine is two looks: a **band** (a full-width section, padded top and bottom, carrying the
 * section's ground) and a **shell** inside it (a Group with `maxWidth` 1200 px and `--space-6` either side), and the
 * `band` composition says in prose that *"a band always holds exactly one shell, and a band whose content is not
 * inside one runs edge to edge"*. A strong model reads that sentence. A 2B model building the tree does not, because
 * that call is about node types, not looks: Gemma 4 E2B built 13 sections over OWN-027's r1 and r2 and none had a
 * shell, so the page's words started at x = 0 of a 1280 px window, and the validator said nothing (r2: 0 errors,
 * 0 warnings). Prose advises, gates bind.
 *
 * ## The band signature
 *
 * A `Group` that is full width (`width` 100 %, its default), lays out a column, has no `maxWidth` of its own and no
 * left or right padding (a Group with side padding is its own gutter: a shell, a card), says it is a section (padded
 * top or bottom, a ground of its own, or rendered as `<section>`/`<header>`/`<footer>`), holds no band itself (that is
 * the page's own column), and sits
 * where a section sits — at the root of its component, or under ancestors that are themselves full width with no
 * `maxWidth` and no side padding (the page's own column). That is every band look (`band`, `bandSurface`,
 * `heroGround`, `ctaBand`, `footerBand`, `imageGround`) and the hand-made section that copies them.
 *
 * ## What it must not hold
 *
 * Content outside a gutter: a Text, an Image, a Columns, a Button, or a plain Group of them, as a direct child. What
 * is guarded is a shell (a Group with a `maxWidth`), a Group with side padding, a component instance (not judged: what
 * it draws is another component's root), or a plain wrapper whose contents are all guarded — so an app screen that
 * holds a bar and a nav (instances) beside one shell is a band done right (gram, marketplace). An absolutely positioned
 * child (a decoration) is not counted, and an empty band is not judged.
 *
 * Calibrated 2026-10-28: fires on 7 of 7 sections in OWN-027 r2 and 6 of 6 in r1 (Gemma 4 E2B, no shell anywhere),
 * on none of arm C's (Opus), and on none of the 17 shipped templates.
 *
 * A **warning**: the graph renders, and the page reads as nobody's design. The render-side twin is render_report's
 * `text-at-viewport-edge`, which measures the words at the window's edge on the page itself.
 *
 * @module noodl-editor/validation/rules/bandWithoutShell
 */

import type { CatalogIndex } from '../CatalogIndex';
import { DiagnosticCode, type Diagnostic } from '../diagnostics';
import { widthIsPercentage } from '../layoutInertCombination';
import { isComponentRef, type NormNode } from '../model';
import { resolveAgainstDefaults } from '../portConditions';
import type { Rule, RuleContext } from './types';

const GROUP = 'Group';

const resolved = (node: NormNode, catalog: CatalogIndex) =>
  resolveAgainstDefaults(node.parameters ?? {}, catalog.inputDefaults(node.type));

const named = (nodes: NormNode[]) =>
  nodes
    .slice(0, 4)
    .map((n) => (n.label ? `"${n.label}"` : n.type))
    .join(', ') + (nodes.length > 4 ? ', …' : '');

const isSet = (value: unknown) => value !== undefined && value !== null && value !== '' && value !== 0;

/** 100 %, however it was written (`{value:100,unit:'%'}`, `100`, `'100%'`). */
function isFullWidth(value: unknown): boolean {
  if (widthIsPercentage(value) !== true) return false;
  const n = typeof value === 'object' && value !== null ? (value as { value?: unknown }).value : parseFloat(String(value));
  return Number(n) >= 100;
}

/** Spans the window: full width, no measure, no gutter of its own. */
function spans(params: Record<string, unknown>): boolean {
  return isFullWidth(params['width']) && !isSet(params['maxWidth']) && !isSet(params['paddingLeft']) && !isSet(params['paddingRight']);
}

/**
 * A card, not a band: rounded, or bordered all the way round (a band's hairlines are top and bottom only). OWN-027 arm
 * C's PuppyCard root is full width, painted --surface and rounded; it is placed inside a grid by someone else.
 */
const isCard = (params: Record<string, unknown>) => isSet(params['borderRadius']) || painted(params['borderStyle']);

const SECTION_ELEMENTS = new Set(['section', 'header', 'footer']);
const painted = (value: unknown) => isSet(value) && value !== 'transparent' && value !== 'none';

/**
 * A band: a spanning column that says it is a section — padded top or bottom, a ground of its own, or rendered as a
 * `<section>`/`<header>`/`<footer>`. OWN-027's r2 FAQ was the last kind only (`as: "section"`, no padding, no ground).
 */
function isBand(node: NormNode, catalog: CatalogIndex): boolean {
  if (node.type !== GROUP) return false;
  const params = resolved(node, catalog);
  if (!spans(params)) return false;
  if ((params['flexDirection'] ?? 'column') !== 'column') return false;
  // Every band look centres the shell it holds; a column that does not is an app screen or a list row.
  if (params['alignItems'] !== 'center') return false;
  if (params['position'] === 'absolute' || params['position'] === 'fixed') return false;
  if (isCard(params)) return false;
  return (
    isSet(params['paddingTop']) ||
    isSet(params['paddingBottom']) ||
    painted(params['backgroundColor']) ||
    painted(params['backgroundGradient']) ||
    painted(params['backgroundImage']) ||
    SECTION_ELEMENTS.has(String(params['as'] ?? ''))
  );
}

export const bandWithoutShell: Rule = {
  code: DiagnosticCode.BandWithoutShell,
  description: 'A full-width band holds its content directly instead of inside one shell, so the content runs to the window edge.',
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { component, nodeById } of ctx.components) {
      const inFlowChildren = (parent: NormNode): NormNode[] =>
        (parent.children ?? [])
          .map((id) => nodeById.get(id))
          .filter((n): n is NormNode => {
            if (!n) return false;
            if (isComponentRef(n.type)) return true;
            if (!ctx.catalog.getNode(n.type)?.isVisual) return false;
            const p = resolved(n, ctx.catalog);
            return p['position'] !== 'absolute' && p['position'] !== 'fixed';
          });
      /**
       * Content that cannot reach the window edge: a shell (a Group with a maxWidth), a Group with side padding (its own
       * gutter), a component instance (what it draws is another component's root, and a rule that guessed would teach
       * an agent to distrust it), or a plain wrapper whose own contents are all guarded. gram's and marketplace's
       * screens hold a bar and a nav (instances) beside one shell.
       */
      const guarded = (n: NormNode, depth = 0): boolean => {
        if (isComponentRef(n.type)) return true;
        if (n.type !== GROUP) return false;
        const p = resolved(n, ctx.catalog);
        if (isSet(p['maxWidth']) || isSet(p['paddingLeft']) || isSet(p['paddingRight'])) return true;
        const kids = inFlowChildren(n);
        return depth < 4 && kids.length > 0 && kids.every((k) => guarded(k, depth + 1));
      };
      for (const band of component.nodes) {
        if (!isBand(band, ctx.catalog)) continue;

        // Where a section sits: every ancestor up to the Page (or the component root) spans the window too, and none is
        // a card (marketplace's "No photo yet" square is centred and painted, inside a product card).
        let placed = true;
        for (let up = band.parent ? nodeById.get(band.parent) : undefined; up; up = up.parent ? nodeById.get(up.parent) : undefined) {
          if (up.type === 'Page') break;
          const p = up.type === GROUP ? resolved(up, ctx.catalog) : undefined;
          if (!p || !spans(p) || isCard(p)) {
            placed = false;
            break;
          }
        }
        if (!placed) continue;

        const inside = inFlowChildren(band);
        if (inside.length === 0) continue;
        // A Group that holds bands is the page's own column (or a wrapper of sections), not a band.
        if (inside.some((n) => isBand(n, ctx.catalog))) continue;
        const bare = inside.filter((n) => !guarded(n));
        if (bare.length === 0) continue;

        const what =
          bare.length === inside.length && inside.length > 1
            ? `it holds ${inside.length} things directly (${named(inside)}) instead of one shell`
            : `${named(bare)} ${bare.length === 1 ? 'sits' : 'sit'} in it outside a shell`;
        out.push({
          code: DiagnosticCode.BandWithoutShell,
          severity: 'warning',
          message:
            `This is a full-width band (a section of the page), but ${what}, so its ` +
            'words and pictures run to the edge of the window on a desktop. Put everything it holds inside ONE Group ' +
            'with the style vocabulary\'s "shell" look (maxWidth 1200px, paddingLeft and paddingRight var(--space-6), ' +
            'sizeMode contentHeight), and make that Group the band\'s only child.',
          location: {
            component: component.name,
            nodeId: band.id,
            nodeType: band.type,
            ...(band.label ? { nodeLabel: band.label } : {})
          },
          suggestion: 'one child Group with the "shell" look'
        });
      }
    }
    return out;
  }
};
