// CHR-010 — the glyph census, shared by `drive-icons.js` (s32) and `drive-surfaces.js` (s33).
//
// 🔴 It grades the glyph BOX, not the element count. Both of this task's failure modes render a
// present, correctly-classed element: `Icon` draws an EMPTY SPAN when its name has no SVG, and a
// fixed-size `Icon` in a padded box collapses to zero width under the global `box-sizing:
// border-box`. "44 hosts for 44 rows" is what each of them reports.
//
// The scope is passed in, because a popup drawn in the popup layer is not inside the panel, and a
// census that silently graded the whole document would read the same either way — which is how an
// unreached surface reads as a reached one.

/** Every shape a Font Awesome glyph took in this editor, as a live DOM query. */
const FA_SELECTOR = `'i.fa, .fa, [class*="fa-"]'`;

/**
 * @param scopeExpr a JS expression returning an Element, or `document` — the population is
 *   reported back as `scope`, so "0 icons" can be told apart from "the scope was not there".
 */
function censusExpr(scopeExpr = 'document') {
  return `(() => {
    const scope = ${scopeExpr};
    if (!scope) return { scope: null };
    const icons = [...scope.querySelectorAll('[class*="Icon-module__Root"]')];
    const rows = icons.map((el) => {
      const r = el.getBoundingClientRect();
      const svg = el.querySelector('svg');
      const sr = svg && svg.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // What a person would call this glyph: the nearest text beside it.
      const near = (el.closest('button, [role=button], .property-panel-row, .variants-header, li, div') || el);
      return {
        cls: String(el.className).replace(/Icon-module__/g, ''),
        near: (near.textContent || '').trim().slice(0, 40),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        svgW: sr ? Math.round(sr.width * 10) / 10 : null,
        svgH: sr ? Math.round(sr.height * 10) / 10 : null,
        colour: cs.color,
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
      };
    });
    const drawn = rows.filter((r) => r.visible);
    // The scope's own box is reported. This editor keeps every visited panel MOUNTED, so a class
    // like .sidebar-panel matches a hidden 0x16 shell before it matches the panel a person is
    // looking at, and a census of the wrong one reads "0 drawn" - identical to a surface whose
    // glyphs all failed. offsetParent cannot tell them apart here either (it is null for
    // everything under the app's transformed ancestors); the rect can.
    const sr = scope === document ? null : scope.getBoundingClientRect();
    return {
      scope: scope === document ? 'document' : (scope.className || scope.tagName),
      scopeBox: sr ? [Math.round(sr.width), Math.round(sr.height)] : 'document',
      total: rows.length,
      drawn: drawn.length,
      emptyHosts: rows.filter((r) => r.svgW === null).length,
      collapsed: drawn.filter((r) => r.svgW === 0 || r.svgH === 0).length,
      boxes: [...new Set(drawn.map((r) => r.w + 'x' + r.h))].sort(),
      colours: [...new Set(drawn.map((r) => r.colour))].sort(),
      faLeft: scope.querySelectorAll(${FA_SELECTOR}).length,
      // Plain concatenation: a nested template literal here would interpolate in THIS file,
      // not in the renderer.
      glyphs: drawn.map((r) => r.near + ' | ' + r.w + 'x' + r.h + ' | svg ' + r.svgW + 'x' + r.svgH + ' | ' + r.colour)
    };
  })()`;
}

module.exports = { censusExpr, FA_SELECTOR };
