#!/usr/bin/env node
/**
 * P103 CMG-001 — the composer fits its window, driven (AC1–AC5, and the other clamp caller).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg001-composer-fits.js [--dir <copy>] [--shots <dir>]
 *
 * Every arm is a reading off the RUNNING editor: which composers draw a Light/Dark switch, and
 * — Richard's drive — with the Styles panel scrolled so the last Motion row sits at the bottom of
 * the window, open its composer, press Show CSS, and read `getBoundingClientRect()` on the popout,
 * on Apply and on the `<pre>`, plus `document.elementFromPoint` at Apply's centre
 * ([[a-rendered-surface-can-be-behind-a-blocker]]). Then the tallest content (a shadow with three
 * layers), a 700px-high window, and a slider dragged across its range with the popout mid-screen,
 * sampling the popout's top-left every frame.
 *
 * 🔴 Drives a COPY (`--dir`): opening a project writes files into it.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Tokens');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'shots'));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/sidebarmodel.tsx')}.SidebarModel.instance`;
const POPUP = `${WREQ('./src/editor/src/views/popuplayer.ts')}.default.instance`;

const CLICK = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'NO ' + ${JSON.stringify(selector)}; el.click(); return 'ok'; })()`;
const CLICK_TEXT = (text, within = '[data-token-composer]') => `(() => {
  const root = document.querySelector(${JSON.stringify(within)}) || document.body;
  const b = Array.from(root.querySelectorAll('button')).find((x) => x.textContent.trim() === ${JSON.stringify(text)});
  if (!b) return 'NO BUTTON ' + ${JSON.stringify(text)};
  b.click();
  return 'ok';
})()`;
const SET_INPUT = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return 'NO INPUT';
  const proto = Object.getPrototypeOf(el);
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, ${JSON.stringify(String(value))});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`;

/** Everything AC2/AC4 read, in one eval. */
const GEOMETRY = `JSON.stringify((() => {
  const popout = document.querySelector('.popup-layer-popout');
  if (!popout) return { error: 'NO POPOUT' };
  const composer = popout.querySelector('[data-token-composer]');
  const apply = Array.from(popout.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Apply');
  const pre = popout.querySelector('[data-show-css]');
  const scroll = composer ? composer.firstElementChild : null;
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), height: Math.round(b.height) }; };
  const a = apply ? apply.getBoundingClientRect() : null;
  const under = a ? document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2) : null;
  const scrollRect = scroll ? scroll.getBoundingClientRect() : null;
  const preRect = pre ? pre.getBoundingClientRect() : null;
  return {
    window: { w: window.innerWidth, h: window.innerHeight },
    popout: r(popout),
    apply: r(apply),
    applyUnderItsCentre: !!(apply && under && apply.contains(under)),
    underTag: under ? under.tagName + (under.textContent || '').trim().slice(0, 12) : null,
    pre: r(pre),
    preInsideScroll: !!(preRect && scrollRect && preRect.top >= scrollRect.top - 1 && preRect.bottom <= scrollRect.bottom + 1),
    preInsideWindow: !!(preRect && preRect.top >= 0 && preRect.bottom <= window.innerHeight),
    hasLightDark: popout.querySelectorAll('[data-preview-bar] button[aria-pressed]').length,
    holdButtons: Array.from(popout.querySelectorAll('button')).filter((b) => /Hold to compare|Saved value/.test(b.textContent)).length
  };
})())`;

async function shot(editor, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
  console.log(`      shot ${name}`);
}

