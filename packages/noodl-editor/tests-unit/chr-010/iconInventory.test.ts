/**
 * CHR-010 — every `IconName` names an SVG that exists on disk.
 *
 * CHR-010 deleted Font Awesome and moved 23 editor glyphs onto core-ui's `Icon`.
 * The task file asserted "there is a spec; keep it green" for this invariant.
 * There was not one — nothing outside `Icon.tsx` itself referenced the icon
 * directory at all. This is that spec, written because the conversion leans on
 * the invariant at ten call sites.
 *
 * 🔴 Why it matters, and why nothing else catches it: `Icon` resolves a glyph
 * through a `require.context` map keyed by filename. A name with no file is not
 * an error — `_IconObject[icon]` is `undefined`, the `typeof === 'object'` test
 * fails, and the component falls through to `fetch(undefined)`. The span still
 * renders, with nothing inside it. So a typo'd or stale `IconName` produces a
 * BLANK, silently, in the one place a person is looking. That is the same shape
 * as CHR-008 §10.4's gutted `TextAreaType` — "drew nothing" reads exactly like
 * "fine" to every gate that counts elements rather than pixels.
 *
 * Read as TEXT rather than by importing `Icon`: the component is
 * `require.context`-coupled and cannot load under plain jest without FLD-017's
 * stub, and a stub is precisely the thing that would hide this.
 */
import * as fs from 'fs';
import * as path from 'path';

const CORE_UI = path.join(__dirname, '../../../noodl-core-ui');
const ICON_TSX = path.join(CORE_UI, 'src/components/common/Icon/Icon.tsx');
const ICON_DIR = path.join(CORE_UI, 'src/assets/icons/icon-component');

/** `{ MemberName: 'file_stem' }` for every entry of the `IconName` enum. */
function iconNames(): Record<string, string> {
  const source = fs.readFileSync(ICON_TSX, 'utf8');

  const start = source.indexOf('export enum IconName {');
  expect(start).toBeGreaterThanOrEqual(0);
  const body = source.slice(start).split('\n}')[0];

  const entries: Record<string, string> = {};
  for (const match of body.matchAll(/^\s*([A-Za-z0-9_]+)\s*=\s*'([^']+)'/gm)) {
    entries[match[1]] = match[2];
  }
  return entries;
}

function svgStems(): Set<string> {
  return new Set(
    fs
      .readdirSync(ICON_DIR)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.slice(0, -'.svg'.length))
  );
}

describe('CHR-010 — the icon set is self-consistent', () => {
  it('parses a plausible population, so a silent zero cannot pass as a clean run', () => {
    // Guards the instrument, not the product: if the enum is renamed or the
    // regex stops matching, every assertion below passes over an empty set.
    const names = iconNames();
    expect(Object.keys(names).length).toBeGreaterThan(100);
    expect(svgStems().size).toBeGreaterThan(100);
    expect(names.Plus).toBe('plus');
  });

  it('every IconName resolves to an SVG file — a name with none renders an empty span', () => {
    const svgs = svgStems();

    const missing = Object.entries(iconNames())
      .filter(([, stem]) => !svgs.has(stem))
      .map(([member, stem]) => `IconName.${member} -> ${stem}.svg`);

    expect(missing).toEqual([]);
  });

  it('the glyphs CHR-010 moved off Font Awesome are all present', () => {
    // Named one by one rather than covered by the sweep above: these ten are
    // what the 23 converted call sites draw, so if the set is ever pruned the
    // failure should say which surface it breaks, not just "one name is stale".
    const names = iconNames();
    const svgs = svgStems();

    const used = [
      'Pencil', // was fa-edit / fa-pencil-square-o
      'Trash', // was fa-trash / fa-trash-o
      'Plus', // was fa-plus
      'Search', // was fa-search
      'CaretDown', // was fa-caret-down
      'CaretUp', // was fa-caret-up
      'Close', // was fa-close
      'DotsThreeHorizontal', // was fa-ellipsis-h
      'WarningTriangle', // was fa-exclamation-triangle
      'ArrowRight' // was fa-share, the drag overlay's "move" mark
    ];

    const broken = used.filter((member) => !names[member] || !svgs.has(names[member]));
    expect(broken).toEqual([]);
  });
});
