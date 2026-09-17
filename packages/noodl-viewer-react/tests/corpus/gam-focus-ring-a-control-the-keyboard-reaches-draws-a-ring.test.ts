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

  it.each(RINGED)('.%s:focus-visible draws a solid ring in the --ring token, offset from the control', (cls) => {
    const ring = rules().filter((r) => r.selectors.includes(`.${cls}:focus-visible`));
    expect(ring).toHaveLength(1);
    const body = ring[0].body;
    const outline = body.match(/outline:\s*([^;]+);/);
    expect(outline && outline[1].trim()).toMatch(/^(\d+)px solid var\(--ring, #[0-9a-f]{3,6}\)$/);
    expect(Number(outline![1].trim().match(/^(\d+)px/)![1])).toBeGreaterThanOrEqual(2);
    expect(body).toMatch(/outline-offset:\s*[1-9]\d*px/);
  });

  it('the ring waits for keyboard focus: no plain :focus rule brings it back on a click', () => {
    const plainFocus = rules()
      .flatMap((r) => r.selectors.filter((s) => /:focus(?![-\w])/.test(s)).map((s) => ({ s, body: r.body })))
      .filter(({ body }) => /outline/.test(body));
    expect(plainFocus).toEqual([]);
  });
});
