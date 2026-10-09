import type { StyleObject } from './react-component-node';

/** How a node's parent lays its children out. `'none'` means absolute positioning. */
export type ParentLayout = 'none' | 'row' | 'column' | (string & {});

/** The props `size`/`align` read. These arrive from the node's React props. */
export interface LayoutProps {
  parentLayout?: ParentLayout;
  sizeMode?: 'explicit' | 'contentHeight' | 'contentWidth' | (string & {});
  width?: string | number;
  height?: string | number;
  /**
   * Set when the parent scrolls along the axis it stacks its children on (react-component-node.ts sets it beside
   * `parentLayout`): `'native'` when the parent is the browser's scroll box, `'iscroll'` when Native platform scroll is off
   * and the children sit in the scroller's inner box, which the visible window's size reaches as `--ndl-scroll-width` /
   * `--ndl-scroll-height` (Group.tsx). Undefined otherwise.
   */
  parentScroll?: 'native' | 'iscroll';
  /** Set when the width is pinned, which suppresses percentage → flex-grow. */
  fixedWidth?: boolean;
  fixedHeight?: boolean;
  alignX?: 'left' | 'center' | 'right';
  alignY?: 'top' | 'center' | 'bottom';
  [prop: string]: any;
}

/**
 * How a node scrolls along the axis it stacks its children on, as its children's `parentScroll`: `'native'` (the browser's
 * scroll box), `'iscroll'` (Native platform scroll off — Group.tsx `renderIScroll`), or undefined when it does not scroll, has
 * no stacking axis, or wraps (a wrapping Group's children are not laid out along the scrolled axis alone, so they keep the
 * plain rule). Native platform scroll is read as truthy, as Group.tsx reads it (P107-C89).
 */
export function scrollAlongLayout(nodeProps: object, style?: { flexWrap?: unknown }): 'native' | 'iscroll' | undefined {
  const props = nodeProps as { scrollEnabled?: unknown; nativeScroll?: unknown; layout?: unknown };
  if (!props.scrollEnabled) return undefined;
  if (props.layout !== 'row' && props.layout !== 'column') return undefined;
  const wrap = style?.flexWrap;
  if (wrap === 'wrap' || wrap === 'wrap-reverse') return undefined;
  return props.nativeScroll ? 'native' : 'iscroll';
}

function isPercentage(size: unknown): boolean {
  return Boolean(size) && typeof size === 'string' && size[size.length - 1] === '%';
}

function getPercentage(size: string): number {
  return Number(size.slice(0, -1));
}

function getSizeWithMargins(size: string, startMargin?: string, endMargin?: string): string {
  if (!startMargin && !endMargin) {
    return size;
  }

  let css = `calc(${size}`;
  if (startMargin) {
    css += ` - ${startMargin}`;
  }
  if (endMargin) {
    css += ` - ${endMargin}`;
  }
  css += ')';

  return css;
}

/**
 * A percentage along the axis a scrolling parent scrolls (ruled 2026-10-09, P109 ISL-052: inside a scrolling Group the room
 * is the visible window, unless the content is longer, and then the content wins).
 *
 * - The percentage is of the visible window. On the native path the parent IS the scroll box, so `%` already means that. With
 *   Native platform scroll off the child sits in an inner box that hugs the children, so `%` there was a percentage of the
 *   children added up (P109-S37-ISCROLLPERCENT): it becomes the same fraction of the window's size, which Group.tsx measures.
 *   Before the first measurement the variable is unset, the `calc` is invalid and the size is the content's, for one frame.
 * - A share (not Fixed) still fills what the window leaves, but never ends up shorter than its content: the browser's
 *   automatic minimum is the smaller of the stated size and the content, so a 100% share holding more than the window
 *   stopped at the window's size and its content ran under the next sibling (P109-S37-FILLCAP). A min the author set wins.
 *
 * The caller's grow/shrink conversion runs after this on the rewritten value, and `isPercentage` reads `calc(...)` as not a
 * percentage, so on the iScroll path the share is set here.
 */
function scrollAxisPercent(style: StyleObject, props: LayoutProps, dim: 'width' | 'height', fixed?: boolean): void {
  if (!props.parentScroll) return;
  const percent = getPercentage(style[dim]);
  if (props.parentScroll === 'iscroll') {
    if (fixed) {
      style[dim] = `calc(var(--ndl-scroll-${dim}) * ${percent / 100})`;
    } else {
      // The inner box has no size of its own to shrink a share into: it grows to whatever its children start at, and a row
      // reads that from each child's stated width. So a share states no size, starts at nothing and grows into what the
      // window leaves (the box is never shorter than the window), in the proportions the native path's percentages give.
      delete style[dim];
      style.flexBasis = 0;
      style.flexGrow = percent;
      style.flexShrink = 1;
    }
  }
  const min = dim === 'width' ? 'minWidth' : 'minHeight';
  if (!fixed && style[min] === undefined) style[min] = 'min-content';
}

