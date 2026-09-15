// CHR-001 capture: one packaged instance, one theme, one connection.
//   NOODL_REMOTE_DEBUG_PORT=9333 node capture.js <theme> <outDir>
// Launcher (4 tabs) -> open the first project card -> Design mode -> select the root Group ->
// panel top, panel at Box Shadow -> node picker. Every surface gets a PNG and a measurement.
// Rules learned on the first attempt: never click the canvas while the picker is open (it inserts
// a node); close the picker with Escape; never hover the preview (it leaves a geometry tooltip).
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate, elementCentre, dispatchClick } =
  require(path.resolve(__dirname, '../../../../../../scripts/devtools/cdp.js'));

const [theme, outDir] = process.argv.slice(2);
const MEASURE = fs.readFileSync(path.join(__dirname, 'measure.js'), 'utf8');
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
  const mouse = async (type, { x, y }) =>
    client.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: 1 });
  const press = async (p) => { await mouse('mouseMoved', p); await mouse('mousePressed', p); await mouse('mouseMoved', p); await mouse('mouseReleased', p); };
  const shoot = async (name, surface, state) => {
    const { data } = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = `${name}-${theme}.png`;
    fs.writeFileSync(path.join(outDir, file), Buffer.from(data, 'base64'));
    const vp = JSON.parse(await ev('JSON.stringify([innerWidth, innerHeight, devicePixelRatio, document.documentElement.dataset.theme])'));
    manifest.push({ file, surface, state, theme, renderedTheme: vp[3], viewportCss: [vp[0], vp[1]], devicePixelRatio: vp[2] });
    console.log('shot', file, vp.join(' '));
  };
  const measure = async (name, selector) => {
    const json = await ev(MEASURE.split('__ROOT__').join(selector.replace(/"/g, '\\"')));
    fs.writeFileSync(path.join(outDir, 'raw', `${name}-${theme}.json`), json);
    return JSON.parse(json);
  };

  // Launcher
  await waitFor(`!!document.querySelector('nav[aria-label="Launcher sections"]')`);
  for (const tab of ['Projects', 'Community', 'Learning', 'Templates']) {
    await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find(b => b.textContent === '${tab}').click()`);
    await sleep(5000);
    const name = `launcher-${tab.toLowerCase()}`;
    await shoot(name, 'launcher', `${tab} tab`);
    const m = await measure(name, 'body');
    numbers[name] = m;
    if (tab === 'Templates') {
      numbers[name].templateRows = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[class^="Launcher-module__ContentArea"] li')].map(l => l.querySelector('h2,h3,strong,[class*="Title"]')?.textContent || l.textContent.slice(0, 30)))`));
    }
  }

  // Editor
  await ev(`[...document.querySelectorAll('nav[aria-label="Launcher sections"] button')].find(b => b.textContent === 'Projects').click()`);
  await sleep(1500);
  await dispatchClick(client, await elementCentre(client, 'div[class^=LauncherProjectCard-module__Card]'));
  await waitFor(`!!document.querySelector('[aria-label="Editor mode"]')`);
  await sleep(5000);
  await dispatchClick(client, await elementCentre(client, '[aria-label="Editor mode"] button[aria-pressed=false]'));
  await sleep(3000);
  await press(GROUP_ON_CANVAS);
  await waitFor(`!!document.querySelector('.sidebar-property-editor')`, 15000);
  await sleep(2500);
  // The chip's DOM text is "Group · Visual"; CSS uppercases it.
  const kind = await ev(`document.querySelector('.property-type-chip')?.textContent || ''`);
  if (!/^group\b/i.test(kind.trim())) throw new Error('selected node is not a Group: ' + kind);

  const scroller = `document.querySelector('.sidebar-property-editor').closest('[class^="ScrollArea-module__Root"]')`;
  await ev(`(${scroller}).style.scrollBehavior = 'auto', (${scroller}).scrollTop = 0`);
  await sleep(800);
  await shoot('editor-group-panel-top', 'property panel', 'root Group of App selected, panel scrolled to top');
  numbers['editor-group-panel'] = await measure('editor-group-panel', '.sidebar-property-editor');
  numbers['editor-group-panel'].shadowHints = await ev(`(document.querySelector('.sidebar-property-editor').textContent.match(/applies when Shadow Enabled is on/g) || []).length`);

  await ev(`(() => { const sc = ${scroller}; const h = [...sc.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent === 'Box Shadow'); sc.scrollTop += h.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8; })()`);
  await sleep(800);
  await shoot('editor-group-panel-boxshadow', 'property panel', 'same Group, panel scrolled to Box Shadow (Shadow Enabled off)');
  await ev(`(${scroller}).scrollTop = 0`);

  // Node picker
  await press(PICKER_BUTTON);
  await waitFor(`!!document.querySelector('input[placeholder^="Search nodes"]')`, 10000);
  await mouse('mouseMoved', INERT);
  await sleep(1500);
  await shoot('editor-nodepicker', 'node picker', 'opened from the preview toolbar +, nothing typed');
  numbers['editor-nodepicker'] = await measure('editor-nodepicker', 'body');
  for (const type of ['keyDown', 'keyUp']) {
    await client.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  }
  await sleep(800);
  const pickerOpen = await ev(`!!document.querySelector('input[placeholder^="Search nodes"]')`);
  console.log('picker closed:', !pickerOpen);

  fs.writeFileSync(path.join(outDir, `manifest-${theme}.json`), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, `measured-${theme}.json`), JSON.stringify(numbers, null, 2));
  console.log('done', theme);
  process.exit(0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
