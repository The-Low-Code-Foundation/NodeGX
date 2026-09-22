#!/usr/bin/env node
/**
 * P94 STY-005 AC7 — the Styles panel, read off the rendered elements, in both themes.
 *
 * AC1–AC6 are green in `tests-unit/sty-005`, and every one of those gates is either a STATIC read
 * of a source file or a `renderToStaticMarkup` of one component with the menu STUBBED. None of them
 * has seen the panel. This surface has already been green-in-every-assertion and wrong on screen
 * twice this phase (the gutter, then the rename), so:
 *
 *  1. **The rail.** The button must exist, be hittable (`elementFromPoint` returns it or a child —
 *     [[a-rendered-surface-can-be-behind-a-blocker]]), and sit between Components and Search **in
 *     the order the rail actually draws them**, not in the order `router.setup.ts` declares.
 *  2. **The sections.** All four, in order, read off the rendered headings.
 *  3. **The rows.** Every row's badge, name and usage figure read off the DOM — and the `⋯`
 *     `elementFromPoint`-tested on a real row, which is the ONLY thing that can tell "visible" from
 *     "rendered under something". A `visibility`/`opacity` audit of the computed styles beside it,
 *     because R6 is a statement about what a person can see.
 *  4. **Both layers really are in one list** (R2) — a Style row and a Token row under one heading.
 *  5. **Both themes**, with the shots AC8 closes on.
 *
 * 🔴 **CONTROL, and it is the one that matters.** "No row is hover-hidden" is trivially true of a
 * panel with no rows in it. Every count assertion below is preceded by a reading that says how many
 * rows were found, and the run FAILS if any section drew none — an absence needs a known-firing
 * signal beside it ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 *
 * Usage:
 *   node scripts/devtools/drive-sty005-panel.js [--dir <project>] [--shots <dir>] [--json <file>]
 *
 * Exits 0 when every graded arm passed.
 */
const fs = require('fs');
const path = require('path');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

/**
 * 🔴 A COPY, never a project Richard might open. `cn027-drive` was chosen by reading every styles
 * sidecar on this machine: it is the only one with all three populated at once — 9 colour styles,
 * 2 text styles, 1 Look — so a run against it can tell "the section is empty" from "the section
 * is broken". Most projects have zero of at least one.
 */
const PROJECT_DIR = opt('dir', '/Users/richardosborne/vscode_projects/NodeGX test projects/STY-005 Panel Drive');
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-94-one-styles-panel', 'shots'));
const JSON_OUT = opt('json', null);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/index.ts')}.SidebarModel`;

/**
 * The rail, read off the DOM.
 *
 * `SideNavigationButton` stamps `data-test="<id>-panel"`, so the rail's own order is the document
 * order of those elements — which is what a person sees, and is NOT necessarily the order
 * `router.setup.ts` declares (the model sorts, and a sort is a thing that can be wrong).
 */
const RAIL = `JSON.stringify((() => {
  const buttons = Array.from(document.querySelectorAll('[data-test$="-panel"]'));
  const read = (el) => {
    const id = el.getAttribute('data-test').replace(/-panel$/, '');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // 🔴 The hit test, not the rect. A button with a box can still be under something.
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      id,
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
      visibility: cs.visibility,
      opacity: cs.opacity,
      reachable: !!hit && (hit === el || el.contains(hit) || hit.contains(el))
    };
  };
  return { order: buttons.map(read) };
})())`;

/**
 * The panel, read off the rendered elements.
 *
 * Sections come from `CollapsableSection`'s heading text; rows from the `data-style-row` /
 * `data-style-layer` stamps `StyleRow` writes. Each row's `⋯` is hit-tested where it is drawn.
 */
/**
 * 🔴 STRIP THE DEV-SERVER OVERLAY BEFORE ANY HIT TEST.
 *
 * `webpack-dev-server-client-overlay` is a full-window iframe at `z-index: 2147483647` that the
 * dev server injects whenever ANY file in the package fails to compile — including a file nobody
 * on this task has touched. Measured mid-run: a peer's open edit to `VisualCanvas/PreviewChrome.tsx`
 * went red, the overlay appeared, and `elementFromPoint` began returning `IFRAME` for every point
 * on screen — the rail button included, which had been hittable in the run ten minutes earlier.
 *
 * That is an INSTRUMENT fault reading exactly like the product defect this drive exists to catch
 * ([[a-rendered-surface-can-be-behind-a-blocker]] inverted: a real blocker that is not the app's).
 * Reporting it as "the ⋯ is unreachable" would have been a false finding about a peer's typo.
 * The overlay is removed and its presence REPORTED, so a run never silently launders one into
 * the other.
 */
