// Which token paints a property-panel field's edge, and what does NAT-001 promise about it?
//
// The gate's 82 control-edge findings are ONE colour pair repeated 80 times. A count is not a
// finding: this names the token behind it, so the ruling question can be asked about a decision
// rather than about a number.
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));
// 🔴 `contrastRatio` takes PARSED colours, not CSS strings — handed a string it throws inside
// `relativeLuminance`, which is the shape a silent 0 would have been far worse than.
const { contrastRatio, parseColorAlpha, flattenGround } = require(path.join(ROOT, 'scripts/look-gate/lib/color.js'));
/** A CSS colour string, flattened over `under`, as the gate itself would flatten it. */
const ratio = (top, under) => contrastRatio(flattenGround([top, under]), flattenGround([under]));

const READ = [
  '(() => {',
  '  const el = document.querySelector(".sidebar-property-editor input[class*=PropertyPanelBaseInput-module__Root]")',
  '    || [...document.querySelectorAll(".sidebar-property-editor input")].find((x) => getComputedStyle(x).borderTopWidth !== "0px");',
  '  if (!el) return JSON.stringify({ error: "no field" });',
  '  const cs = getComputedStyle(el);',
  '  const rs = getComputedStyle(document.documentElement);',
  '  const names = new Set();',
  '  for (const sheet of document.styleSheets) {',
  '    let rules = [];',
  '    try { rules = [...sheet.cssRules]; } catch (e) { rules = []; }',
  '    for (const rule of rules) {',
  '      if (!rule.style || !rule.selectorText) continue;',
  '      if (rule.selectorText.indexOf(":root") === -1 && rule.selectorText.indexOf("data-theme") === -1) continue;',
  '      for (const prop of rule.style) if (prop.indexOf("--theme-color-") === 0) names.add(prop);',
  '    }',
  '  }',
  '  const toks = {};',
  '  for (const n of names) { const v = rs.getPropertyValue(n).trim(); if (v) toks[n] = v; }',
  '  let ground = null;',
  '  for (let n = el.parentElement; n; n = n.parentElement) {',
  '    const b = getComputedStyle(n).backgroundColor;',
  '    if (b !== "rgba(0, 0, 0, 0)" && b !== "transparent") { ground = b; break; }',
  '  }',
  '  return JSON.stringify({ border: cs.borderTopColor, fill: cs.backgroundColor, ground: ground, toks: toks });',
  '})()'
].join('\n');

const norm = (v) => String(v).replace(/\s+/g, '').toLowerCase();

(async () => {
  const client = await connect(await appTarget('editor'));
  for (const theme of ['light', 'dark']) {
    await evaluate(client, 'document.documentElement.setAttribute("data-theme", "' + theme + '")');
    await new Promise((r) => setTimeout(r, 250));
    const parsed = JSON.parse(await evaluate(client, READ));
    if (parsed.error) {
      console.log(theme, parsed.error);
      continue;
    }
    const { border, fill, ground, toks } = parsed;
    const named = (v) =>
      Object.keys(toks)
        .filter((n) => norm(toks[n]) === norm(v))
        .join(', ') || '(no token has this value)';

    console.log('\n===== ' + theme + ' =====');
    console.log('  field border  ' + border + '   = ' + named(border));
    console.log('  field fill    ' + fill + '   = ' + named(fill));
    console.log('  panel ground  ' + ground + '   = ' + named(ground));
    console.log('  --- the boundaries a person could see ---');
    console.log('  border vs ground  ' + ratio(border, ground).toFixed(3) + ':1');
    console.log('  fill   vs ground  ' + ratio(fill, ground).toFixed(3) + ':1');
    console.log('  border vs fill    ' + ratio(border, fill).toFixed(3) + ':1');
    console.log('  --- what NAT-001 grades at 3:1, for comparison ---');
    for (const n of ['--theme-color-border-control', '--theme-color-border-default', '--theme-color-border-subtle']) {
      if (!toks[n]) continue;
      console.log(
        '  ' + n.padEnd(32) + toks[n].padEnd(24) + ' vs this ground = ' + ratio(toks[n], ground).toFixed(3) + ':1'
      );
    }
  }
  await evaluate(client, 'document.documentElement.setAttribute("data-theme", "dark")');
  client.close();
})().catch((e) => {
  console.error('FAILED', e.stack || e.message);
  process.exit(1);
});
