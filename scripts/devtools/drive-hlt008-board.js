#!/usr/bin/env node
/**
 * P99 HLT-008 — the board, slice 3. The drive for Richard's six (B1–B6).
 *
 * 🔴 **Every arm performs the gesture and then reads the SURFACE.** TVW-008's six green arms graded
 * a count, a coordinate and a file mtime while the board was unusable (HLT-008 §3). So nothing here
 * reads a number the component computed: a pan is a wheel followed by the document's transform, a
 * gutter is `elementFromPoint`, a slab that stayed behind is a hit test at the place the frame left,
 * a navigation is the chip's label after the release.
 *
 * Needs the fixture from `tvw008-board-fixture.js --out "<dir>"` and a dev stack of this session's.
 *
 *   node scripts/devtools/drive-hlt008-board.js [--dir <fixture>] [--shots <dir>] [--label fixed|control]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/HLT-008 Board');
const SHOTS = opt('shots', path.join(__dirname, '../../dev-docs/tasks/phase-99-the-ones-nobody-owned/shots'));
const LABEL = opt('label', 'fixed');

const PRIMARY = '/Buttons/Primary Button';
const SECONDARY = '/Buttons/Secondary Button';
const GHOST = '/Buttons/Ghost Button';
const PICKS = [PRIMARY, SECONDARY, GHOST];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const BOOT = `(() => { if (typeof window.__wreq !== 'function' && typeof webpackChunknoodl_editor !== 'undefined') { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } })();`;
const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;

/** 🔴 Whose editor is on 9222. Fails CLOSED ([[cdp-attaches-to-whoever-holds-9222]]). */
function walkToCli(startPid) {
  const sh = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8' }).trim();
    } catch (error) {
      return '';
    }
  };
  let p = String(startPid);
  for (let i = 0; i < 40; i++) {
    const args = sh(`ps -o args= -p ${p}`);
    if (/anthropic\.claude-code.*\/claude/.test(args)) return String(p);
    const pp = sh(`ps -o ppid= -p ${p}`);
    if (!pp || pp === '1' || pp === p) break;
    p = pp;
  }
  return null;
}

function targets() {
  return new Promise((resolve, reject) => {
    http
      .get('http://127.0.0.1:9222/json/list', (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(JSON.parse(body)));
      })
      .on('error', reject);
  });
}

