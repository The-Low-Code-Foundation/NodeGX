/**
 * CHR-004 — the type and radius scales, read from the files that define them.
 *
 * R1 (ruled 2026-09-15) gives the chrome five sizes plus a display size; CHR-003 cut the radii to
 * the `--radius-*` ramp and deleted 5 / 7 / 10. Neither set is retyped here. The allowed values
 * are whatever `fonts.css` and `spacing.css` currently define, because a gate holding its own copy
 * of a ruled number is the defect this phase has now paid for twice — once in five stylesheets
 * (`--property-label-column`) and once in a spec's token map, which NAT-002 caught grading a
 * palette the product no longer shipped.
 *
 * That is also why this gate does NOT say which token delivered a size. `font-size: 13px` written
 * as a literal and `var(--font-size-md)` are the same pixel to a reader, and CHR-002's ratchet
 * (`npm run type`) is the gate that pushes literals towards tokens. This one asks the other
 * question: whatever the token situation, is the number a person sees on the ramp?
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..');
const FONTS_CSS = path.join(ROOT, 'packages/noodl-core-ui/src/styles/custom-properties/fonts.css');
const SPACING_CSS = path.join(ROOT, 'packages/noodl-core-ui/src/styles/custom-properties/spacing.css');

/** Sub-pixel slack. Chromium reports `13.3333px` for an unstyled `<button>`; 13 is not that. */
const EPSILON = 0.01;

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Every `--prefix-*` custom property declared anywhere in `source`, as written.
 *
 * Deliberately not scoped to a selector: these two files declare their ramps on `:root` and
 * nothing overrides them per theme, and a gate that silently read zero tokens because a selector
 * was renamed would pass everything. `readScale` throws on an empty map for the same reason.
 */
function declaredTokens(source, prefix) {
  const tokens = {};
  const pattern = new RegExp(`(${prefix}[\\w-]*)\\s*:\\s*([^;}]+)`, 'g');
  let match;
  while ((match = pattern.exec(source))) tokens[match[1]] = match[2].trim();
  return tokens;
}

/** Follow `var(--x)` until something that is not a reference falls out. */
function resolve(tokens, value) {
  let current = value;
  for (let depth = 0; depth < 20 && /var\(\s*--[\w-]+/.test(current); depth++) {
    current = current.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (whole, name) =>
      tokens[name] === undefined ? whole : tokens[name]
    );
  }
  return current.trim();
}

/**
 * The distinct px values a `--prefix-*` ramp resolves to, ascending.
 *
 * A unitless `0` counts as `0px` (that is how `--radius-none: 0` is written). Anything that is
 * not a px length after resolution — a `%`, an `em`, a `calc()` — is left out of the allowed set
 * and reported, so a ramp that grew a unit this gate cannot grade is visible rather than silently
 * permissive.
 */
function readScale(source, prefix) {
  const tokens = declaredTokens(source, prefix);
  const names = Object.keys(tokens);
  if (!names.length) throw new Error(`No ${prefix}* tokens found — the gate would allow everything`);

  const values = new Set();
  const ungradeable = [];
  for (const name of names) {
    const resolved = resolve(tokens, tokens[name]);
    if (/^-?\d*\.?\d+px$/.test(resolved)) values.add(parseFloat(resolved));
    else if (/^0$/.test(resolved)) values.add(0);
    else ungradeable.push(`${name}: ${resolved}`);
  }

  return { values: [...values].sort((a, b) => a - b), ungradeable, tokenCount: names.length };
}

/**
 * The scales, read from disk. Node only — the renderer half of the gate is handed the same shape
 * as data by `collect.js`, so the audit never needs a filesystem.
 */
function scalesFromDisk() {
  const fonts = readScale(stripComments(fs.readFileSync(FONTS_CSS, 'utf8')), '--font-size-');
  const radii = readScale(stripComments(fs.readFileSync(SPACING_CSS, 'utf8')), '--radius-');
  return {
    fontSizes: fonts.values,
    radii: radii.values,
    source: {
      fontSizes: { file: path.relative(ROOT, FONTS_CSS), tokens: fonts.tokenCount, ungradeable: fonts.ungradeable },
      radii: { file: path.relative(ROOT, SPACING_CSS), tokens: radii.tokenCount, ungradeable: radii.ungradeable }
    }
  };
}

/**
 * Is `value` (a computed CSS string) on `allowed`?
 *
 * Three answers, not two:
 *  - `{ on: true }`            — a px length on the ramp
 *  - `{ on: false, value }`    — a px length that is not
 *  - `{ skip: '<reason>' }`    — not a px length at all (a `%` radius is a shape, not a step on
 *                                the ramp; `normal` is what a `line-height` reads). A skip is
 *                                counted in the population rather than passed silently, because a
 *                                gate whose refusals are invisible reads as coverage it does not
 *                                have.
 */
function onScale(value, allowed) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return { skip: 'empty' };

  const px = text.match(/^(-?\d*\.?\d+)px$/);
  if (!px) {
    if (/%$/.test(text)) return { skip: 'percentage' };
    if (/^-?\d*\.?\d+$/.test(text)) {
      const unitless = parseFloat(text);
      if (unitless === 0) return { on: allowed.some((step) => Math.abs(step) < EPSILON), value: 0 };
    }
    return { skip: 'not-a-px-length' };
  }

  const number = parseFloat(px[1]);
  return { on: allowed.some((step) => Math.abs(step - number) < EPSILON), value: number };
}

module.exports = { scalesFromDisk, readScale, stripComments, onScale, EPSILON, FONTS_CSS, SPACING_CSS };