const STRIP_OVERLAY = `(() => {
  const f = document.getElementById('webpack-dev-server-client-overlay');
  if (!f) return 'none';
  let why = '';
  try { why = (f.contentDocument.body.innerText || '').split('\\n').slice(0, 3).join(' / '); } catch (e) { why = 'unreadable'; }
  f.remove();
  return 'REMOVED: ' + why.slice(0, 200);
})()`;

const PANEL = `JSON.stringify((() => {
  const panel = document.querySelector('[data-panel-id="styles"]');
  if (!panel) return { error: 'NO STYLES PANEL IN THE DOM' };

  // 🔴 A RECT IS NOT VISIBILITY, and this drive learned it the expensive way.
  //
  // A collapsed CollapsableSection is 36px tall with overflow:hidden, and the browser still lays
  // its children out and still reports each one a full-size getBoundingClientRect at a coordinate
  // inside the viewport. The first version of this reader called those rows visible, hit-tested
  // them, got the section's own title back, and reported 8 unreachable menus — a defect in the
  // product that did not exist, about rows nobody could see.
  //
  // The hit test IS the visibility test: a row is on screen iff what is painted at its centre is
  // the row. Everything else is clipped, scrolled away or behind something, and in all three cases
  // a person is not looking at it.
  const hitsSelf = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
    const hit = document.elementFromPoint(cx, cy);
    return !!hit && (hit === el || el.contains(hit));
  };

  const visible = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.01 && r.width > 0 && r.height > 0;
  };

  // The section headings, in document order. Titles are whatever CollapsableSection draws, so
  // they are read rather than matched against a list the drive carries.
  //
  // 🔴 TOP-LEVEL only — a section with no section ancestor. Sub-groups nest now (the colour
  // tokens inside Colours, the token groups inside Other tokens), and a flat
  // querySelectorAll('section') interleaved them with the four this criterion is about.
  const sectionTitle = (s) => {
    const h = s.querySelector('[class*="Title"], h1, h2, h3, h4');
    return h ? h.textContent.trim() : null;
  };
  const allSections = Array.from(panel.querySelectorAll('section'));
  const headings = allSections
    .filter((s) => s.parentElement.closest('section') === null)
    .map(sectionTitle)
    .filter(Boolean);
  const subHeadings = allSections
    .filter((s) => s.parentElement.closest('section') !== null)
    .map(sectionTitle)
    .filter(Boolean);

  const rows = Array.from(panel.querySelectorAll('[data-style-row]')).map((el) => {
    const name = el.getAttribute('data-style-row');
    const layer = el.getAttribute('data-style-layer');
    const r = el.getBoundingClientRect();

    const menu = panel.querySelector('[data-test="style-row-menu-' + CSS.escape(name) + '"]');
    let menuRead = null;
    if (menu) {
      const mr = menu.getBoundingClientRect();
      const cs = getComputedStyle(menu);
      const hit = mr.width && mr.height
        ? document.elementFromPoint(mr.left + mr.width / 2, mr.top + mr.height / 2)
        : null;
      menuRead = {
        w: Math.round(mr.width),
        h: Math.round(mr.height),
        visibility: cs.visibility,
        opacity: cs.opacity,
        // 🔴 The whole of R6 in one boolean: is the thing a person would click actually there?
        reachable: !!hit && (hit === menu || menu.contains(hit) || hit.contains(menu)),
        hitTag: hit ? hit.tagName + '.' + (hit.className || '').toString().slice(0, 40) : null
      };
    }

    const usageEl = panel.querySelector('[data-test="style-row-usage-' + CSS.escape(name) + '"]');
    const badgeEl = panel.querySelector('[data-test="style-row-badge-' + CSS.escape(name) + '"]');

    return {
      name,
      layer,
      onScreen: visible(el) && hitsSelf(el),
      badge: badgeEl ? badgeEl.textContent.trim() : null,
      usage: usageEl ? usageEl.textContent.trim() : null,
      menu: menuRead
    };
  });

  // The control for every "nothing is hover-hidden" claim below.
  const hoverOnly = Array.from(panel.querySelectorAll('.variants-item-icon')).length;

  return {
    theme: document.documentElement.getAttribute('data-theme'),
    headings,
    subHeadings,
    rows,
    hoverOnly,
    addButtons: Array.from(panel.querySelectorAll('[data-test^="add-"]')).map((b) => ({
      id: b.getAttribute('data-test'),
      text: b.textContent.trim(),
      onScreen: visible(b)
    }))
  };
})())`;

