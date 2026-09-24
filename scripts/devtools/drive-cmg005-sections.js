#!/usr/bin/env node
/**
 * P103 CMG-005 — every kind of style is a section, driven (AC2, AC3, AC4, AC6).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg005-sections.js [--dir <copy>] [--looks <copy>] [--shots <dir>]
 *
 * Every arm is a reading off the RUNNING editor: which sections the panel draws and in what
 * order, whether collapsing one hides only that one, and — the point of the task — whether
 * `revealStyle({ kind: 'token', name: '--ease-bounce' })` from a console, with the Components
 * panel showing and every section closed, ends with the Styles panel showing, Motion open and the
 * row inside the viewport and highlighted. The same for a Look and an old colour style, on a
 * second project that has them.
 *
 * 🔴 Drives COPIES (`--dir`, `--looks`): opening a project writes files into it.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const TOKENS_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Tokens');
const LOOKS_DIR = opt('looks', '/Users/richardosborne/vscode_projects/NodeGX test projects/CMG Drive Looks');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-103-the-composer-grows', 'shots'));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const ROUTE = WREQ('./src/editor/src/views/panels/StylesPanel/stylesPanelRoute.ts');
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/sidebarmodel.tsx')}.SidebarModel.instance`;

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
  await ev(
    `(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`
  );
  await ev(`(() => { ${WREQ('./src/editor/src/views/popuplayer.ts')}.default.instance.hidePopouts(true); return 'ok'; })()`);
  await wait(300);

  // ── 0. Open a copy ─────────────────────────────────────────────────────────
  async function openProject(dir) {
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
    if (String(routed) !== 'ok') return String(routed);
    const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
    if (path.resolve(String(already)) !== path.resolve(dir)) {
      await ev(`(() => { window.__cmgRouter.route({ to: 'projects' }); return 'ok'; })()`);
      await wait(1500);
      await ev(`(async () => {
        const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
        const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(dir)});
        window.__cmgRouter.route({ to: 'editor', project: p });
        return 'ok';
      })()`);
      await wait(10000);
    }
    const now = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
    return path.resolve(String(now)) === path.resolve(dir) ? 'ok' : String(now);
  }

  const opened = await openProject(TOKENS_DIR);
  record('the driven project is the tokens copy', opened === 'ok', opened);
  if (opened !== 'ok') return finish();

  // ── 1. The sections, in order, no Other ──────────────────────────────────
  await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(1200);
  const SECTIONS = `Array.from(document.querySelectorAll('[data-styles-panel] > [data-section-id]')).map((s) => ({ id: s.getAttribute('data-section-id'), open: s.getAttribute('data-section-open'), title: (s.querySelector('[class*="Title"]') || {}).textContent }))`;
  const sections = await readJson(`JSON.stringify(${SECTIONS})`);
  const ids = Array.isArray(sections) ? sections.map((s) => s.id) : [];
  record(
    'AC — seven top-level sections in order, no Other',
    JSON.stringify(ids) === JSON.stringify(['colours', 'type', 'spacing', 'borders', 'effects', 'motion', 'looks']),
    ids.join(' · ')
  );
  const titles = Array.isArray(sections) ? sections.map((s) => s.title) : [];
  record('the titles are plain words', !titles.some((t) => /other/i.test(String(t))), titles.join(' · '));
  const anyOther = await ev(`document.body.innerText.includes('Other tokens')`);
  record('AC1 — the string "Other tokens" is nowhere on screen', anyOther === false, String(anyOther));
  await shot(editor, 'cmg005-sections-open.png');

  // ── 2. Collapsing one hides that one only ────────────────────────────────
  const header = (id) => `(() => {
    const s = document.querySelector('[data-section-id="${id}"]'); if (!s) return 'NO SECTION';
    const h = s.querySelector('[class*="Header"]'); if (!h) return 'NO HEADER'; h.click(); return 'ok'; })()`;
  const openStates = async () => readJson(`JSON.stringify(${SECTIONS}.map((s) => s.id + ':' + s.open))`);
  // Start from every section open, so the arm reads a change and not a leftover.
  for (const id of ids) {
    const st = await readJson(`JSON.stringify(${SECTIONS}.find((s) => s.id === '${id}').open)`);
    if (st !== 'true') await ev(header(id));
  }
  await wait(600);
  const before = await openStates();
  await ev(header('type'));
  await wait(600);
  const after = await openStates();
  record(
    'AC2 — collapsing Type hides Type only',
    JSON.stringify(before) === JSON.stringify(ids.map((i) => `${i}:true`)) &&
      JSON.stringify(after) === JSON.stringify(ids.map((i) => `${i}:${i === 'type' ? 'false' : 'true'}`)),
    `before ${before} · after ${after}`
  );
  // The rows of a closed section are not on screen; those of an open one are.
  // 🔴 [[a-rect-is-not-visibility]]: a row inside a 0px-tall `overflow: hidden` Collapsible still
  // reports its own height. Read the element under the row's centre instead: it is the row (or a
  // child of it) only when the row is really painted.
  const rowVisible = (name) => `(() => { const r = document.querySelector('[data-style-row="${name}"]'); if (!r) return 'NO ROW'; const b = r.getBoundingClientRect(); if (!(b.height > 0)) return false; const at = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!at && r.contains(at); })()`;
  const textGone = await ev(rowVisible('--text-lg'));
  const spaceThere = await ev(rowVisible('--space-4'));
  record('… and its rows are gone while Spacing rows stay', textGone === false && spaceThere === true, `text-lg=${textGone} space-4=${spaceThere}`);

  /** Click the header only when the section is not already in the wanted state. */
  async function setSection(id, open) {
    const st = await readJson(`JSON.stringify(${SECTIONS}.find((s) => s.id === '${id}').open)`);
    if ((st === 'true') !== open) {
      await ev(header(id));
      await wait(150);
    }
  }

  // ── 3. AC3: reveal a token from the console, everything closed, Components showing ──
  for (const id of ids) await setSection(id, false);
  await wait(500);
  const allClosed = await openStates();
  await ev(`(() => { ${SIDEBAR}.switch('components'); return 'ok'; })()`);
  await wait(500);
  const activeBefore = await ev(`${SIDEBAR}.ActiveId`);
  record('setup — every section closed, Components showing', allClosed.every((s) => s.endsWith(':false')) && activeBefore === 'components', `${allClosed} · ${activeBefore}`);

  async function reveal(request, expectSection, shotName) {
    await ev(`(() => { ${ROUTE}.revealStyle(${JSON.stringify(request)}); return 'ok'; })()`);
    await wait(1100);
    const active = await ev(`${SIDEBAR}.ActiveId`);
    const state = await readJson(`JSON.stringify(${SECTIONS}.find((s) => s.id === '${expectSection}'))`);
    const row = await readJson(`JSON.stringify((() => {
      const rows = Array.from(document.querySelectorAll(${JSON.stringify(`[data-style-row="${request.name}"]`)}));
      const r = rows.find((x) => x.getBoundingClientRect().height > 0) || rows[0];
      if (!r) return { found: false };
      const b = r.getBoundingClientRect();
      const inView = b.top >= 0 && b.bottom <= window.innerHeight && b.height > 0;
      const revealed = r.getAttribute('data-revealed');
      const cs = getComputedStyle(r);
      return { found: true, top: Math.round(b.top), bottom: Math.round(b.bottom), inView, revealed, animation: cs.animationName, boxShadow: cs.boxShadow.slice(0, 60) };
    })())`);
    if (shotName) await shot(editor, shotName);
    const ok =
      active === 'styles' && state && state.open === 'true' && row.found && row.inView && row.revealed === 'true' && /styles-reveal/.test(String(row.animation));
    record(
      `AC — revealStyle(${request.kind} ${request.name}) → Styles showing, ${expectSection} open, row in view and highlighted`,
      ok,
      `active=${active} section=${state && state.open} row=${JSON.stringify(row)}`
    );
    // The highlight ends on its own.
    await wait(1600);
    const gone = await ev(`(() => { const r = document.querySelector(${JSON.stringify(`[data-style-row="${request.name}"]`)}); return r ? r.getAttribute('data-revealed') : 'NO ROW'; })()`);
    record('… and the highlight is gone ~1.6s later', gone === null, String(gone));
  }

  await reveal({ kind: 'token', name: '--ease-bounce' }, 'motion', 'cmg005-ac3-reveal-ease-bounce.png');
  // A colour token lives inside the closed "Design tokens (N)" list of Colours: both open.
  for (const id of ids) await setSection(id, false);
  await ev(`(() => { ${SIDEBAR}.switch('components'); return 'ok'; })()`);
  await wait(400);
  await reveal({ kind: 'token', name: '--primary' }, 'colours', null);

  // Unknown name: a toast, not a throw.
  const unknown = await ev(`(() => { try { ${ROUTE}.revealStyle({ kind: 'token', name: '--no-such-token' }); return 'ok'; } catch (e) { return 'THREW ' + e.message; } })()`);
  await wait(500);
  const toast = await ev(`document.body.innerText.includes('There is no token called --no-such-token')`);
  record('an unknown token says so in a toast and throws nothing', unknown === 'ok' && toast === true, `${unknown} toast=${toast}`);

  // ── 4. AC5: the open state survives a project switch (the same EditorSettings a restart reads) ──
  // What is stored must be what is on screen, section for section — including the one the reveal
  // opened and the ones the header clicks closed.
  const remembered = await readJson(`JSON.stringify(${WREQ('./src/editor/src/utils/editorsettings.ts')}.EditorSettings.instance.get('styles.sections'))`);
  const onScreen = await readJson(`JSON.stringify(Object.fromEntries(${SECTIONS}.map((s) => [s.id, s.open === 'true'])))`);
  record(
    'AC5 — the open state is written to EditorSettings (what a restart reads back), and equals the screen',
    remembered && onScreen && JSON.stringify(remembered) === JSON.stringify(onScreen) && remembered.colours === true,
    `stored ${JSON.stringify(remembered)} · screen ${JSON.stringify(onScreen)}`
  );

  // ── 5. AC4: a Look and a colour style, on the project that has them ──────
  const opened2 = await openProject(LOOKS_DIR);
  record('the second project (Looks + colour styles) opened', opened2 === 'ok', opened2);
  if (opened2 === 'ok') {
    await ev(`(() => { ${SIDEBAR}.switch('components'); return 'ok'; })()`);
    await wait(400);
    await reveal({ kind: 'look', name: 'Drive Look', typename: 'Text' }, 'looks', 'cmg005-ac4-reveal-look.png');
    await ev(`(() => { ${SIDEBAR}.switch('components'); return 'ok'; })()`);
    await wait(400);
    await reveal({ kind: 'colourStyle', name: 'Primary Dark' }, 'colours', null);
  }

  // ── 6. AC6: another panel that uses CollapsableSection still opens and closes ──
  await ev(`(() => { ${SIDEBAR}.switch('settings'); return 'ok'; })()`);
  await wait(1200);
  // Three evals, not one: the attribute follows a React re-render, which lands after the click's
  // task, so a read in the same eval as the click reads the old state.
  const SETTINGS_FIRST = `(() => {
    const panel = document.querySelector('[data-panel-id="settings"]'); if (!panel) return null;
    return Array.from(panel.querySelectorAll('[data-section-open]')).find((s) => s.getBoundingClientRect().height > 0) || null;
  })()`;
  const settingsRead = () => ev(`(() => { const s = ${SETTINGS_FIRST}; return s ? s.getAttribute('data-section-open') : 'NO SECTION'; })()`);
  const settingsClick = () => ev(`(() => { const s = ${SETTINGS_FIRST}; if (!s) return 'NO SECTION'; const h = s.querySelector(':scope > [class*="Header"]'); if (!h) return 'NO HEADER'; h.click(); return 'ok'; })()`);
  const sBefore = await settingsRead();
  await settingsClick();
  await wait(500);
  const sAfter = await settingsRead();
  await settingsClick();
  await wait(500);
  const sBack = await settingsRead();
  const settingsSections = { before: sBefore, after: sAfter, back: sBack, count: sBefore === 'NO SECTION' ? 0 : 1 };
  record(
    'AC6 — a Settings section (uncontrolled CollapsableSection) toggles as before',
    settingsSections && settingsSections.count > 0 && settingsSections.before !== settingsSections.after && settingsSections.back === settingsSections.before,
    JSON.stringify(settingsSections)
  );

  await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
