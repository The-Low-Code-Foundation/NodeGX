/**
 * P99 HLT-005 — the node comment wraps inside the panel instead of widening it.
 *
 * ## What this file can and cannot grade, stated before the first assertion
 *
 * 🔴 **AC2 asks for the bar's RENDERED width against its scrollport, and jsdom has no layout
 * engine** — every box is 0×0 there, so a `getBoundingClientRect()` assertion in this runner would
 * pass identically on the fixed build and on the broken one. That reading is taken where boxes are
 * real: `scripts/devtools/drive-hlt005-comment.js`, on a driven editor, at the panel's minimum and
 * maximum docked widths, in both themes. Measured 2026-09-21 on a 264-character single-line
 * comment — bar **1,489px** inside a **224px** scrollport, **1,253px** of reachable `scrollLeft`;
 * and 1,489px inside 980px with 497px at the maximum. After the fix: 0 in all four cells.
 *
 * So this file grades the thing that *produces* that width, and it grades it as arithmetic over
 * the real declarations rather than by matching strings. {@link contentCanSizeTheItem} is the one
 * branch of the flex algorithm that decides the defect: may this item's used width be a function
 * of its own content? The declaration that shipped says yes; the one in the file now says no. A
 * mutant restoring `flex: 0 0 auto` — inline or in the stylesheet — turns the answer back and this
 * suite goes red, which is AC2's requirement.
 *
 * ⚠️ That is a model of the algorithm, not a measurement of a browser
 * ([[a-budget-measured-on-a-fixture-is-a-budget-on-the-fixture]]). It is calibrated by the first
 * `describe` below, which requires the shipped declaration to report the overflow the drive
 * photographed. A suite of "does not overflow" assertions with no firing control is
 * indistinguishable from an instrument that measured nothing
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 *
 * ## The anchors
 *
 * The fix only means anything while the bar is a flex ITEM of a ROW container. If `ScrollArea`
 * ever becomes a column, or the bar stops being the Comment tab's content, these assertions keep
 * passing while grading nothing. The last `describe` fails loudly in that case rather than
 * quietly — the shape `uni-001/session-readers.test.ts` earned in HLT-004.
 *
 * @see dev-docs/tasks/phase-99-the-ones-nobody-owned/HLT-005-THE-COMMENT-THAT-OVERFLOWS.md
 */

import * as fs from 'fs';
import * as path from 'path';

const EDITOR_SRC = path.resolve(__dirname, '..', '..', 'src', 'editor', 'src');
const CORE_UI = path.resolve(__dirname, '..', '..', '..', 'noodl-core-ui', 'src');

const PANEL_CSS = path.join(EDITOR_SRC, 'styles', 'propertyeditor', 'propertyeditor.css');
const ROW_COMPONENT = path.join(
  EDITOR_SRC,
  'views',
  'panels',
  'propertyeditor',
  'components',
  'NodeComment',
  'NodeComment.tsx'
);
const PANEL_INDEX = path.join(EDITOR_SRC, 'views', 'panels', 'propertyeditor', 'index.tsx');
const SCROLL_AREA_SCSS = path.join(CORE_UI, 'components', 'layout', 'ScrollArea', 'ScrollArea.module.scss');

/** The vertical cap the fix must not disturb — 10 lines × 17 + 12 padding + 2 border. */
const SIZER_MAX_HEIGHT = '184px';

interface FlexItem {
  /** `flex-grow`. */
  grow: number;
  /** `flex-shrink`. */
  shrink: number;
  /** `flex-basis`, as authored: `auto`, `content`, or a length. */
  basis: string;
  /** The used `min-width`, as authored. `auto` is the initial value for a flex item. */
  minWidth: string;
}

/**
 * May this flex item's used width be decided by its own content, rather than by the container?
 *
 * Two independent routes make it so, and the defect used the first:
 *
 *   1. **`flex-basis` resolves to the content size and the item may not shrink.** `flex: 0 0 auto`
 *      is grow 0 / shrink 0 / basis auto: the base size is the item's max-content width — here the
 *      full unwrapped longest line of the `pre-wrap` mirror — and shrink 0 forbids it coming back.
 *   2. **The automatic minimum size.** Even with `flex-basis: 0`, a flex item's used `min-width`
 *      is `auto`, i.e. its min-content width, unless something says otherwise. For this bar that
 *      is its longest WORD, because `overflow-wrap: break-word` does not reduce intrinsic size.
 *
 * Both have to be closed, which is why the rule carries two declarations and not one.
 */
export function contentCanSizeTheItem(item: FlexItem): boolean {
  const basisIsContent = item.basis === 'auto' || item.basis === 'content' || item.basis === 'max-content';
  const cannotShrink = item.shrink === 0;
  if (basisIsContent && cannotShrink) return true;
  return item.minWidth === 'auto';
}

/** The `flex` shorthand, expanded the way CSS expands it. */
export function expandFlexShorthand(value: string): { grow: number; shrink: number; basis: string } {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    // A single number is a grow factor; basis goes to 0 — `flex: 1` is `1 1 0%`.
    if (/^[\d.]+$/.test(parts[0])) return { grow: Number(parts[0]), shrink: 1, basis: '0%' };
    if (parts[0] === 'none') return { grow: 0, shrink: 0, basis: 'auto' };
    if (parts[0] === 'auto') return { grow: 1, shrink: 1, basis: 'auto' };
    if (parts[0] === 'initial') return { grow: 0, shrink: 1, basis: 'auto' };
    return { grow: 0, shrink: 1, basis: parts[0] };
  }
  if (parts.length === 2) {
    return /^[\d.]+$/.test(parts[1])
      ? { grow: Number(parts[0]), shrink: Number(parts[1]), basis: '0%' }
      : { grow: Number(parts[0]), shrink: 1, basis: parts[1] };
  }
  return { grow: Number(parts[0]), shrink: Number(parts[1]), basis: parts[2] };
}

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

