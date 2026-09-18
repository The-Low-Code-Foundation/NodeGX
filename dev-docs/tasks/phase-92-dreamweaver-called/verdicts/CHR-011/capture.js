// CHR-011 capture — the AFTER half of the phase's verdict.
//
//   NOODL_REMOTE_DEBUG_PORT=9333 node capture.js <theme> <outDir>
//
// This is CHR-001's capture.js with three changes and nothing else, because the whole point of
// this task is that the two runs are comparable:
//
//   1. It reads CHR-001's `measure.js` from CHR-001's own directory rather than carrying a copy.
//      🔴 A copy would drift, and a before/after taken with two different evals measures nothing
//      ([[a-control-pair-proves-what-you-varied-only]]).
//   2. The shadow-hint count looks for BOTH sentences. CHR-008's R8 slice replaced the six copies
//      of "… applies when Shadow Enabled is on" with one "Offset X, Offset Y and Color apply once
//      Shadow Enabled is on." — so the old string now reads 0, which is the promised move and not
//      a broken capture. Reporting only the old string would read as a broken surface.
//   3. It asserts its own preconditions loudly: the Templates shelf row count (CHR-011 §5 —
//      compare like with like), the Group chip, and the Box Shadow heading it scrolls to.
//
// ⚠️ WRITTEN WITHOUT A LIVE APP (s34, 2026-09-18 — Richard ruled the packaged build waits for a
// free box). Every selector below was checked to still exist in the source at `24d2a282c`, which
// is not the same as checked against a running renderer. The first run is an instrument drive:
// expect to fix something here before the pictures are real ([[a-new-instruments-first-drive-finds-instrument-faults]]).
//
// Rules inherited from CHR-001's run: never click the canvas while the picker is open (it inserts
// a node); close the picker with Escape; never hover the preview (it leaves a geometry tooltip).
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate, elementCentre, dispatchClick } =
  require(path.resolve(__dirname, '../../../../../scripts/devtools/cdp.js'));

const [theme, outDir] = process.argv.slice(2);
if (!theme || !outDir) {
  console.error('usage: NOODL_REMOTE_DEBUG_PORT=9333 node capture.js <dark|light> <outDir>');
  process.exit(2);
}
const MEASURE_PATH = path.resolve(__dirname, '../CHR-001/2026-09-15/measure.js');
const MEASURE = fs.readFileSync(MEASURE_PATH, 'utf8');
const GROUP_ON_CANVAS = { x: 855, y: 603 };
const PICKER_BUTTON = { x: 410, y: 55 };
const INERT = { x: 684, y: 14 }; // window title strip

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = [];
const numbers = {};

