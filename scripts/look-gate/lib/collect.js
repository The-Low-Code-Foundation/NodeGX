/**
 * CHR-004 — the DOM half of the look gate: turn a live surface into the records `audit.js` grades.
 *
 * This is the part that has to run where the pixels are. It is written as a factory over the four
 * DOM services it needs rather than reaching for globals, for two reasons:
 *
 *  1. the walk is the half most likely to be quietly wrong — a ground chain that stops one
 *     ancestor early, a reachability test that passes on the copy `BaseDialog` renders first, an
 *     "own text" rule that counts a wrapper's whitespace — and a factory can be handed a fake DOM
 *     and graded in a plain-Node runner;
 *  2. the same code is then serialised into a `Runtime.evaluate` body by `collect-eval.js` and run
 *     against Chromium, which is where the numbers that decide anything come from.
 *
 * 🔴 The fake DOM grades the WALK, not the browser. Chromium is the only authority on what a
 * computed style is; nine slices of CHR-009 passed their numbers while the PNG showed the defect.
 */

/** Elements whose edge NAT-001 rules on: the things a person is meant to be able to click into. */
const CONTROL_SELECTOR = 'button, input, select, textarea, [role="button"], [role="tab"], [role="checkbox"], [role="switch"]';

/**
 * @param {object} dom
 * @param {Document} dom.document
 * @param {(el: Element) => CSSStyleDeclaration} dom.getComputedStyle
 * @param {(text: string, font: string) => number} dom.measureText  Advance width, in px.
 * @param {(x: number, y: number) => Element | null} dom.elementFromPoint
 */
