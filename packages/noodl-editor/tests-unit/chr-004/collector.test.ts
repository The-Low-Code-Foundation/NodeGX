/**
 * CHR-004 — the look gate's DOM walk, graded against a fake DOM.
 *
 * 🔴 This grades the WALK, not the browser. Chromium decides what a computed style is, and the
 * only honest reading of a fill or a font size comes from driving it. What a fake DOM can settle —
 * and what a drive is bad at settling, because staging it takes a whole session — is whether the
 * walk asks the right questions: does the ground chain reach the ancestor that actually paints,
 * does "own text" mean this element's text, does a blocker over a visible row make it unreachable.
 *
 * Every one of those has already been got wrong in this phase with numbers that looked fine.
 */
import * as path from 'path';

const { createCollector } = require(path.join(__dirname, '../../../../scripts/look-gate/lib/collect.js'));

type FakeStyle = Record<string, string>;

/** The smallest DOM that can answer the collector's questions. */
class FakeElement {
  tagName: string;
  className: string;
  childNodes: Array<{ nodeType: number; textContent: string }> = [];
  children: FakeElement[] = [];
  parentElement: FakeElement | null = null;
  style: FakeStyle;
  rect: { left: number; top: number; width: number; height: number };
  clientWidth: number;
  private selectors: string[];

  constructor(
    tagName: string,
    options: {
      className?: string;
      text?: string;
      style?: FakeStyle;
      rect?: { left: number; top: number; width: number; height: number };
      clientWidth?: number;
      selectors?: string[];
    } = {}
  ) {
    this.tagName = tagName.toUpperCase();
    this.className = options.className || '';
    this.style = Object.assign(
      {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        color: 'rgb(200, 200, 200)',
        fontSize: '12px',
        fontWeight: '400',
        fontFamily: 'Inter',
        font: '400 12px Inter',
        borderTopLeftRadius: '4px',
        borderTopColor: 'rgb(0, 0, 0)',
        borderTopWidth: '0px',
        borderTopStyle: 'none',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        paddingLeft: '0px',
        paddingRight: '0px',
        visibility: 'visible',
        display: 'block',
        opacity: '1',
        whiteSpace: 'normal',
        textOverflow: 'clip',
        overflow: 'visible',
        overflowX: 'visible'
      },
      options.style
    );
    this.rect = options.rect || { left: 0, top: 0, width: 100, height: 20 };
    this.clientWidth = options.clientWidth === undefined ? this.rect.width : options.clientWidth;
    this.selectors = options.selectors || [tagName.toLowerCase()];
    if (options.text) this.childNodes.push({ nodeType: 3, textContent: options.text });
  }

  append(...children: FakeElement[]): this {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
      this.childNodes.push(child as never);
    }
    return this;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  matches(selector: string): boolean {
    return this.selectors.some((own) => selector.includes(own));
  }

  contains(other: FakeElement | null): boolean {
    if (!other) return false;
    for (let node: FakeElement | null = other; node; node = node.parentElement) if (node === this) return true;
    return false;
  }

  querySelectorAll(): FakeElement[] {
    const all: FakeElement[] = [];
    const walk = (el: FakeElement) => {
      for (const child of el.children) {
        all.push(child);
        walk(child);
      }
    };
    walk(this);
    return all;
  }
}

/**
 * @param hit what `elementFromPoint` returns — the blocker case is the whole point of passing it.
 */
function collectorFor(root: FakeElement, hit?: FakeElement | null | ((x: number, y: number) => FakeElement | null)) {
  return createCollector({
    document: { querySelector: (selector: string) => (selector === '#root' ? root : null) },
    getComputedStyle: (el: FakeElement) => el.style,
    measureText: (text: string) => text.length * 6.7,
    elementFromPoint: typeof hit === 'function' ? hit : (x: number, y: number) => (hit === undefined ? nearest(root, x, y) : hit)
  });
}

/** Default hit-testing: the deepest element whose box contains the point. */
function nearest(root: FakeElement, x: number, y: number): FakeElement | null {
  let found: FakeElement | null = null;
  for (const el of [root, ...root.querySelectorAll()]) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height) found = el;
  }
  return found;
}

