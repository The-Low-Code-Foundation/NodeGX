/**
 * P88 session 23 (ruled by Richard) — a control the keyboard reaches draws a focus ring.
 *
 * **The defect** (the one P41 ACC-001 names, never built). `assets/style.css` sets `outline: none`
 * on the Button, both Checkbox and Radio Button treatments, the Select and both Ranges, and nothing
 * ever drew a replacement. Driven on Rocket School (`drive-rkt003-stage.js --keys`, `ringNext` /
 * `ringTab`): Next, focused by its Focus wire, and an answer reached by Tab both matched
 * `:focus-visible` and read `outline-style: none` — 7 red of 7 at HEAD, 0 after, 6 red with this
 * file's rule reverted.
 *
 * ⚠️ The ring is in the project's `--ring` token. The first fix used `outline: auto`; screenshotted,
 * the platform's thin two-tone ring sat on the template's dark border and hard shadow and could
 * hardly be seen. A reading of `outline-style` alone would have passed it.
 *
 * The control below grades the list: every class that deletes the outline is either ringed or named
 * here with the reason it needs no ring, so a new control class that copies `outline: none` reddens.
 */

/* eslint-env jest */

import * as fs from 'fs';
import * as path from 'path';

const STYLESHEET = path.join(__dirname, '..', '..', 'src', 'assets', 'style.css');
const css = fs.readFileSync(STYLESHEET, 'utf-8');

const RINGED = [
  'ndl-controls-button',
  'ndl-controls-checkbox',
  'ndl-controls-radiobutton',
  'ndl-controls-select',
  'ndl-controls-range2',
  'ndl-controls-range'
];

const NO_RING: Record<string, string> = {
  'ndl-controls-textinput': 'a text field shows the caret where the keyboard is',
  'ndl-controls-fieldset': 'a grouping wrapper, never focused'
};

/**
 * GAM-026. The list above grades the controls that are VISIBLE when focused. The three a person
 * places today are not: the current Checkbox and Radio Button put their real `<input>` at
 * `opacity: 0` and the Dropdown does the same inline, each overlaid on the wrapper that draws the
 * box. `:focus-visible` matches the input, so a ring on it satisfies every clause above and paints
 * nothing — which is how this shipped past the session that wrote those clauses.
 *
 * 🔴 So the totality check above cannot see this defect at all: these classes never say
 * `outline: none`, they say `opacity: 0`. This list is the second population — a control whose
 * own element is hidden must ring the wrapper a person can see.
 */
const HIDDEN_INPUT_RINGED = ['ndl-controls-checkbox-2', 'ndl-controls-radio-2'];

/** The Dropdown's `<select>` carries no class of its own (`Select.tsx` passes `props.className`). */
const HIDDEN_ELEMENT_RINGED = ['select'];

/** The wrapper every one of them is drawn on. */
const WRAPPER = 'ndl-controls-pointer';

/** Rule bodies, with their selector lists, comments removed. */
function rules(): { selectors: string[]; body: string }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // ⚠️ A `matchAll` spread fails to compile here (TS2802, this package's target) and the suite ran 0 tests.
  const out: { selectors: string[]; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ selectors: m[1].split(',').map((s) => s.trim()), body: m[2] });
  return out;
}

describe('a control the keyboard reaches draws a focus ring', () => {
  it('reads rules out of the stylesheet (the matcher grades itself first)', () => {
    const button = rules().find((r) => r.selectors.includes('.ndl-controls-button'));
    expect(button && /outline:\s*none/.test(button.body)).toBe(true);
  });

  it('every class that deletes the outline is ringed or named as needing none', () => {
    const deleting = rules()
      .filter((r) => /outline:\s*none/.test(r.body))
      .flatMap((r) => r.selectors)
      .map((s) => s.replace(/^\./, ''));
    expect(deleting.length).toBeGreaterThan(0);
    const unaccounted = deleting.filter((c) => !RINGED.includes(c) && !(c in NO_RING));
    expect(unaccounted).toEqual([]);
  });

  /**
   * The ring itself, wherever it is drawn. GAM-026 made the width a token, so a rule may state it
   * either as a plain length or as `var(--ring-width, <length>)` — and the fallback is what a
   * project that never set the token gets, so that is the number held to 2px.
   */
  function expectRing(body: string) {
    const outline = body.match(/outline:\s*([^;]+);/);
    expect(outline && outline[1].trim()).toMatch(/^(?:\d+px|var\(--ring-width, \d+px\)) solid var\(--ring, #[0-9a-f]{3,6}\)$/);
    const width = outline![1].trim().match(/(\d+)px/)![1];
    expect(Number(width)).toBeGreaterThanOrEqual(2);
    expect(body).toMatch(/outline-offset:\s*[1-9]\d*px/);
  }

  it.each(RINGED)('.%s:focus-visible draws a solid ring in the --ring token, offset from the control', (cls) => {
    const ring = rules().filter((r) => r.selectors.includes(`.${cls}:focus-visible`));
    expect(ring).toHaveLength(1);
    expectRing(ring[0].body);
  });

  /**
   * GAM-026, and the clause that would have caught it: a control whose focusable element is
   * invisible must ring the wrapper instead. Reading `.${cls}:focus-visible` here would pass on
   * the very arrangement that draws nothing.
   */
  it.each(HIDDEN_INPUT_RINGED)('.%s hides its input, so the ring is drawn on the wrapper', (cls) => {
    const hidden = rules().filter((r) => r.selectors.includes(`.${cls}`) && /opacity:\s*0\b/.test(r.body));
    expect(hidden).toHaveLength(1);
    const ring = rules().filter((r) => r.selectors.includes(`.${WRAPPER}:has(> .${cls}:focus-visible)`));
    expect(ring).toHaveLength(1);
    expectRing(ring[0].body);
  });

  it.each(HIDDEN_ELEMENT_RINGED)('a <%s> with no class of its own is ringed by element, inside the wrapper', (tag) => {
    const ring = rules().filter((r) => r.selectors.includes(`.${WRAPPER}:has(> ${tag}:focus-visible)`));
    expect(ring).toHaveLength(1);
    expectRing(ring[0].body);
  });

  /**
   * The second totality check. The first one grades classes that DELETE an outline; this defect
   * never did that — it hid the element instead. Any control class that goes `opacity: 0` is a
   * control whose ring cannot land on it, so it is either ringed through the wrapper above or
   * named here with the reason.
   */
  it('every control class that hides its own element rings the wrapper', () => {
    const hiding = rules()
      .filter((r) => /opacity:\s*0\b/.test(r.body))
      .flatMap((r) => r.selectors)
      .map((s) => s.replace(/^\./, ''))
      // A pseudo-element is not a thing the keyboard reaches: `::placeholder` goes to `opacity: 0`
      // to hide the hint on a filled field, and rings nothing.
      .filter((c) => c.startsWith('ndl-controls-') && !c.includes('::'));
    expect(hiding.length).toBeGreaterThan(0);
    expect(hiding.filter((c) => !HIDDEN_INPUT_RINGED.includes(c) && !(c in NO_RING))).toEqual([]);
  });

  it('the ring waits for keyboard focus: no plain :focus rule brings it back on a click', () => {
    const plainFocus = rules()
      .flatMap((r) => r.selectors.filter((s) => /:focus(?![-\w])/.test(s)).map((s) => ({ s, body: r.body })))
      .filter(({ body }) => /outline/.test(body));
    expect(plainFocus).toEqual([]);
  });
});