async function main() {
  const target = await appTarget('editor');
  const editor = await connect(target);
  const ev = (expr) => evaluate(editor, expr);
  const readJson = async (expr) => {
    const raw = await ev(expr);
    try {
      return JSON.parse(raw);
    } catch {
      return { error: 'UNPARSEABLE', raw: String(raw).slice(0, 400) };
    }
  };

  // 🔴 The window is `document.hidden`, so `requestAnimationFrame` never fires and anything that
  // waits on a frame never settles. Both of these, on THIS connection, before anything is read.
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const rafFires = await ev(
    `new Promise((res) => { const t = setTimeout(() => res('NO RAF'), 1500); requestAnimationFrame(() => { clearTimeout(t); res('raf'); }); })`
  );
  record('rAF fires — the page is live enough to trust a red', rafFires === 'raf', String(rafFires));
  if (rafFires !== 'raf') return finish(editor);

  // `window.__wreq` does not exist until it is pushed.
  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);

  // ── Open the project (a COPY, see PROJECT_DIR) ────────────────────────────
  const open = await ev(`(() => {
    if (window.__styRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__styRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__styRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (open !== 'ok') {
    record('the editor router was found', false, open);
    return finish(editor);
  }

  const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await ev(`(() => { window.__styRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__styRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(8000);
  }
  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record('the driven project is the copy this drive names', path.resolve(String(dir)) === path.resolve(PROJECT_DIR), String(dir));

  // What the project actually holds, from the MODEL — so "the section drew 9 rows" can be checked
  // against a number that came from somewhere other than the surface under test.
  const expected = await readJson(`JSON.stringify((() => {
    const { StylesModel } = ${WREQ('./src/editor/src/models/StylesModel.ts')};
    const m = new StylesModel();
    const out = {
      colours: m.getStyles('colors').map((s) => s.name),
      texts: m.getStyles('text').map((s) => s.name),
      looks: (${PROJECT}.instance.variants || []).map((v) => v.name)
    };
    m.dispose();
    return out;
  })())`);
  console.log(`model says: ${JSON.stringify(expected)}`);

  // ═══ 1. THE RAIL ═══
  const overlay = await ev(STRIP_OVERLAY);
  record(
    'no dev-server error overlay is covering the window',
    overlay === 'none',
    String(overlay)
  );

  const rail = await readJson(RAIL);
  const ids = (rail.order || []).map((b) => b.id);
  record('the rail was read at all — the control for every ordering claim', ids.length > 5, `${ids.length} buttons: ${ids.join(',')}`);

  const iStyles = ids.indexOf('styles');
  const iComponents = ids.indexOf('components');
  const iSearch = ids.indexOf('search');
  record('the Styles button is IN the rail a person sees', iStyles >= 0, `index ${iStyles}`);
  record(
    'it is drawn between Components and Search — R5, in the rail’s OWN order',
    iComponents >= 0 && iSearch >= 0 && iStyles > iComponents && iStyles < iSearch,
    `components@${iComponents} styles@${iStyles} search@${iSearch}`
  );

  const stylesBtn = (rail.order || []).find((b) => b.id === 'styles');
  record(
    'the Styles button is hittable, not merely present',
    !!stylesBtn && stylesBtn.reachable && stylesBtn.visibility === 'visible',
    stylesBtn ? JSON.stringify(stylesBtn) : 'no button'
  );

  // Open it the way a person does.
  await ev(`(() => { const b = document.querySelector('[data-test="styles-panel"]'); if (!b) return 'NO BUTTON'; b.click(); return 'ok'; })()`);
  await wait(2500);
  const activeId = await ev(`(() => ${SIDEBAR}.instance.ActiveId)()`);
  record('clicking the rail button opens the Styles panel', activeId === 'styles', String(activeId));
  if (activeId !== 'styles') return finish(editor);

  // ═══ 2-4. THE PANEL ═══
  await ev(STRIP_OVERLAY);
  const panel = await readJson(PANEL);
  if (panel.error) {
    record('the panel rendered', false, panel.error);
    return finish(editor);
  }
  console.log(JSON.stringify(panel, null, 1));

  record(
    // P99 HLT-007 (a), 2026-09-22: Richard ruled *Text styles* removed, so four became three.
    'the three sections are drawn, in order, and NOTHING ELSE is a peer of them — AC2',
    JSON.stringify(panel.headings) === JSON.stringify(['Colours', 'Looks', 'Other tokens']),
    panel.headings.join(' | ')
  );
  // 🔴 The token groups must be BELOW one of those four, never beside them. Read off the rendered
  // tree the first time, they were peers — `Colours | Text styles | Looks | Spacing | Borders |
  // Effects | Animation` — with nothing saying four of the seven were a different layer.
  record(
    'the token groups are nested under a heading, not peers of the sections',
    ['Spacing', 'Borders', 'Effects', 'Animation'].every((g) => !panel.headings.includes(g)),
    `sub-headings: ${panel.subHeadings.join(' | ')}`
  );
  // And the 88-row colour token list opens CLOSED, so the styles are what the panel opens on.
  record(
    'the colour tokens are behind a closed sub-heading that names how many',
    panel.subHeadings.some((h) => /^Design tokens \(\d+\)$/.test(h)),
    panel.subHeadings.join(' | ')
  );

  // 🔴 THE CONTROL. Everything below is an absence claim about rows; with no rows they are all
  // vacuously true.
  record('the panel drew rows at all', panel.rows.length > 0, `${panel.rows.length} rows`);
  if (!panel.rows.length) return finish(editor);

  const byLayer = (l) => panel.rows.filter((r) => r.layer === l);
  record(
    'the project’s colour styles all reached the panel',
    expected.colours.every((n) => panel.rows.some((r) => r.name === n)),
    `model ${expected.colours.length}, drawn ${byLayer('Style').length} Style rows`
  );
  record(
    'the project’s Look reached the panel',
    expected.looks.every((n) => panel.rows.some((r) => r.name === n && r.layer === 'Look')),
    `model looks: ${expected.looks.join(',') || 'none'}`
  );
  // P99 HLT-007 (a): the project STILL holds text styles — the removal hides them from this panel,
  // it does not delete them. The first arm is the known-firing signal the second one needs: with
  // no text styles in the model, "none drawn" would be true of the old panel too.
  record('CONTROL the project still holds text styles (HLT-007 a)', expected.texts.length > 0, expected.texts.join(', '));
  record(
    'no text style is drawn as a row any more — HLT-007 (a)',
    expected.texts.length > 0 && !panel.rows.some((r) => expected.texts.includes(r.name)),
    panel.rows.filter((r) => expected.texts.includes(r.name)).map((r) => r.name).join(', ') || 'none drawn'
  );

  // R2: both layers in ONE list. A Style row and a Token row, both drawn.
  record(
    'both storage layers are in one list, each badged — R2',
    byLayer('Style').length > 0 && byLayer('Token').length > 0,
    `${byLayer('Style').length} Style, ${byLayer('Token').length} Token, ${byLayer('Look').length} Look`
  );
  record(
    'every row’s badge says its layer — AC3',
    panel.rows.every((r) => r.badge === r.layer),
    panel.rows.filter((r) => r.badge !== r.layer).map((r) => `${r.name}:${r.badge}`).join(',') || 'all match'
  );

  const counted = panel.rows.filter((r) => r.usage !== null);
  record(
    'the rows that were counted say so — AC3',
    counted.length > 0,
    `${counted.length}/${panel.rows.length} carry a usage figure: ${counted.slice(0, 5).map((r) => `${r.name}=${r.usage}`).join(', ')}`
  );

  // ═══ AC4: the ⋯, hit-tested where it is drawn ═══
  const onScreen = panel.rows.filter((r) => r.onScreen);
  record(
    'some rows are actually on screen to hit-test',
    onScreen.length > 0,
    `${onScreen.length} of ${panel.rows.length} — the rest are inside the collapsed token sub-section, ` +
      'which is what CLOSED means and is measured by opening it below'
  );
  const unreachable = onScreen.filter((r) => !r.menu || !r.menu.reachable);
  record(
    'every on-screen row’s ⋯ is reachable, not behind something — AC4/R6',
    onScreen.length > 0 && unreachable.length === 0,
    unreachable.length
      ? unreachable.map((r) => `${r.name}: ${r.menu ? JSON.stringify(r.menu) : 'NO MENU ELEMENT'}`).join('; ')
      : `${onScreen.length} rows, all hittable`
  );
  const dimmed = onScreen.filter((r) => r.menu && (r.menu.visibility !== 'visible' || Number(r.menu.opacity) < 0.99));
  record(
    'no ⋯ is hidden or faded until hover — the defect R6 removed',
    dimmed.length === 0,
    dimmed.map((r) => `${r.name}: ${r.menu.visibility}/${r.menu.opacity}`).join('; ') || 'all visible at opacity 1'
  );
  record(
    'CONTROL: zero `.variants-item-icon` on this surface',
    panel.hoverOnly === 0,
    `${panel.hoverOnly} found`
  );

  // 🔴 The rows excluded above are excluded because they are COLLAPSED, and a claim that rests on
  //    an exclusion has to show the excluded set is fine. Open it and re-read.
  const opened = await ev(`(() => {
    const heads = Array.from(document.querySelectorAll('[data-panel-id="styles"] section'));
    const target = heads.find((s) => {
      const t = s.querySelector('[class*="Title"]');
      return t && /^Design tokens \\(\\d+\\)$/.test(t.textContent.trim());
    });
    if (!target) return 'NO SUB-SECTION';
    const header = target.querySelector('[class*="Header"]');
    if (!header) return 'NO HEADER';
    header.click();
    return 'clicked';
  })()`);
  await wait(1200);
  await ev(STRIP_OVERLAY);
  const afterOpen = await readJson(PANEL);
  const tokensOnScreen = (afterOpen.rows || []).filter((r) => r.layer === 'Token' && r.onScreen);
  record(
    'opening the colour-token sub-section makes those rows reachable too',
    opened === 'clicked' && tokensOnScreen.length > 0 && tokensOnScreen.every((r) => r.menu && r.menu.reachable),
    `${opened}; ${tokensOnScreen.length} token rows on screen, ` +
      `${tokensOnScreen.filter((r) => r.menu && r.menu.reachable).length} hittable`
  );
  // Put it back, so the shots are of the panel as it OPENS.
  if (opened === 'clicked') {
    await ev(`(() => {
      const heads = Array.from(document.querySelectorAll('[data-panel-id="styles"] section'));
      const target = heads.find((s) => { const t = s.querySelector('[class*="Title"]'); return t && /^Design tokens/.test(t.textContent.trim()); });
      const header = target && target.querySelector('[class*="Header"]');
      if (header) header.click();
      return 'ok';
    })()`);
    await wait(1000);
  }

  record(
    'the create doors are drawn without expanding anything — AC5',
    panel.addButtons.filter((b) => b.onScreen).length >= 1,
    panel.addButtons.map((b) => `${b.id}:${b.onScreen}`).join(', ') || 'none'
  );

  // ═══ 5. BOTH THEMES + THE SHOTS ═══
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const theme of ['dark', 'light']) {
    await ev(`(() => { ${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // 🔴 A theme written in one evaluation is not applied to anything read in the SAME one, and
    // the flip rebuilds the panel with the scroller back at the top.
    await wait(2500);
    await ev(`(() => { const p = document.querySelector('[data-panel-id="styles"] [class*="ChildrenContainer"], [data-panel-id="styles"]'); if (p) p.scrollTop = 0; return 'ok'; })()`);
    await wait(600);

    await ev(STRIP_OVERLAY);
    const applied = await ev(`document.documentElement.getAttribute('data-theme')`);
    const inTheme = await readJson(PANEL);
    record(
      `the panel still draws its rows and its ⋯ in the ${theme} theme`,
      applied === theme &&
        !inTheme.error &&
        inTheme.rows.length > 0 &&
        inTheme.rows.filter((r) => r.onScreen).every((r) => r.menu && r.menu.reachable),
      `theme=${applied}, ${inTheme.rows ? inTheme.rows.length : 0} rows, ` +
        `${inTheme.rows ? inTheme.rows.filter((r) => r.onScreen && r.menu && r.menu.reachable).length : 0} hittable`
    );

    const clip = await readJson(`JSON.stringify((() => {
      const p = document.querySelector('[data-panel-id="styles"]');
      if (!p) return null;
      const r = p.getBoundingClientRect();
      // Clamped to the viewport — a clip that runs past the window is padded with empty ground.
      const left = Math.max(0, Math.floor(r.left) - 4);
      const top = Math.max(0, Math.floor(r.top) - 4);
      return {
        x: left,
        y: top,
        width: Math.min(innerWidth - left, Math.ceil(r.width) + 8),
        height: Math.min(innerHeight - top, Math.ceil(r.height) + 8)
      };
    })())`);

    const file = path.join(SHOTS, `sty005-panel-${theme}.png`);
    const shot = await editor.send('Page.captureScreenshot', {
      format: 'png',
      ...(clip && clip.width > 0 ? { clip: { ...clip, scale: 2 } } : {})
    });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`shot ${path.basename(file)} — theme=${applied}${clip ? '' : ' (FULL WINDOW — no panel rect)'}`);
  }

  return finish(editor);
}

function finish(editor) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(`\n${graded.length - failed.length}/${graded.length} graded arms passed` + (failed.length ? `; FAILED: ${failed.map((a) => a.name).join('; ')}` : ''));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ arms }, null, 2));
  editor.close && editor.close();
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