describe('CHR-004 collector — naming', () => {
  it('strips a CSS-module hash, which changes on every build', () => {
    const el = new FakeElement('div', { className: 'PropertyRow-module__label--a3f9k' });
    expect(collectorFor(el).nameOf(el)).toBe('div.PropertyRow.label');
  });

  it('puts the element’s own text in the name, because a panel has sixty div.PropertyRows', () => {
    const el = new FakeElement('label', { className: 'property-label', text: 'Background Position' });
    expect(collectorFor(el).nameOf(el)).toBe('label.property-label "Background Position"');
  });

  it('truncates a long text rather than printing a paragraph into a failure', () => {
    const el = new FakeElement('p', { text: 'x'.repeat(80) });
    const name = collectorFor(el).nameOf(el);
    expect(name.length).toBeLessThan(50);
    expect(name).toContain('…');
  });
});

describe('CHR-004 collector — own text', () => {
  it('is the element’s own text nodes, not its descendants’', () => {
    const label = new FakeElement('span', { text: 'Width' });
    const row = new FakeElement('div').append(label);
    const collector = collectorFor(row);

    expect(collector.ownText(label)).toBe('Width');
    // 🔴 The row "contains" the text. Grading the row's `color` against the row's ground would
    // score a colour nothing on screen is painted in.
    expect(collector.ownText(row)).toBe('');
  });
});

describe('CHR-004 collector — the ground chain', () => {
  it('walks every ancestor, nearest first, so a transparent parent is not the answer', () => {
    const root = new FakeElement('div', { style: { backgroundColor: 'rgb(35, 33, 41)' } });
    const middle = new FakeElement('div', { style: { backgroundColor: 'rgba(0, 0, 0, 0)' } });
    const leaf = new FakeElement('span', { text: 'hi' });
    root.append(middle);
    middle.append(leaf);

    expect(collectorFor(root).groundsOf(leaf)).toEqual(['rgba(0, 0, 0, 0)', 'rgb(35, 33, 41)']);
  });
});

describe('CHR-004 collector — reachability', () => {
  const style = { backgroundColor: 'rgb(35, 33, 41)' };

  it('refuses a zero-size box, a hidden one and a fully transparent one', () => {
    const zero = new FakeElement('div', { style, rect: { left: 0, top: 0, width: 0, height: 0 } });
    const hidden = new FakeElement('div', { style: { ...style, visibility: 'hidden' } });
    const gone = new FakeElement('div', { style: { ...style, display: 'none' } });
    const invisible = new FakeElement('div', { style: { ...style, opacity: '0' } });

    for (const el of [zero, hidden, gone, invisible]) {
      expect(collectorFor(el, el).reachable(el, el.style, el.getBoundingClientRect())).toBe(false);
    }
  });

  it('refuses an element a blocker covers — a rendered surface is not a reachable one', () => {
    // `.popup-layer-blocker` covers the whole property panel while a popout is open, and every
    // row under it computes exactly the colours it had a moment before.
    const row = new FakeElement('div', { style });
    const blocker = new FakeElement('div', { className: 'popup-layer-blocker' });
    expect(collectorFor(row, blocker).reachable(row, row.style, row.getBoundingClientRect())).toBe(false);
  });

  it('accepts a hit on itself, on a child of it, and on an ancestor of it', () => {
    const parent = new FakeElement('div', { style });
    const el = new FakeElement('div', { style });
    const child = new FakeElement('span', { text: 'x' });
    parent.append(el);
    el.append(child);

    for (const hit of [el, child, parent]) {
      expect(collectorFor(parent, hit).reachable(el, el.style, el.getBoundingClientRect())).toBe(true);
    }
  });
});