(async () => {
  fs.mkdirSync(path.join(outDir, 'raw'), { recursive: true });
  const client = await connect(await appTarget());
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const ev = async (expr) => evaluate(client, expr);
  const waitFor = async (expr, ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if ((await ev(expr)) === true) return; await sleep(500); }
    throw new Error('timed out waiting for ' + expr);
  };
  const mouse = async (type, p) =>
    client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: 1 });
  const press = async (p) => { await mouse('mouseMoved', p); await mouse('mousePressed', p); await mouse('mouseMoved', p); await mouse('mouseReleased', p); };
  const shoot = async (name, surface, state) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = name + '-' + theme + '.png';
    fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'));
    const vp = JSON.parse(await ev('JSON.stringify([innerWidth, innerHeight, devicePixelRatio, document.documentElement.dataset.theme])'));
    manifest.push({ file, surface, state, theme, renderedTheme: vp[3], viewportCss: [vp[0], vp[1]], devicePixelRatio: vp[2] });
    console.log('shot', file, vp.join(' '));
  };
  const measure = async (name, selector) => {
    const json = await ev(MEASURE.split('__ROOT__').join(selector.replace(/"/g, '\\"')));
    fs.writeFileSync(path.join(outDir, 'raw', name + '-' + theme + '.json'), json);
    const parsed = JSON.parse(json);
    if (parsed.error) throw new Error('measure: ' + parsed.error);
    return parsed;
  };

  // Launcher
  await waitFor('!!document.querySelector(\'nav[aria-label="Launcher sections"]\')');
  for (const tab of ['Projects', 'Community', 'Learning', 'Templates']) {
    await ev('[...document.querySelectorAll(\'nav[aria-label="Launcher sections"] button\')].find(b => b.textContent === "' + tab + '").click()');
    await sleep(5000);
    const name = 'launcher-' + tab.toLowerCase();
    await shoot(name, 'launcher', tab + ' tab');
    numbers[name] = await measure(name, 'body');
    if (tab === 'Templates') {
      numbers[name].templateRows = JSON.parse(await ev('JSON.stringify([...document.querySelectorAll(\'[class^="Launcher-module__ContentArea"] li\')].map(l => l.querySelector("h2,h3,strong,[class*=Title]")?.textContent || l.textContent.slice(0, 30)))'));
      // CHR-011 §5: CHR-001 shot this tab with seven reachable shelf rows. A different row count is
      // a different surface, and the pair below it would be a comparison of two things.
      console.log('template rows:', numbers[name].templateRows.length, JSON.stringify(numbers[name].templateRows));
      if (numbers[name].templateRows.length !== 7) {
        console.error('⚠️  CHR-001 had 7 rows here. Record this in the manifest or reseed before trusting the pair.');
      }
    }
  }

  // Editor
  await ev('[...document.querySelectorAll(\'nav[aria-label="Launcher sections"] button\')].find(b => b.textContent === "Projects").click()');
  await sleep(1500);
  await dispatchClick(client, await elementCentre(client, 'div[class^=LauncherProjectCard-module__Card]'));
  await waitFor('!!document.querySelector(\'[aria-label="Editor mode"]\')');
  await sleep(5000);
  await dispatchClick(client, await elementCentre(client, '[aria-label="Editor mode"] button[aria-pressed=false]'));
  await sleep(3000);
  await press(GROUP_ON_CANVAS);
  await waitFor("!!document.querySelector('.sidebar-property-editor')", 15000);
  await sleep(2500);

  // 🔴 The editor never unmounts a panel it has shown: `.sidebar-property-editor` can match a hidden
  // 0x16 shell before the live one. Sort by rect area and use the biggest.
  const panelSel = "[...document.querySelectorAll('.sidebar-property-editor')].sort((a,b)=>{const r=e=>{const c=e.getBoundingClientRect();return c.width*c.height};return r(b)-r(a)})[0]";
  const panelBox = await ev('JSON.stringify((() => { const p = ' + panelSel + '; const r = p.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })())');
  console.log('panel box:', panelBox);

  // The chip's DOM text is "Group · Visual"; CSS uppercases it.
  const kind = await ev("document.querySelector('.property-type-chip')?.textContent || ''");
  if (!/^group\b/i.test(String(kind).trim())) throw new Error('selected node is not a Group: ' + kind);

  const scroller = panelSel + ".closest('[class^=\"ScrollArea-module__Root\"]')";
  await ev('(' + scroller + ').style.scrollBehavior = "auto", (' + scroller + ').scrollTop = 0');
  await sleep(800);
  await shoot('editor-group-panel-top', 'property panel', 'root Group of App selected, panel scrolled to top');
  numbers['editor-group-panel'] = await measure('editor-group-panel', '.sidebar-property-editor');
  // Both sentences. CHR-001 read 6 of the first; R8 replaced them with 1 of the second.
  numbers['editor-group-panel'].shadowHints = JSON.parse(await ev('JSON.stringify((() => { const t = ' + panelSel + '.textContent; return { chr001Sentence: (t.match(/applies when Shadow Enabled is on/g) || []).length, r8Sentence: (t.match(/apply once Shadow Enabled is on/g) || []).length }; })())'));
  console.log('shadow hints:', JSON.stringify(numbers['editor-group-panel'].shadowHints));

  const hasHeading = await ev('(() => { const sc = ' + scroller + '; return [...sc.querySelectorAll("*")].some(e => e.children.length === 0 && e.textContent === "Box Shadow"); })()');
  if (hasHeading !== true) throw new Error('no leaf element reads exactly "Box Shadow" — the group heading changed; fix this script, do not shoot a different row');
  await ev('(() => { const sc = ' + scroller + '; const h = [...sc.querySelectorAll("*")].find(e => e.children.length === 0 && e.textContent === "Box Shadow"); sc.scrollTop += h.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8; })()');
  await sleep(800);
  await shoot('editor-group-panel-boxshadow', 'property panel', 'same Group, panel scrolled to Box Shadow (Shadow Enabled off)');
  await ev('(' + scroller + ').scrollTop = 0');

  // Node picker
  await press(PICKER_BUTTON);
  await waitFor('!!document.querySelector(\'input[placeholder^="Search nodes"]\')', 10000);
  await mouse('mouseMoved', INERT);
  await sleep(1500);
  await shoot('editor-nodepicker', 'node picker', 'opened from the preview toolbar +, nothing typed');
  numbers['editor-nodepicker'] = await measure('editor-nodepicker', 'body');
  for (const type of ['keyDown', 'keyUp']) {
    await client.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  }
  await sleep(800);
  const pickerOpen = await ev('!!document.querySelector(\'input[placeholder^="Search nodes"]\')');
  console.log('picker closed:', !pickerOpen);

  fs.writeFileSync(path.join(outDir, 'manifest-' + theme + '.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, 'measured-' + theme + '.json'), JSON.stringify(numbers, null, 2));
  console.log('done', theme);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