/**
 * Translates Noodl's size/alignment model onto CSS, mutating `style` in place.
 *
 * The central trick is that a percentage size means two different things depending
 * on axis: along the parent's flex direction it becomes `flexGrow` (so siblings
 * share the space proportionally), and across it, it stays a percentage but has the
 * node's own margins subtracted via `calc()` — otherwise margins would push a
 * 100%-wide node out of its parent.
 */
const Layout = {
  size(style: StyleObject, props: LayoutProps): void {
    if (props.parentLayout === 'none') {
      style.position = 'absolute';
    }

    if (props.sizeMode === 'explicit') {
      style.width = props.width;
      style.height = props.height;
    } else if (props.sizeMode === 'contentHeight') {
      style.width = props.width;
    } else if (props.sizeMode === 'contentWidth') {
      style.height = props.height;
    } else {
      // `contentSize` — both axes come from the content, so neither is assigned.
      //
      // Anything else landing here is a value the enum does not define, and it
      // is sized from content too. It used to be *unset* that landed here, which
      // silently left the node at whatever `defaultCss` had given it; the port
      // now restores its declared default when a connection abstains and reports
      // a value that is not a mode at all (`addDimensions`, NDA-016). Reporting
      // from here instead would repeat on every render of every visual node.
    }

    // Noodl nodes never shrink below their stated size unless they are sharing a
    // row or column with siblings — the percentage paths below opt back in to
    // shrinking when they convert a percentage to flex-grow. Without this, a
    // node given an explicit width would silently lose it to a crowded parent.
    style.flexShrink = 0;

    if (props.parentLayout === 'row' && style.position === 'relative') {
      if (isPercentage(style.width)) scrollAxisPercent(style, props, 'width', props.fixedWidth);
      if (isPercentage(style.width) && !props.fixedWidth) {
        style.flexGrow = getPercentage(style.width);
        style.flexShrink = 1;
      }

      if (isPercentage(style.height) && !props.fixedHeight) {
        style.height = getSizeWithMargins(style.height, style.marginTop, style.marginBottom);
      }
    } else if (props.parentLayout === 'column' && style.position === 'relative') {
      if (isPercentage(style.width) && !props.fixedWidth) {
        style.width = getSizeWithMargins(style.width, style.marginLeft, style.marginRight);
      }

      if (isPercentage(style.height)) scrollAxisPercent(style, props, 'height', props.fixedHeight);
      if (isPercentage(style.height) && !props.fixedHeight) {
        style.flexGrow = getPercentage(style.height);
        style.flexShrink = 1;
      }
    } else if (style.position !== 'relative') {
      if (isPercentage(style.width)) {
        style.width = getSizeWithMargins(style.width, style.marginLeft, style.marginRight);
      }
      if (isPercentage(style.height)) {
        style.height = getSizeWithMargins(style.height, style.marginTop, style.marginBottom);
      }
    }

    reportMainAxisGrow(style, props);
  },

  align(style: StyleObject, props: LayoutProps): void {
    const { position } = style;
    let { alignX, alignY } = props;

    //Elements with position absolute get's a default alignment.
    //This keeps backward compability, and makes sense for most use cases of
    //absolutely positioned elements
    if (position !== 'relative') {
      alignX = alignX || 'left';
      alignY = alignY || 'top';
    }

    let transform = '';

    const parentFlexDirection = props.parentLayout || 'column';
    if (alignX) {
      if (position !== 'relative') {
        if (alignX === 'left') {
          style.left = 0;
        } else if (alignX === 'center') {
          style.left = '50%';
          transform += 'translateX(-50%) ';
        } else {
          style.right = 0;
        }
      } else if (position === 'relative' && parentFlexDirection === 'row') {
        switch (alignX) {
          case 'left':
            style.marginRight = style.marginRight ? style.marginRight : 'auto';
            break;
          case 'center':
            style.marginRight = style.marginRight ? style.marginRight : 'auto';
            style.marginLeft = style.marginLeft ? style.marginLeft : 'auto';
            break;
          case 'right':
            style.marginLeft = style.marginLeft ? style.marginLeft : 'auto';
            break;
        }
      } else if (position === 'relative' && parentFlexDirection === 'column') {
        switch (alignX) {
          case 'left':
            style.alignSelf = 'flex-start';
            break;
          case 'center':
            style.alignSelf = 'center';
            break;
          case 'right':
            style.alignSelf = 'flex-end';
            break;
        }
      }
    }

    if (alignY) {
      if (position !== 'relative') {
        if (alignY === 'top') {
          style.top = 0;
        } else if (alignY === 'center') {
          style.top = '50%';
          transform += 'translateY(-50%)';
        } else {
          style.bottom = 0;
        }
      } else if (position === 'relative' && parentFlexDirection === 'column') {
        switch (alignY) {
          case 'top':
            style.marginBottom = style.marginBottom ? style.marginBottom : 'auto';
            break;
          case 'center':
            style.marginTop = style.marginTop ? style.marginTop : 'auto';
            style.marginBottom = style.marginBottom ? style.marginBottom : 'auto';
            break;
          case 'bottom':
            style.marginTop = style.marginTop ? style.marginTop : 'auto';
            break;
        }
      } else if (position === 'relative' && parentFlexDirection === 'row') {
        switch (alignY) {
          case 'top':
            style.alignSelf = 'flex-start';
            break;
          case 'center':
            style.alignSelf = 'center';
            break;
          case 'bottom':
            style.alignSelf = 'flex-end';
            break;
        }
      }
    }

    if (transform) {
      style.transform = transform + (style.transform || '');
    }
  }
};