describe('CHR-004 collector — which text can be cut silently', () => {
  it('measures only single-line text that clips, not a wrapping paragraph', () => {
    const collector = collectorFor(new FakeElement('div'));

    expect(collector.clipsSilently({ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'visible' })).toBe(true);
    expect(collector.clipsSilently({ whiteSpace: 'nowrap', textOverflow: 'clip', overflow: 'hidden' })).toBe(true);
    // A paragraph that wraps shows every word; its advance width says nothing about a cut.
    expect(collector.clipsSilently({ whiteSpace: 'normal', textOverflow: 'ellipsis', overflow: 'hidden' })).toBe(false);
    expect(collector.clipsSilently({ whiteSpace: 'nowrap', textOverflow: 'clip', overflow: 'visible', overflowX: 'visible' })).toBe(false);
  });

  it('takes the padding and border off the box the text has to fit in', () => {
    const el = new FakeElement('label', {
      clientWidth: 130,
      style: { paddingLeft: '6px', paddingRight: '6px', borderLeftWidth: '1px', borderRightWidth: '1px' }
    });
    expect(collectorFor(el).contentWidth(el, el.style)).toBe(116);
  });
});

describe('CHR-004 collector — a whole surface', () => {
  function surface() {
    const root = new FakeElement('div', {
      className: 'sidebar-property-editor',
      style: { backgroundColor: 'rgb(35, 33, 41)' },
      rect: { left: 0, top: 0, width: 312, height: 400 }
    });
    const label = new FakeElement('label', {
      className: 'property-label',
      text: 'Background Position',
      style: { whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'rgb(196, 206, 219)' },
      rect: { left: 0, top: 0, width: 116, height: 20 },
      clientWidth: 116
    });
    const field = new FakeElement('input', {
      className: 'PropertyPanelInput',
      style: { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'rgb(45, 43, 53)' },
      rect: { left: 120, top: 0, width: 180, height: 26 },
      selectors: ['input']
    });
    const offscreen = new FakeElement('div', {
      className: 'collapsed-section',
      text: 'hidden',
      rect: { left: 0, top: 0, width: 0, height: 0 }
    });
    root.append(label, field, offscreen);
    return { root, label, field, offscreen };
  }

  it('records a control as a control, and a label with its fit reading', () => {
    const { root } = surface();
    const records = collectorFor(root).collect('#root');

    const label = records.find((r: { id: string }) => r.id.startsWith('label.'));
    expect(label.role).toBe('text');
    expect(label.ownText).toBe('Background Position');
    expect(label.textWidth).toBeCloseTo(19 * 6.7, 5);
    expect(label.boxWidth).toBe(116);
    expect(label.grounds).toEqual(['rgb(35, 33, 41)']);

    const field = records.find((r: { id: string }) => r.id.startsWith('input'));
    expect(field.role).toBe('control');
    expect(field.edgeWidth).toBe(1);
    expect(field.edgeStyle).toBe('solid');
    // No own text ⇒ nothing to measure, and no invented fit reading.
    expect(field.textWidth).toBeUndefined();
  });

  it('reads a font size only where text is painted', () => {
    // 🔴 The first live drive reported `svg`, `circle` and `path` at Chromium's unstyled-button
    // 13.333px — three findings about a glyph with no glyph in it. A font size on an element that
    // paints no text is a number about nothing, and it inflates the population it is counted in.
    const { root, label, field } = surface();
    const records = collectorFor(root).collect('#root');
    const byName = (needle: string) => records.find((r: { id: string }) => r.id.startsWith(needle));

    expect(byName('label.').fontSize).toBe(label.style.fontSize);
    expect(byName('input').fontSize).toBeUndefined();
    expect(field.style.fontSize).toBe('12px'); // …the element HAS one; the collector declines to grade it.
  });

  it('KEEPS an unreachable element as a refusal rather than dropping it from the population', () => {
    // 🔴 An element quietly dropped is an element the population never mentions, which is how a
    // census of 12 labels reported a property of 71.
    const { root } = surface();
    const records = collectorFor(root).collect('#root');

    const refused = records.filter((r: { reachable: boolean }) => r.reachable === false);
    expect(refused).toHaveLength(1);
    expect(refused[0].id).toContain('collapsed-section');
    expect(refused[0].fontSize).toBeUndefined();
    expect(records).toHaveLength(4);
  });

  it('throws rather than grading nothing when the surface is not on screen', () => {
    const { root } = surface();
    expect(() => collectorFor(root).collect('.not-here')).toThrow(/no element matches/);
  });
});