async function main() {
  const editor = await connect(await appTarget('editor'));
  const ev = (expr) => evaluate(editor, expr);
  const readJson = async (expr) => {
    const raw = await ev(expr);
    try {
      return JSON.parse(raw);
    } catch {
      return { error: 'UNPARSEABLE', raw: String(raw).slice(0, 400) };
    }
  };
  const finish = () => {
    const failed = arms.filter((a) => a.ok === false);
    console.log(`\n${failed.length ? 'FAILED' : 'PASSED'} — ${arms.length - failed.length}/${arms.length} graded arms`);
    process.exit(failed.length ? 1 : 0);
  };

  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);
  const closeAll = () => ev(`(() => { ${POPUP}.hidePopouts(true); return 'ok'; })()`);
  await closeAll();
  await wait(300);

  // ── 0. Open the copy ─────────────────────────────────────────────────────
  const routed = await ev(`(() => {
    if (window.__cmgRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__cmgRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__cmgRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (String(routed) !== 'ok') {
    record('the editor router was found', false, String(routed));
    return finish();
  }
  const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    await ev(`(() => { window.__cmgRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__cmgRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(10000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  // ── 1. The Styles panel, every section open ──────────────────────────────
  await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(800);
  const SECTIONS = `Array.from(document.querySelectorAll('[data-styles-panel] > [data-section-id]'))`;
  for (const id of ['type', 'effects', 'motion']) {
    await ev(`(() => { const s = ${SECTIONS}.find((x) => x.getAttribute('data-section-id') === '${id}'); if (s && s.getAttribute('data-section-open') !== 'true') s.querySelector('[class*="Header"]').click(); return 'ok'; })()`);
    await wait(500);
  }
  await wait(400);

  /** Open the composer on a row, with the row placed where `where` says in the window. */
  async function openComposer(tokenName, where) {
    await closeAll();
    await wait(200);
    const placed = await ev(`(() => {
      const b = document.querySelector('[aria-label="Open composer for ${tokenName}"]');
      if (!b) return 'NO ROW';
      const row = b.closest('[data-style-row]');
      row.scrollIntoView({ block: ${JSON.stringify(where)} });
      return 'ok';
    })()`);
    if (placed !== 'ok') return placed;
    await wait(300);
    const rowBottom = await ev(`(() => { const b = document.querySelector('[aria-label="Open composer for ${tokenName}"]'); const r = b.closest('[data-style-row]').getBoundingClientRect(); return Math.round(r.bottom) + '/' + window.innerHeight; })()`);
    await ev(`(() => { document.querySelector('[aria-label="Open composer for ${tokenName}"]').click(); return 'ok'; })()`);
    await wait(700);
    return rowBottom;
  }

  // ── AC1: no Light/Dark on motion; unchanged on the other three ───────────
  const grounds = {};
  for (const [name, file] of [
    ['--ease-bounce', 'cmg001-ac1-easing.png'],
    ['--duration-300', 'cmg001-ac1-duration.png'],
    ['--shadow-lg', 'cmg001-ac1-shadow.png'],
    ['--gradient-brand', 'cmg001-ac1-gradient.png'],
    ['--font-sans', 'cmg001-ac1-font.png']
  ]) {
    await openComposer(name, 'center');
    const g = await readJson(GEOMETRY);
    grounds[name] = g;
    await shot(editor, file);
  }
  record(
    'AC1 — easing and duration draw no Light/Dark switch and no compare button before a change',
    grounds['--ease-bounce'].hasLightDark === 0 && grounds['--duration-300'].hasLightDark === 0 && grounds['--ease-bounce'].holdButtons === 0 && grounds['--duration-300'].holdButtons === 0,
    `easing ${grounds['--ease-bounce'].hasLightDark}/${grounds['--ease-bounce'].holdButtons} · duration ${grounds['--duration-300'].hasLightDark}/${grounds['--duration-300'].holdButtons}`
  );
  record(
    'AC1 — shadow, gradient and font keep the Light/Dark switch and the compare button',
    ['--shadow-lg', '--gradient-brand', '--font-sans'].every((n) => grounds[n].hasLightDark === 2 && grounds[n].holdButtons === 1),
    ['--shadow-lg', '--gradient-brand', '--font-sans'].map((n) => `${n} ${grounds[n].hasLightDark}/${grounds[n].holdButtons}`).join(' · ')
  );
  // On motion the compare button appears in the preview once there is a change.
  // The easing composer's controls are the four curve numbers, not a slider.
  await openComposer('--ease-bounce', 'center');
  await ev(SET_INPUT('[data-token-composer] input[type="number"]', 0.5));
  await wait(300);
  const afterChange = await readJson(GEOMETRY);
  record('AC1 — on easing, Hold to compare appears inside the preview once the draft differs', afterChange.holdButtons === 1 && afterChange.hasLightDark === 0, `hold=${afterChange.holdButtons} lightdark=${afterChange.hasLightDark}`);

  // ── AC2: Richard's drive — the last Motion row at the bottom of the window ──
  const rowBottom = await openComposer('--ease-bounce', 'end');
  const before = await readJson(GEOMETRY);
  await ev(CLICK_TEXT('Show CSS'));
  await wait(600);
  const after = await readJson(GEOMETRY);
  await shot(editor, 'cmg001-ac2-show-css-at-bottom.png');
  record(
    'AC2 — easing composer from the bottom row, Show CSS: popout bottom ≤ window, Apply inside, Apply IS the element under its centre',
    after.popout && after.popout.bottom <= after.window.h && after.apply && after.apply.bottom <= after.window.h && after.apply.top >= 0 && after.applyUnderItsCentre,
    `row bottom ${rowBottom} · before ${JSON.stringify(before.popout)} · after ${JSON.stringify(after.popout)} apply ${JSON.stringify(after.apply)} under=${after.underTag}`
  );
  record('AC4 — the <pre> is inside the scroll area and the window', after.pre && after.preInsideScroll && after.preInsideWindow, `pre ${JSON.stringify(after.pre)} inScroll=${after.preInsideScroll} inWindow=${after.preInsideWindow}`);
  record('… and the popout moved UP, not sideways: same left, smaller top', before.popout && after.popout && after.popout.left === before.popout.left && after.popout.top < before.popout.top, `left ${before.popout && before.popout.left}→${after.popout && after.popout.left} top ${before.popout && before.popout.top}→${after.popout && after.popout.top}`);

  // ── AC3: the tallest content — a shadow with three layers ────────────────
  await openComposer('--shadow-lg', 'end');
  await ev(CLICK_TEXT('+ Add layer'));
  await wait(300);
  const layers = await ev(`(() => document.querySelectorAll('[data-token-composer] [data-layer]').length || (document.querySelector('[data-token-composer]').textContent.match(/Layer \\d/g) || []).length)()`);
  await ev(CLICK_TEXT('Show CSS'));
  await wait(600);
  const tall = await readJson(GEOMETRY);
  await shot(editor, 'cmg001-ac3-shadow-three-layers.png');
  record(
    'AC3 — shadow composer with three layers + Show CSS: popout on screen, Apply under its own centre, CSS in view',
    tall.popout && tall.popout.bottom <= tall.window.h && tall.popout.top >= 0 && tall.applyUnderItsCentre && tall.preInsideScroll && tall.preInsideWindow,
    `layers=${layers} popout ${JSON.stringify(tall.popout)} apply=${tall.applyUnderItsCentre} pre=${tall.preInsideScroll}/${tall.preInsideWindow}`
  );

  // A 700px-high window. The Browser domain is not on a page session here, so the viewport is
  // emulated: `innerHeight` reads 700 and the window's `resize` fires, which is what the popup
  // layer reads its height from.
  let resized = false;
  const winW = await ev('window.innerWidth');
  try {
    await editor.send('Emulation.setDeviceMetricsOverride', { width: Number(winW), height: 700, deviceScaleFactor: 0, mobile: false });
    await wait(1200);
    resized = Number(await ev('window.innerHeight')) <= 700;
  } catch (e) {
    resized = false;
  }
  if (resized) {
    await openComposer('--shadow-lg', 'end');
    await ev(CLICK_TEXT('+ Add layer'));
    await wait(200);
    await ev(CLICK_TEXT('Show CSS'));
    await wait(600);
    const small = await readJson(GEOMETRY);
    await shot(editor, 'cmg001-ac3-700px-window.png');
    record(
      'AC3 — in a 700px-high window the same composer fits: popout inside, Apply under its centre, CSS in view',
      small.window.h <= 700 && small.popout && small.popout.bottom <= small.window.h && small.popout.top >= 0 && small.applyUnderItsCentre && small.preInsideWindow,
      `window ${JSON.stringify(small.window)} popout ${JSON.stringify(small.popout)} apply=${small.applyUnderItsCentre} pre=${small.preInsideWindow}`
    );
    await editor.send('Emulation.clearDeviceMetricsOverride').catch(() => {});
    await wait(1200);
  } else {
    record('AC3 — 700px-high window', null, 'viewport emulation not available on this session; not graded');
  }

  // ── AC5: no jump while sliding, popout mid-screen ───────────────────────
  await openComposer('--shadow-lg', 'center');
  await ev(`(() => {
    window.__cmgSamples = [];
    const tick = () => {
      const p = document.querySelector('.popup-layer-popout');
      if (p) { const r = p.getBoundingClientRect(); window.__cmgSamples.push(Math.round(r.left) + ',' + Math.round(r.top)); }
      if (window.__cmgSamples.length < 400) window.__cmgSampling = requestAnimationFrame(tick);
    };
    window.__cmgSampling = requestAnimationFrame(tick);
    return 'ok';
  })()`);
  const rangeInfo = await readJson(`JSON.stringify((() => { const r = document.querySelector('[data-token-composer] input[type="range"]'); return r ? { min: +r.min, max: +r.max, step: +r.step || 1 } : null; })())`);
  if (rangeInfo) {
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const v = rangeInfo.min + ((rangeInfo.max - rangeInfo.min) * i) / steps;
      await ev(SET_INPUT('[data-token-composer] input[type="range"]', v));
      await wait(40);
    }
  }
  await wait(300);
  const samples = await readJson(`JSON.stringify((() => { cancelAnimationFrame(window.__cmgSampling); return { n: window.__cmgSamples.length, distinct: Array.from(new Set(window.__cmgSamples)) }; })())`);
  record('AC5 — dragging a slider across its whole range: the popout\'s top-left never moves (sampled per frame)', rangeInfo && samples.n > 20 && samples.distinct.length === 1, `frames=${samples.n} positions=${JSON.stringify(samples.distinct)}`);
  await closeAll();

  // ── The other clamp caller: the list editor grows when a row is added ─────
  // Not driven here: it needs a node with a list port selected in the property panel. The branch
  // is the same code path (`_clampPopout`), graded by the clamp spec; recorded as ungraded so the
  // task file says so.
  record('ListValueEditor (also disableDynamicPositioning) gets the clamp', null, 'same ResizeObserver branch; not driven in this script');

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