function createCollector(dom) {
  const { document, getComputedStyle, measureText, elementFromPoint } = dom;

  /**
   * A name a person can act on. `div.PropertyRow` says nothing on a panel with sixty of them, so
   * the element's own text comes with it when it has any.
   *
   * CSS-module class names arrive as `PropertyRow-module__label--a3f9k`; the hash is stripped
   * because it changes on every build and a finding that named it would never match twice.
   */
  function nameOf(el) {
    // 🔴 `className` on an SVG element is an `SVGAnimatedString`, not a string, and stringifying it
    // gives `[object SVGAnimatedString]` — which the first drive duly printed as the name of three
    // findings. `getAttribute` is the one spelling that answers for both.
    const raw = typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '';
    const classes = String(raw)
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name.replace(/-module__/, '.').replace(/--[A-Za-z0-9_-]{5,}$/, ''))
      .slice(0, 2)
      .join('.');
    const tag = el.tagName.toLowerCase();
    const text = ownText(el);
    const head = classes ? `${tag}.${classes}` : tag;
    return text ? `${head} "${text.length > 40 ? `${text.slice(0, 39)}…` : text}"` : head;
  }

  /**
   * The element's OWN text — direct text children only.
   *
   * A wrapper that contains a label contains its text too, and grading the wrapper's `color`
   * against the wrapper's ground would score a colour nothing is painted in.
   */
  function ownText(el) {
    let text = '';
    for (const node of el.childNodes || []) if (node.nodeType === 3) text += node.textContent;
    return text.trim();
  }

  /** Ancestor `background-color`s, nearest first, ending at the root. */
  function groundsOf(el) {
    const stack = [];
    let parent = el.parentElement;
    while (parent) {
      stack.push(getComputedStyle(parent).backgroundColor);
      parent = parent.parentElement;
    }
    return stack;
  }

  /**
   * Is this element painted on something this gate CANNOT read?
   *
   * 🔴 The ground chain is `background-color` only, and a gradient or an image is not one. The
   * launcher's project placeholder is white text on 16% white over a `linear-gradient`, and the
   * gate composited the white over the CARD behind the gradient and reported 1.08:1 — a finding
   * about a colour nothing is painted on. A false finding costs a session the same as a real one,
   * and costs more the second time somebody "fixes" it.
   *
   * Reported, never assumed good: the audit skips these into a named bucket, so the population
   * says how many readings it could not take and why ("could not measure" is a real answer).
   *
   * Only layers at or above the first OPAQUE colour matter — an image behind an opaque fill is
   * invisible, so it must not disqualify a reading that is perfectly measurable.
   */
  function groundIsUnreadable(el, style) {
    let node = el;
    let nodeStyle = style;
    while (node) {
      if (nodeStyle.backgroundImage && nodeStyle.backgroundImage !== 'none') return true;
      const colour = nodeStyle.backgroundColor || '';
      // `rgb(...)` with no alpha component, or an explicit alpha of exactly 1, is opaque.
      const alpha = /rgba?\(([^)]*)\)/.exec(colour);
      if (alpha) {
        const parts = alpha[1].split(',');
        if (parts.length < 4 || parseFloat(parts[3]) === 1) return false;
      }
      node = node.parentElement;
      if (node) nodeStyle = getComputedStyle(node);
    }
    return false;
  }

  /**
   * Can a person see and hit this element?
   *
   * 🔴 Three separate faults this rule exists for: `BaseDialog` renders every dialog twice and the
   * measuring copy computes the same colours as the real one; a rendered surface can sit behind a
   * blocker (`.popup-layer-blocker` covers the whole panel while a popout is open); and an
   * `opacity: 0` element still has a box, still animates and still computes a font size.
   *
   * `elementFromPoint` at the centre must land on this element, inside it, or on an ancestor of it
   * — an ancestor means the point is over this element's box and nothing else claimed it, which is
   * what happens for a zero-size inline wrapper around a glyph.
   */
  function reachable(el, style, rect) {
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    if (parseFloat(style.opacity) === 0) return false;

    const hit = elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!hit) return false;
    return hit === el || el.contains(hit) || hit.contains(el);
  }

  /**
   * Is this a piece of text whose overflow would be SILENT?
   *
   * Only single-line, non-wrapping text can be cut without a person seeing the rest of it, and
   * only that case is worth a fit reading — measuring a paragraph's advance width against its box
   * would report every wrapped line as a cut.
   */
  function clipsSilently(style) {
    return style.whiteSpace === 'nowrap' && (style.textOverflow === 'ellipsis' || style.overflow === 'hidden' || style.overflowX === 'hidden');
  }

  /** The width the text actually has, inside the padding. */
  function contentWidth(el, style) {
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const border = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
    return Math.max(0, el.clientWidth - padding - border);
  }

  /**
   * Collect one surface.
   *
   * @param {string} rootSelector
   * @param {{ includeUnreachable?: boolean }} [options] Keep unreachable elements as records
   *   marked `reachable: false` (the audit skips them and counts them) rather than dropping them,
   *   so the population states how much of the surface was refused and why.
   */
  function collect(rootSelector, options) {
    const opts = options || {};
    // The LARGEST drawn match, not the first one.
    //
    // This editor never unmounts a panel it has shown: `.sidebar-property-editor` matches a hidden
    // 0x16 shell left behind by a previous selection before it matches the panel a person is
    // looking at, and `document.querySelector` returns that shell. Grading it yields a handful of
    // records and NO findings — a silent zero that reads exactly like a clean surface. (P92 s33: a
    // census written the obvious way read `0 drawn` on a panel full of glyphs.) `offsetParent` is
    // no help here — it is null for everything under the app's transformed ancestors — so the
    // rect decides.
    const matches = Array.prototype.slice.call(document.querySelectorAll(rootSelector));
    if (!matches.length) throw new Error(`Look gate: no element matches ${rootSelector}`);
    let root = null;
    let rootArea = 0;
    for (const candidate of matches) {
      const box = candidate.getBoundingClientRect();
      const area = box.width * box.height;
      if (area > rootArea) {
        root = candidate;
        rootArea = area;
      }
    }
    // No match drew anything, so `root` is still null: the surface is not on screen. That is
    // "could not measure" (exit 2), never "nothing wrong with it".
    if (!root) {
      throw new Error(
        `Look gate: ${matches.length} element(s) match ${rootSelector} and every one of them has a ` +
          `zero-sized box — the surface is not on screen, so there is nothing to grade.`
      );
    }

    const records = [];
    for (const el of [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')))) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isReachable = reachable(el, style, rect);
      if (!isReachable && !opts.includeUnreachable) {
        records.push({ id: nameOf(el), reachable: false });
        continue;
      }

      const text = ownText(el);
      /** @type {Record<string, unknown>} */
      const item = {
        id: nameOf(el),
        reachable: isReachable,
        role: el.matches(CONTROL_SELECTOR) ? 'control' : 'text',
        fill: style.backgroundColor,
        grounds: groundsOf(el),
        groundUnreadable: groundIsUnreadable(el, style),
        radius: style.borderTopLeftRadius,
        edgeColor: style.borderTopColor,
        edgeWidth: parseFloat(style.borderTopWidth) || 0,
        edgeStyle: style.borderTopStyle
      };

      // 🔴 A font size on an element that paints no text is a number about nothing. The first
      // drive reported `svg`, `circle` and `path` at Chromium's unstyled-button 13.333px — three
      // findings about a glyph with no glyph in it. CHR-001 learned the same thing counting the
      // launcher's sizes: the honest population is the TEXT-BEARING elements, and a ratchet must
      // name which count it reports.
      // ⚠️ Text drawn by a `::before` / `::after` (a FontAwesome glyph) is outside this population.
      // CHR-010 retires the last of those; until then the gate does not see them.
      if (text) {
        item.ownText = text;
        item.textColor = style.color;
        item.fontSize = style.fontSize;
        if (clipsSilently(style)) {
          item.textWidth = measureText(text, style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`);
          item.boxWidth = contentWidth(el, style);
        }
      }

      records.push(item);
    }

    return records;
  }

  return { collect, nameOf, ownText, groundsOf, reachable, clipsSilently, contentWidth, CONTROL_SELECTOR };
}

module.exports = { createCollector, CONTROL_SELECTOR };