async function main() {
  console.log(`HLT-008 — the board (${LABEL}). project: ${PROJECT_DIR}\n`);
  if (!fs.existsSync(path.join(PROJECT_DIR, 'project.json'))) {
    console.error('UNGRADABLE: no fixture. Run tvw008-board-fixture.js --out <dir> first.');
    process.exit(2);
  }
  let pid = '';
  try {
    pid = execSync('lsof -nP -iTCP:9222 -sTCP:LISTEN -t', { encoding: 'utf8' }).trim().split('\n')[0];
  } catch (error) {
    pid = '';
  }
  const owner = pid ? walkToCli(pid) : null;
  const mine = walkToCli(process.pid);
  if (!pid || !owner || !mine || owner !== mine) {
    console.error(`REFUSING: the editor on 9222 (pid ${pid || 'none'}) is not attributable to this session (owner=${owner}, self=${mine}).`);
    process.exit(2);
  }
  record('the editor on 9222 belongs to this session', true, `electron ${pid}`);

  const ed = await connect(await appTarget('editor'));
  await ed.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => undefined);
  // ⚠️ deviceScaleFactor 2, the guest's own. At 1 the compositor draws the <webview>'s content at
  // half size in a capture, which reads exactly like a layout bug and is not one.
  await ed.send('Emulation.setDeviceMetricsOverride', { width: 1760, height: 1100, deviceScaleFactor: 2, mobile: false });
  let booted = false;
  for (let i = 0; i < 30 && !booted; i++) {
    await evaluate(ed, BOOT);
    booted = String(await evaluate(ed, 'typeof window.__wreq')) === 'function';
    if (!booted) await wait(1000);
  }
  if (!booted) {
    console.error('UNGRADABLE: the renderer bundle never loaded.');
    process.exit(2);
  }
  const ev = async (e) => String(await evaluate(ed, e));
  const json = async (e) => JSON.parse(await ev(e));
  const shoot = async (name) => {
    fs.mkdirSync(SHOTS, { recursive: true });
    const { data } = await ed.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(SHOTS, `hlt008-${LABEL}-${name}.png`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`      shot ${path.relative(process.cwd(), file)}`);
  };
  const mouse = (type, x, y, extra = {}) =>
    ed.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1, buttons: type === 'mouseReleased' ? 0 : 1, ...extra });

  // --- the project -----------------------------------------------------------------------------
  const dir = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(dir) !== path.resolve(PROJECT_DIR)) {
    await ev(`(() => { const root = document.getElementById('root'); let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))]; let d = 0; while (f && d < 40) { const pr = f.memoizedProps; if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__hlt008R = pr.route.router; break; } f = f.child; d++; } return !!window.__hlt008R; })()`);
    await ev(`(async () => { const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')}; const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)}); window.__hlt008R.route({ to: 'editor', project: p }); return 'ok'; })()`);
    await wait(15000);
  }
  const opened = await ev(`(() => ${PROJECT}.instance ? ${PROJECT}.instance._retainedProjectDirectory : 'NONE')()`);
  record('the driven project is the fixture', path.resolve(opened) === path.resolve(PROJECT_DIR), opened);
  if (path.resolve(opened) !== path.resolve(PROJECT_DIR)) process.exit(2);
  await ev(`(() => { const d = document.querySelector('[data-test="preview-strip-dismiss"]'); if (d) d.click(); })()`);

  const chip = () => ev(`(() => { const c = document.querySelector('[data-test="preview-scope-chip"]'); return c ? c.textContent.trim() : 'NO CHIP'; })()`);
  const toScope = async (test) => {
    await ev(`document.querySelector('[data-test="preview-scope-chip"]').click()`);
    await wait(600);
    await ev(`document.querySelector('[data-test="${test}"]').click()`);
    await wait(2500);
  };

  // --- B1 control first: the reader must see `Workbench` where it is still meant to be --------
  await toScope('preview-scope-app');
  await ev(`document.querySelector('[data-test="preview-scope-chip"]').click()`);
  await wait(600);
  const MENU_TEXT = `JSON.stringify((() => {
    const out = [];
    const chipEl = document.querySelector('[data-test="preview-scope-chip"]');
    if (chipEl) out.push(chipEl.textContent.trim());
    const menu = document.querySelector('[data-test="preview-scope-menu"]');
    if (menu) menu.querySelectorAll('[class*="ScopeHeading"], [data-test="preview-scope-app"], [data-test="preview-scope-board"]').forEach((el) => out.push(el.textContent.replace(/\\s+/g, ' ').trim()));
    const picker = document.querySelector('[data-test="board-picker"]');
    if (picker) picker.querySelectorAll('[class*="PickerHead"] > span').forEach((el) => out.push(el.textContent.trim()));
    return out;
  })())`;
  const appLabels = await json(MENU_TEXT);
  record('B1 control — in App mode the reader DOES see `Workbench` (the list heading), so an absence below is not a blind reader',
    appLabels.some((t) => /Workbench/.test(t)), appLabels.join(' | '));
  await ev(`document.querySelector('[data-test="preview-scope-chip"]').click()`);
  await wait(400);

  // --- onto the board, with three frames ----------------------------------------------------------
  await toScope('preview-scope-board');
  const onBoard = await json(`JSON.stringify(Array.from(document.querySelectorAll('[data-test^="board-frame-"]')).map((f) => f.getAttribute('data-test').replace('board-frame-', '')))`);
  if (onBoard.length === 0 || !PICKS.every((p) => onBoard.includes(p))) {
    await ev(`(() => { const b = document.querySelector('[data-test="board-empty-add"]') || document.querySelector('[data-test="board-add"]'); b.click(); })()`);
    await wait(700);
    for (const t of PICKS) {
      await ev(`(() => { const b = document.querySelector('[data-test="board-pick-${t}"]'); if (b && b.getAttribute('aria-selected') !== 'true') b.click(); })()`);
      await wait(500);
    }
    await ev(`document.querySelector('[data-test="board-add"]').click()`);
    await wait(600);
  }
  // Reset the arrangement to the fixture's left-to-right layout, so every run starts identical.
  await ev(`(() => { ${PROJECT}.instance.setMetaData('bench.board', { frames: [{ target: '${PRIMARY}', x: 0, y: 0 }, { target: '${SECONDARY}', x: 816, y: 0 }, { target: '${GHOST}', x: 1184, y: 0 }] }); return 'ok'; })()`);
  await wait(5000);

  // --- B1: every word in the chrome, with the board active --------------------------------------
  await ev(`document.querySelector('[data-test="preview-scope-chip"]').click()`);
  await wait(600);
  const menuLabels = await json(MENU_TEXT);
  await ev(`document.querySelector('[data-test="preview-scope-chip"]').click()`);
  await wait(400);
  await ev(`document.querySelector('[data-test="board-add"]').click()`);
  await wait(600);
  const pickerLabels = await json(MENU_TEXT);
  await shoot('b1-picker');
  await ev(`document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`);
  await wait(400);
  const b1 = Array.from(new Set([...menuLabels, ...pickerLabels]));
  record('B1 — with the board active, no chip, menu row, menu heading or picker heading says `Workbench`',
    b1.length >= 4 && !b1.some((t) => /Workbench/.test(t)), b1.join(' | '));

  // --- readers --------------------------------------------------------------------------------
  const READ = `JSON.stringify((() => {
    const s = document.querySelector('[data-test="board-surface"]');
    const doc = s && s.firstElementChild;
    const w = s && s.querySelector('webview');
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; };
    const frames = {};
    document.querySelectorAll('[data-test^="board-frame-"]').forEach((f) => {
      frames[f.getAttribute('data-test').replace('board-frame-', '')] = { box: r(f), cap: r(f.querySelector('[data-test^="board-caption-"]')), name: r(f.querySelector('[data-test^="board-open-"]')) };
    });
    return { surface: r(s), webview: r(w), transform: doc ? doc.style.transform : null, frames };
  })())`;
  /** What is under a point, as a person's press would find it: the board, a frame's content, or chrome. */
  const at = (x, y) => ev(`(() => { const el = document.elementFromPoint(${Math.round(x)}, ${Math.round(y)}); if (!el) return 'nothing'; if (el.tagName === 'WEBVIEW') return 'webview'; const t = el.closest('[data-test]'); return t ? t.getAttribute('data-test') : el.tagName; })()`);
  const viewport = async () => (await json(READ)).transform;

  let v = await json(READ);
  const P = v.frames[PRIMARY];
  const S = v.frames[SECONDARY];
  if (!P || !S || !v.surface) {
    record('three frames on the board', false, JSON.stringify(Object.keys(v.frames)));
    process.exit(2);
  }
  await shoot('01-three-frames');

  // --- B2: a content-sized frame is as tall as its content, and the rest is board -----------------
  // A point 120px under Primary's top edge: inside the old 768px slab, well past one button.
  const underPrimary = await at(P.box.l + 200, P.box.t + 120);
  record('B2 — 120px below a one-button frame\'s top edge is BOARD, not a white slab of the <webview>',
    underPrimary === 'board-surface', `hit ${underPrimary}; frame box ${Math.round(P.box.w)}×${Math.round(P.box.h)}`);
  const inPrimary = await at(P.box.l + 200, P.box.t + 20);
  record('B2 control — the same column 20px down IS the frame\'s content (the <webview>)', inPrimary === 'webview', `hit ${inPrimary}`);

  // --- B3: a gutter is board, and the board pans and zooms from it ------------------------------
  const gx = P.box.l + P.box.w + 24;
  const gy = P.box.t + 20;
  const gutterHit = await at(gx, gy);
  record('B3 — the gutter between two frames is board (hit test), not a <webview>', gutterHit === 'board-surface', `hit ${gutterHit} at ${Math.round(gx)},${Math.round(gy)}`);

  let before = await viewport();
  await ed.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(gx), y: Math.round(gy), deltaX: 0, deltaY: 40 });
  await wait(500);
  let after = await viewport();
  record('B3 🔴 — a wheel over the gutter PANS the board (performed, then the viewport read)', before !== after, `${before} → ${after}`);

  before = after;
  await ed.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: Math.round(gx), y: Math.round(gy), deltaX: 0, deltaY: -40, modifiers: 4 /* meta */ });
  await wait(500);
  after = await viewport();
  const scaleOf = (t) => Number((/scale\(([\d.]+)\)/.exec(String(t)) || [])[1]);
  record('B3 — ⌘+wheel over the gutter ZOOMS the board', scaleOf(before) !== scaleOf(after), `${before} → ${after}`);

  // Drag-pan from the gutter, the gesture Richard lost.
  v = await json(READ);
  const g2x = v.frames[PRIMARY].box.l + v.frames[PRIMARY].box.w + 24;
  const g2y = v.frames[PRIMARY].box.t + 10;
  before = await viewport();
  await mouse('mousePressed', g2x, g2y);
  for (let i = 1; i <= 10; i++) await mouse('mouseMoved', g2x + i * 6, g2y + i * 3);
  await mouse('mouseReleased', g2x + 60, g2y + 30);
  await wait(400);
  after = await viewport();
  record('B3 🔴 — pressing on the gutter and dragging PANS the board', before !== after, `${before} → ${after}`);

  // Back to the opening view for the drag arms: reopen the board (its viewport is component state).
  await toScope('preview-scope-app');
  await toScope('preview-scope-board');
  await wait(1500);

  // --- B6 + B5 + P93 AC5's control: drag the middle frame ----------------------------------------
  v = await json(READ);
  const mid = v.frames[SECONDARY];
  const from = { x: mid.cap.l + mid.cap.w - 40, y: mid.cap.t + mid.cap.h / 2 }; // on the caption meta, not the name
  const to = { x: from.x + 90, y: from.y + 70 };
  const t0 = await viewport();
  const stored0 = await json(`JSON.stringify((${PROJECT}.instance.getMetaData('bench.board') || { frames: [] }).frames.find((f) => f.target === '${SECONDARY}') || null)`);
  await mouse('mousePressed', from.x, from.y);
  for (let i = 1; i <= 30; i++) await mouse('mouseMoved', from.x + ((to.x - from.x) * i) / 30, from.y + ((to.y - from.y) * i) / 30);
  await wait(1500);
  const tMid = await viewport();
  const storedMid = await json(`JSON.stringify((${PROJECT}.instance.getMetaData('bench.board') || { frames: [] }).frames.find((f) => f.target === '${SECONDARY}') || null)`);
  const midView = await json(READ);
  await shoot('02-mid-drag');
  await mouse('mouseReleased', to.x, to.y);
  await wait(2500);
  const tAfter = await viewport();
  const storedAfter = await json(`JSON.stringify((${PROJECT}.instance.getMetaData('bench.board') || { frames: [] }).frames.find((f) => f.target === '${SECONDARY}') || null)`);

  record('B6 🔴 — the board\'s viewport is UNCHANGED before, during and after a frame drag', t0 === tMid && tMid === tAfter, `${t0} | ${tMid} | ${tAfter}`);
  const moved = midView.frames[SECONDARY];
  record('the frame moved under the pointer mid-drag (else B5/B6 grade a drag that never happened)',
    !!moved && Math.abs(moved.box.l - mid.box.l) > 40 && Math.abs(moved.box.t - mid.box.t) > 30, moved ? `${Math.round(mid.box.l)},${Math.round(mid.box.t)} → ${Math.round(moved.box.l)},${Math.round(moved.box.t)}` : 'gone');
  record('P93 AC5 re-run — the drag wrote NOTHING to `bench.board` while the button was down',
    !!stored0 && !!storedMid && stored0.x === storedMid.x && stored0.y === storedMid.y, `${JSON.stringify(stored0)} → ${JSON.stringify(storedMid)}`);
  record('P93 AC5 re-run — and the release committed once', !!storedAfter && (storedAfter.x !== storedMid.x || storedAfter.y !== storedMid.y), `→ ${JSON.stringify(storedAfter)}`);

  const dropped = (await json(READ)).frames[SECONDARY];
  await shoot('03-after-drop');
  // B5: the caption is on screen, over its own frame's left edge, directly above its top.
  const capOk = dropped && dropped.cap && Math.abs(dropped.cap.l - dropped.box.l) < 2 && dropped.cap.t + dropped.cap.h <= dropped.box.t + 1 && dropped.box.t - (dropped.cap.t + dropped.cap.h) < 8;
  record('B5 — after the drop the caption sits on its frame (left edges agree, directly above its top)', !!capOk,
    dropped ? `cap ${Math.round(dropped.cap.l)},${Math.round(dropped.cap.t + dropped.cap.h)} frame ${Math.round(dropped.box.l)},${Math.round(dropped.box.t)}` : 'gone');
  const newCentre = await at(dropped.box.l + dropped.box.w / 2, dropped.box.t + dropped.box.h / 2);
  record('B5 — the frame\'s content travelled: its new box is the <webview>', newCentre === 'webview', `hit ${newCentre}`);
  // The part of the OLD box the new one does not cover — located in BOARD coordinates and mapped
  // back through the viewport as it is NOW. A screen point remembered from before the drag is a
  // point on whatever the drag left there: on the control build the drag also panned the board
  // (B6), so a remembered point landed on the gutter and this arm passed on the defect.
  const zoomNow = scaleOf(await viewport()) || 1;
  const wvBefore = v.webview;
  const oldLocal = { x: (mid.box.l - wvBefore.l) / (scaleOf(t0) || 1) + 20, y: (mid.box.t - wvBefore.t) / (scaleOf(t0) || 1) + 20 };
  const wvNow = (await json(READ)).webview;
  const oldOnly = await at(wvNow.l + oldLocal.x * zoomNow, wvNow.t + oldLocal.y * zoomNow);
  record('B5 🔴 — the white slab did NOT stay behind: where the frame was is board again', oldOnly === 'board-surface', `hit ${oldOnly} at the old top-left`);

  // And the client agrees with the chrome: the frame's content is drawn where its border is.
  const sandbox = (await targets()).find((t) => t.type === 'webview' && String(t.url).includes('noodl-sandbox='));
  if (sandbox) {
    const guest = await connect(sandbox);
    const guestBoxes = JSON.parse(
      String(await evaluate(guest, `JSON.stringify(Array.from(document.querySelectorAll('#root div')).filter((d) => d.parentElement && d.parentElement.parentElement && d.parentElement.parentElement.parentElement && d.parentElement.parentElement.parentElement.id === 'root').map((d) => { const b = d.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }))`))
    );
    const doc = (await json(READ)).webview;
    const zoom = scaleOf(await viewport()) || 1;
    const now = await json(READ);
    const expect = PICKS.map((p) => {
      const b = now.frames[p].box;
      return [Math.round((b.l - doc.l) / zoom), Math.round((b.t - doc.t) / zoom)];
    });
    const agree = expect.every(([x, y]) => guestBoxes.some(([gx2, gy2]) => Math.abs(gx2 - x) <= 2 && Math.abs(gy2 - y) <= 2));
    record('B5 — every frame\'s content is drawn where the editor draws its border (client DOM vs chrome)', agree, `client ${JSON.stringify(guestBoxes)} chrome ${JSON.stringify(expect)}`);
    try {
      guest.close();
    } catch (error) {
      /* not a result */
    }
  } else {
    record('instrument: the board\'s client is listed', false, 'no sandbox webview');
  }

  // --- B4: a press that moves does not navigate; one that does not move does ----------------------
  v = await json(READ);
  const name = v.frames[PRIMARY].name;
  const nx = name.l + name.w / 2;
  const ny = name.t + name.h / 2;
  await mouse('mousePressed', nx, ny);
  for (let i = 1; i <= 12; i++) await mouse('mouseMoved', nx + i * 6, ny + i * 2);
  await mouse('mouseReleased', nx + 72, ny + 24);
  await wait(1500);
  const afterDragChip = await chip();
  record('B4 🔴 — a press on the caption NAME that moves past the threshold does NOT leave the board', /^Board/.test(afterDragChip), `chip reads "${afterDragChip}"`);

  v = await json(READ);
  const ghostName = v.frames[GHOST] && v.frames[GHOST].name;
  if (ghostName) {
    await mouse('mousePressed', ghostName.l + ghostName.w / 2, ghostName.t + ghostName.h / 2);
    await mouse('mouseReleased', ghostName.l + ghostName.w / 2, ghostName.t + ghostName.h / 2);
    await wait(2500);
  }
  const afterClickChip = await chip();
  record('B4 — the same run: a press that does NOT move opens that component on the Workbench', /Ghost Button/.test(afterClickChip), `chip reads "${afterClickChip}"`);

  // --- P93 AC7: the board re-shot in both themes, for Richard's ruling ---------------------------
  // 🔴 The theme is READ BACK and the two shots compared: TVW-008 once claimed two themes from two
  // identical files ([[a-theme-flip-does-not-apply-in-the-same-eval]]).
  await toScope('preview-scope-board');
  await ev(`(() => { ${PROJECT}.instance.setMetaData('bench.board', { frames: [{ target: '${PRIMARY}', x: 0, y: 0 }, { target: '${SECONDARY}', x: 816, y: 0 }, { target: '${GHOST}', x: 0, y: 120 }] }); return 'ok'; })()`);
  await wait(4000);
  const readTheme = () => ev(`(() => document.documentElement.getAttribute('data-theme') || document.body.getAttribute('data-theme') || document.body.className || 'unknown')()`);
  const setTheme = async (theme) => {
    await ev(`(() => { try { const mod = ${WREQ('./src/editor/src/utils/theme.ts')}; const api = mod && (mod.Theme || mod.default); if (api && typeof api.setTheme === 'function') { api.setTheme(${JSON.stringify(theme)}); return 'ok'; } } catch (error) { /* fall through */ } document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)}); return 'attribute'; })()`);
    await wait(2500);
    return readTheme();
  };
  const md5 = (file) => require('crypto').createHash('md5').update(fs.readFileSync(file)).digest('hex');
  const shotFile = (name) => path.join(SHOTS, `hlt008-${LABEL}-${name}.png`);
  const lightTheme = await setTheme('light');
  await shoot('ac7-light');
  const darkTheme = await setTheme('dark');
  await shoot('ac7-dark');
  record('P93 AC7 — the two theme shots are two DIFFERENT themes', lightTheme !== darkTheme && md5(shotFile('ac7-light')) !== md5(shotFile('ac7-dark')), `light="${lightTheme}" dark="${darkTheme}"`);

  const failed = arms.filter((a) => !a.ok);
  console.log(`\n${arms.length - failed.length}/${arms.length} arms green (${LABEL})`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