/** The declarations of one rule, by selector, with comments stripped so a commented-out
 *  declaration is never read as a live one. */
function declarationsOf(css: string, selector: string): Record<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = withoutComments.match(new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  if (!match) throw new Error(`no rule for ${selector} — this spec is reading the wrong file`);
  const out: Record<string, string> = {};
  for (const decl of match[2].split(';')) {
    const at = decl.indexOf(':');
    if (at < 0) continue;
    out[decl.slice(0, at).trim()] = decl.slice(at + 1).trim();
  }
  return out;
}

function commentBarItem(): FlexItem {
  const decls = declarationsOf(read(PANEL_CSS), '.property-comment-bar');
  const { grow, shrink, basis } = expandFlexShorthand(decls['flex'] ?? '0 1 auto');
  return { grow, shrink, basis, minWidth: decls['min-width'] ?? 'auto' };
}

describe('HLT-005 — the model is calibrated against the declaration that shipped', () => {
  it('reports the shipped `flex: 0 0 auto` as content-sized — the overflow the drive photographed', () => {
    const shipped = expandFlexShorthand('0 0 auto');
    expect(shipped).toEqual({ grow: 0, shrink: 0, basis: 'auto' });
    expect(contentCanSizeTheItem({ ...shipped, minWidth: '0' })).toBe(true);
  });

  it('reports `min-width: auto` as content-sized even when the basis is 0', () => {
    // The second route, and the reason the fix is two declarations. A `flex: 1` that relied on a
    // container in another package for its minimum would pass the first assertion and still let a
    // long unbroken word widen the panel — measured at 1,069px of overflow before the fix.
    expect(contentCanSizeTheItem({ grow: 1, shrink: 1, basis: '0%', minWidth: 'auto' })).toBe(true);
  });

  it('expands the shorthands the panel actually uses', () => {
    expect(expandFlexShorthand('1')).toEqual({ grow: 1, shrink: 1, basis: '0%' });
    expect(expandFlexShorthand('1 1 auto')).toEqual({ grow: 1, shrink: 1, basis: 'auto' });
    expect(expandFlexShorthand('none')).toEqual({ grow: 0, shrink: 0, basis: 'auto' });
  });
});

describe('HLT-005 — AC2: the comment bar may not be sized by its own content', () => {
  it('the rule in propertyeditor.css closes both routes', () => {
    expect(contentCanSizeTheItem(commentBarItem())).toBe(false);
  });

  it('states `min-width: 0` itself rather than inheriting it from another package', () => {
    const decls = declarationsOf(read(PANEL_CSS), '.property-comment-bar');
    expect(decls['min-width']).toBe('0');
  });

  it('carries no inline flex on the element — the mutant AC2 names', () => {
    // 🔴 An inline style wins the cascade, so `flex: '0 0 auto'` on the element would reinstate the
    // defect with every assertion above still green. That inline declaration is also the reason
    // this was unfixable from the stylesheet for six of P92 CHR-009's "Left" lists.
    const source = read(ROW_COMPONENT);
    const barLine = source.split('\n').find((l) => l.includes('className="property-comment-bar"'));
    expect(barLine).toBeDefined();
    expect(barLine).not.toMatch(/style=/);
    expect(source).not.toMatch(/flex:\s*'0 0 auto'/);
  });

  it('matches the control in the same panel — the Properties tab, which never overflowed', () => {
    expect(read(PANEL_INDEX)).toContain('UNSAFE_style={{ flex: 1 }}');
  });
});

describe('HLT-005 — AC3: the vertical behaviour the fix must not trade away', () => {
  it('the mirror still carries the 184px cap', () => {
    expect(declarationsOf(read(PANEL_CSS), '.property-comment-sizer')['max-height']).toBe(SIZER_MAX_HEIGHT);
  });

  it('the mirror is still what sizes the field, with no width of its own', () => {
    // The fix deliberately does NOT touch the mirror. Capping its width here would have been the
    // landmine in §5: it still *measures* as the unwrapped line, and constraining it is what
    // breaks the height the whole component is built on.
    const shared = declarationsOf(read(PANEL_CSS), '.property-comment-sizer,\n.property-comment-input');
    expect(shared['white-space']).toBe('pre-wrap');
    expect(shared['overflow-wrap']).toBe('break-word');
    expect(shared['width']).toBeUndefined();
    expect(shared['max-width']).toBeUndefined();
  });
});

describe('HLT-005 — the anchors this suite is calibrated to', () => {
  it('the bar is still the sole child of a ScrollArea whose Container is a ROW', () => {
    const scss = read(SCROLL_AREA_SCSS);
    const container = declarationsOf(scss, '.Container');
    if (container['display'] !== 'flex' || container['flex-direction']) {
      throw new Error(
        'ScrollArea .Container is no longer a row flex container — the overflow this suite grades ' +
          'cannot happen any more, so every assertion above is now vacuous. This spec is blind: ' +
          're-derive it or delete it, do not leave it green.'
      );
    }
    expect(container['display']).toBe('flex');
  });

  it('the Comment tab still renders the row inside a ScrollArea', () => {
    const index = read(PANEL_INDEX);
    if (!/<ScrollArea>\{Boolean\(props\.model\) && <NodeComment/.test(index)) {
      throw new Error(
        'the Comment tab no longer wraps NodeComment in a ScrollArea — the containing block this ' +
          'suite reasons about has moved. This spec is blind; fix it.'
      );
    }
    expect(index).toContain('<NodeComment');
  });
});
