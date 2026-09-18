// CHR-010 AC1 + AC2 — Font Awesome is gone, and what replaced it renders.
//
// Two questions, and they are not the same question:
//
//   AC2 (absence) — does the editor still ASK for Font Awesome? A `<link>` can be deleted from
//     `index.html` while a stylesheet, a `@font-face` or a cached bundle still pulls it. Graded
//     from the renderer's own resource timing, not from the file on disk.
//   AC1 (presence) — does every converted glyph DRAW? This is the half a grep cannot reach, and
//     the half this phase has been caught by nine times: `Icon` renders an empty `<span>` when its
//     name has no SVG, and a fixed-size `Icon` inside a padded box collapses to ZERO WIDTH under
//     the global `box-sizing: border-box`. Both are invisible to every count of elements.
//
// 🔴 So the census below measures the GLYPH BOX, not the element count. A converted row with a
// present, correctly-classed, zero-by-zero `<svg>` is exactly what both defects look like, and it
// is what "44 rows / 44 hosts" would have reported as a pass (CHR-008 §10.4).
//
// 🔴 Verify the RENDERER is running the new module before believing anything: the dev server can
// serve a rebuilt bundle while the renderer still holds the old one (CHR-009 s17).
//
//   NOODL_REMOTE_DEBUG_PORT=<port> node drive-icons.js --expect=<scratch copy> [--out=<dir>]
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { appTarget, connect, evaluate, elementCentre, dispatchClick } = require(path.join(ROOT, 'scripts/devtools/cdp.js'));

const args = process.argv.slice(2);
const opt = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const outDir = path.resolve(__dirname, opt('out', 'out'));
const EXPECT = opt('expect', '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Every shape a Font Awesome glyph took in this editor, as a live DOM query. Wider than the three
 * strings AC2 names, for the same reason `scripts/icon-font-gate.js` is: `popuplayer.ts` held FA
 * through `classList.add('fa-share')`, which `i.fa.fa-plus` would never have matched.
 */
const FA_SELECTOR = `'i.fa, .fa, [class*="fa-"]'`;

const readings = {};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(client, expr);
  const must = async (expr, ms, what) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    throw new Error(`timed out waiting for ${what}`);
  };

  // A reload leaves the editor on the LAUNCHER — `__nodeGraphEditor` appears only after a card
  // is clicked again.
  if (!(await ev(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent && window.__nodeGraphEditor.getActiveComponent())`))) {
    await must(`[...document.querySelectorAll('[class*="LauncherCard-module__Card"]')].length > 0`, 600000, 'launcher');
    const card = await elementCentre(client, '[class*="LauncherCard-module__Card"]');
    await dispatchClick(client, card);
    await must(`!!(window.__nodeGraphEditor && window.__nodeGraphEditor.getActiveComponent())`, 120000, 'editor');
  }

  // 🔴 Selecting nodes autosaves and opening a project writes three files into it. Refuse to drive
  // anything but a scratch copy.
  if (EXPECT) {
    const opened = await ev(`(window.__nodeGraphEditor.getActiveComponent().owner.projectDirectory || '')`);
    if (!String(opened).startsWith(EXPECT)) throw new Error(`opened ${opened}, expected ${EXPECT}`);
  }

  // ---- the instrument is armed before it measures -------------------------------------------
  // The renderer must be running the converted modules. If `popuplayer` still carries `fa-share`
  // the bundle is stale and every reading below is about the OLD build.
  readings.bundleIsNew = await ev(`(() => {
    let m;
    window.webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { m = r; }]);
    const key = Object.keys(m.m).find((k) => k.includes('views/popuplayer'));
    if (!key) return 'popuplayer module not found';
    const src = String(m.m[key]);
    return { hasOldFaShare: src.includes('fa-share'), hasNewIconHost: src.includes('iconHost') };
  })()`);

  // ---- AC2: does anything still ASK for Font Awesome? ----------------------------------------
  // 🔴 NOT from `performance.getEntriesByType('resource')`. The first version of this arm did, read
  // `[]` for font-awesome, and was VACUOUS: that call returns `[]` for EVERY font and EVERY
  // stylesheet in this renderer, so it could not have reported a Font Awesome request had one
  // existed. An absence is evidence only beside a signal that fires — and `document.fonts` is that
  // signal, because it lists every `@font-face` a live stylesheet declares, loaded or not. It reads
  // `["Bricolage Grotesque"]`, so it would have named FontAwesome had the stylesheet survived.
  readings.stylesheetLinks = await ev(`[...document.querySelectorAll('link[rel=stylesheet]')]
    .map((l) => l.getAttribute('href'))`);
  readings.fontFaceFamilies = await ev(`[...document.fonts].map((f) => f.family)`);
  readings.faRuleInAnySheet = await ev(`(() => {
    let scanned = 0, hits = 0;
    for (const sheet of document.styleSheets) {
      try { for (const rule of sheet.cssRules) { scanned++; if (/font-?awesome/i.test(rule.cssText)) hits++; } }
      catch { /* cross-origin sheet: counted as unreadable below */ }
    }
    // The population is reported, so "0 hits" can be told apart from "nothing was read".
    return { sheets: document.styleSheets.length, rulesScanned: scanned, hits };
  })()`);
  readings.faElementsInDom = await ev(`document.querySelectorAll(${FA_SELECTOR}).length`);

  // ---- AC1: every converted glyph draws ------------------------------------------------------
  // The population is printed, not assumed: which elements were graded, and the box each one drew.
  const censusExpr = `(() => {
    const icons = [...document.querySelectorAll('[class*="Icon-module__Root"]')];
    const rows = icons.map((el) => {
      const r = el.getBoundingClientRect();
      const svg = el.querySelector('svg');
      const sr = svg && svg.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        cls: el.className,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        svgW: sr ? Math.round(sr.width * 10) / 10 : null,
        svgH: sr ? Math.round(sr.height * 10) / 10 : null,
        colour: cs.color,
        visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
      };
    });
    const drawn = rows.filter((r) => r.visible);
    return {
      total: rows.length,
      drawn: drawn.length,
      // The two defects this drive exists to catch, each named rather than counted.
      emptyHosts: rows.filter((r) => r.svgW === null).length,
      collapsed: drawn.filter((r) => r.svgW === 0 || r.svgH === 0).length,
      boxes: [...new Set(drawn.map((r) => r.w + 'x' + r.h))].sort(),
      colours: [...new Set(drawn.map((r) => r.colour))].sort()
    };
  })()`;

  async function setTheme(theme) {
    // 🔴 A theme flip does not apply in the SAME eval — read it back on the next one.
    await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`);
    await sleep(400);
    return ev(`getComputedStyle(document.body).backgroundColor`);
  }

  readings.themes = {};
  for (const theme of ['dark', 'light']) {
    const ground = await setTheme(theme);
    readings.themes[theme] = { ground, census: await ev(censusExpr) };
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, `panel-${theme}.png`), Buffer.from(shot.data, 'base64'));
  }

  fs.writeFileSync(path.join(outDir, 'readings.json'), JSON.stringify(readings, null, 2));
  console.log(JSON.stringify(readings, null, 2));
  console.log(`\nshots + readings -> ${outDir}`);
  await client.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