export default Layout;

/**
 * FLD-004 (#26) — say out loud that a wired dimension became a flex ratio.
 *
 * The reported defect is the *third* state: the wire validates, the connection is live, the value
 * arrives, and the box does not move. A bare number on a dimension port is merged into the port's
 * current unit (`noodl-runtime/src/node.ts` `setInputValue`), that unit defaults to `%`, and
 * `Layout.size` turns a percentage on the parent's main axis into `flexGrow` — a ratio against the
 * siblings that also grow, not a length. `width` on the same node in the same graph works, because
 * a percentage on the cross axis stays a real CSS length. That is the reporter's whole three-way
 * result, and the author is told none of it.
 *
 * 🔴 **Read off the consequence, not re-derived from the mechanism.** `size` above is the only
 * writer of `style.flexGrow`, so its presence IS the conversion having happened — the alternative
 * is a second copy of the axis/position/sizeMode reasoning that can drift away from the first.
 *
 * 🔴 **And it lives HERE, called from `size` itself, because that is the only place all of it
 * converges.** It was first written beside the ONE `Layout.size` call in `react-component-node`'s
 * render — and there are **twenty-two**. A `Group` — the node #26 is actually about — sizes itself
 * in `Group.tsx`, so the report was correct and never reached. Every arm that graded the function
 * passed, because every arm called the function. Driving the fixture in the real editor is what
 * found it, and the specs now go through `size` so that "correct but unreached" reddens.
 *
 * A **diagnostic**, not a runtime error: it is a predicate that stays true until the author
 * changes something, and the only person who can act on it is the author, in the editor. That also
 * makes it self-clearing — rewire the port to a px object and the next render clears the key.
 *
 * Fires only on a CONNECTED port. Every visual node's `width` and `height` default to `100%`, and
 * on the main axis that default is precisely how a child fills its parent: a message keyed on the
 * conversion alone would fire on almost every node in every project.
 *
 * The `_lastMainAxisGrowDiagnostic` memo is not an optimisation of the message but of the
 * CHANNEL — this runs on every render of every framed node, and `setDiagnostic` serialises and
 * posts to the editor each time it is called.
 */
export interface MainAxisGrowHost {
  readonly diagnosticsEnabled: boolean;
  isInputConnected(name: string): boolean;
  setDiagnostic(key: string, message?: string | null): void;
  /** The memo below; declared so the read and the write are both checked. */
  _lastMainAxisGrowDiagnostic?: string | null;
}

export function reportMainAxisGrow(style: StyleObject, props: LayoutProps): void {
  const noodlNode = props.noodlNode as MainAxisGrowHost | undefined;
  if (!noodlNode || typeof noodlNode.setDiagnostic !== 'function') return;
  if (!noodlNode.diagnosticsEnabled) return;

  const axis = props.parentLayout;
  const port = axis === 'row' ? 'width' : axis === 'column' ? 'height' : undefined;
  const converted = port !== undefined && style.flexGrow !== undefined && noodlNode.isInputConnected(port);

  const message = converted
    ? `"${port}" is wired, and the parent stacks its children along that same axis, so the value arrived as a ` +
      `PERCENTAGE (dimension ports default to "%") and became flex-grow ${style.flexGrow} — a ratio against the ` +
      `siblings that also grow, not a ${port === 'width' ? 'width' : 'height'}. Send a {value, unit} object instead ` +
      'of a bare number, or give this port a px value in the property panel first: a bare number arriving over a ' +
      'wire is merged into the unit the port is already holding.'
    : null;

  // `?? null` is load-bearing: without it the FIRST render of every framed node in the project
  // posts a clear for a key it never raised, because the memo starts undefined.
  if ((noodlNode._lastMainAxisGrowDiagnostic ?? null) === message) return;
  noodlNode._lastMainAxisGrowDiagnostic = message;
  noodlNode.setDiagnostic('dimensions/wired-dimension-becomes-grow', message);
}
