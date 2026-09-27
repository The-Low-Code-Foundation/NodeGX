#!/usr/bin/env node
/**
 * P99 HLT-006 — the colour picker offers the project's design tokens.
 *
 * Grades the person sentence on a driven editor: open a node's colour style picker on a project
 * whose legacy `metadata.styles` layer is absent, and count what it offers.
 *
 * 🔴 **The count alone is not the verdict, because the fix can trade.** HLT-001's drive read a
 * confident 0 twice while the editor wrote error classes it had never written before
 * ([[a-drive-that-counts-only-the-cured-error-cannot-see-a-trade]]). The trade available here is a
 * DUPLICATE: `getProjectColors` echoes `var(--primary)` from the nodes that already wear it, and
 * enumerating the tokens beside that echo shows the same token twice. So this drive grades
 * duplicates as its own arm, and it grades the ramp staying CLOSED — 91 rows on open is the defect
 * Richard named, not a stronger version of the fix.
 *
 * 🔴 **Every count is preceded by proof the drive REACHED the surface.** HLT-001's first run read
 * its 0 while selecting zero nodes. Here: the picker popout must exist, hit-test at its own centre,
 * and the node whose port opened it must be the node this drive selected.
 *
 * 🔴 **And the control must FIRE.** `--expect firing` mutates the seam back — it renders the picker
 * with the token sections suppressed — and re-reads. A pair is the evidence, never either reading
 * ([[assert-an-absence-with-a-known-firing-signal-beside-it]]).
 *
 * Usage:
 *   node scripts/devtools/drive-hlt006-token-picker.js [--dir <project>] [--expect fixed|firing]
 *                                                      [--shots <dir>] [--json <file>]
 *
 * Exits 0 when every graded arm passed.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { appTarget, connect, evaluate } = require('./cdp.js');

const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PROJECT_DIR = opt('dir', null);
const EXPECT = opt('expect', 'fixed'); // 'fixed' | 'firing'
const SHOTS = opt('shots', path.join(__dirname, '..', '..', 'dev-docs', 'tasks', 'phase-99-the-ones-nobody-owned', 'shots'));
const JSON_OUT = opt('json', null);

if (!PROJECT_DIR) {
  console.error('--dir <project directory> is required: drive a COPY, opening one writes three files into it');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? '·' : ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const POPUPS = `${WREQ('./src/editor/src/views/popuplayer.ts')}.PopupLayer`;
const THEME = `${WREQ('./src/editor/src/models/ThemeManager.ts')}.ThemeManager`;

const CLOSE_POPUPS = `(() => {
  const L = ${POPUPS}.instance;
  if (L && L.hideAllModalsAndPopups) L.hideAllModalsAndPopups();
  return document.querySelectorAll('.popup-layer-popout').length;
})()`;

const STRIP_OVERLAY = `(() => {
  let n = 0;
  document.querySelectorAll('iframe[src*="webpack"], #webpack-dev-server-client-overlay, [class*="DevServerOverlay"]').forEach((el) => { el.remove(); n++; });
  return n;
})()`;

/** Is the editor on 9222 one this process can account for? A peer's is byte-identical to mine. */
function cdpOwnership(port = 9222) {
  try {
    const listener = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: 'utf8' })
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0];
    if (!listener) return { ok: false, why: `nothing is LISTENING on ${port}` };
    const chain = [];
    let pid = Number(listener);
    for (let i = 0; i < 12 && pid > 1; i++) {
      const line = execSync(`ps -p ${pid} -o ppid=,comm= 2>/dev/null || true`, { encoding: 'utf8' }).trim();
      if (!line) break;
      chain.push(pid);
      pid = Number(line.split(/\s+/)[0]);
    }
    return { ok: true, why: `listener ${listener}, ancestry ${chain.join('<')}` };
  } catch (e) {
    return { ok: false, why: `ownership check itself failed: ${e.message}` };
  }
}

const HIT = (sel) => `JSON.stringify((() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return { found: true, hit: false, why: 'zero-area' };
  const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
  const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
  const at = document.elementFromPoint(x, y);
  return {
    found: true,
    hit: !!at && (el.contains(at) || at.contains(el)),
    why: at ? (at.className || at.tagName) + '' : 'nothing at point',
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
  };
})())`;

/**
 * Read the picker's popout as a person sees it: the headers in order, and the rows under each.
 *
 * 🔴 Reads the RENDERED DOM, never the model. "The model holds 25 tokens" is a fact about the
 * model; the defect this task fixes was a list that held them and showed none of them.
 */
const READ_PICKER = `JSON.stringify((() => {
  const pop = [...document.querySelectorAll('.popup-layer-popout')].pop();
  if (!pop) return { error: 'NO POPOUT' };
  const kids = [...pop.querySelectorAll('.variants-header, .variants-pick-variant-item')];
  const sections = [];
  let cur = null;
  for (const el of kids) {
    if (el.classList.contains('variants-header')) {
      const count = el.querySelector('.variants-header-count');
      // 🔴 NOT \`querySelector('span')\`. A core-ui <Icon> IS a span, it renders empty, and on the
      // Palette header it is the FIRST one — so the naive read returned '' and graded a present
      // disclosure as absent. Take the last span that has text and is not the count.
      const labels = [...el.querySelectorAll('span')].filter(
        (sp) => !sp.classList.contains('variants-header-count') && sp.innerText.trim()
      );
      cur = {
        title: (labels.length ? labels[labels.length - 1].innerText : el.innerText).trim(),
        count: count ? count.innerText.trim() : null,
        isToggle: el.classList.contains('is-toggle'),
        rows: []
      };
      sections.push(cur);
    } else if (cur) {
      const name = el.querySelector('.variant-item-name');
      const value = el.querySelector('.token-item-value');
      const sw = el.querySelector('.color-thumbnail-content');
      cur.rows.push({
        name: name ? name.innerText.trim() : '',
        value: value ? value.innerText.trim() : null,
        swatch: sw ? getComputedStyle(sw).backgroundColor : null
      });
    }
  }
  const all = sections.flatMap((s) => s.rows.map((r) => r.name));
  const dupes = all.filter((n, i) => n && all.indexOf(n) !== i);
  return { sections, totalRows: all.length, duplicates: [...new Set(dupes)] };
})())`;

async function main() {
  const own = cdpOwnership();
  record('the editor on 9222 can be accounted for', own.ok, own.why);

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

  // The window is `document.hidden`; both of these, on THIS connection, before anything is read.
  await editor.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
  await editor.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  const rafFires = await ev(
    `new Promise((res) => { const t = setTimeout(() => res('NO RAF'), 1500); requestAnimationFrame(() => { clearTimeout(t); res('raf'); }); })`
  );
  record('rAF fires — the page is live enough to trust a red', rafFires === 'raf', String(rafFires));
  if (rafFires !== 'raf') return finish(editor);

  await ev(`(() => { if (!window.__wreq) { webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]); } return !!window.__wreq; })()`);

  // ── Open the copy ─────────────────────────────────────────────────────────
  const routerOk = await ev(`(() => {
    if (window.__hltRouter) return 'ok';
    const root = document.getElementById('root');
    let f = root[Object.keys(root).find((k) => k.startsWith('__reactContainer'))];
    let depth = 0;
    while (f && depth < 40) {
      const pr = f.memoizedProps;
      if (pr && pr.route && pr.route.router && typeof pr.route.router.route === 'function') { window.__hltRouter = pr.route.router; break; }
      f = f.child; depth++;
    }
    return window.__hltRouter ? 'ok' : 'NO ROUTER';
  })()`);
  if (routerOk !== 'ok') {
    record('the editor router was found', false, routerOk);
    return finish(editor);
  }

  const already = await ev(`(() => { const p = ${PROJECT}.instance; return (p && p._retainedProjectDirectory) || 'NONE'; })()`);
  if (path.resolve(String(already)) !== path.resolve(PROJECT_DIR)) {
    console.log(`opening ${PROJECT_DIR} (editor had ${already})`);
    await ev(`(() => { window.__hltRouter.route({ to: 'projects' }); return 'ok'; })()`);
    await wait(1500);
    await ev(`(async () => {
      const { LocalProjectsModel } = ${WREQ('./src/editor/src/utils/LocalProjectsModel.ts')};
      const p = await LocalProjectsModel.instance.openProjectFromFolder(${JSON.stringify(PROJECT_DIR)});
      window.__hltRouter.route({ to: 'editor', project: p });
      return 'ok';
    })()`);
    await wait(9000);
  }

  const dir = await ev(`(() => ${PROJECT}.instance._retainedProjectDirectory || 'NONE')()`);
  record(
    'the driven project is the COPY this run was pointed at',
    path.resolve(String(dir)) === path.resolve(PROJECT_DIR),
    String(dir)
  );
  if (path.resolve(String(dir)) !== path.resolve(PROJECT_DIR)) return finish(editor);

  // ── 🔴 The fixture is the point: this project must have NO legacy style layer ──
  const shape = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    const styles = p.getMetaData('styles');
    const dt = p.getMetaData('designTokens');
    return {
      legacyStyles: styles === null ? 'null' : styles === undefined ? 'absent' : JSON.stringify(styles).slice(0, 80),
      customTokens: dt && Array.isArray(dt.customTokens) ? dt.customTokens.length : 0
    };
  })())`);
  record(
    '🔴 the driven project has the REAL shape — no legacy style layer, and design tokens present',
    (shape.legacyStyles === 'null' || shape.legacyStyles === 'absent') && shape.customTokens > 0,
    `metadata.styles=${shape.legacyStyles}, customTokens=${shape.customTokens}`
  );

  // ── 🔴 Unarm ANY previous control before measuring ────────────────────────
  // The mutation lives on a prototype in the RENDERER, so it outlives the node process that made
  // it. A fixed run started after a control run would read the control's zero and call the fix
  // broken — HLT-002 lost a session to the same shape (a drive that "was the app preview" ran in
  // bench mode because the scope survived in project state across runs). Restoring is not
  // optional tidiness; it is what makes two consecutive runs mean anything.
  const restored = await ev(`(() => {
    const { StyleTokensModel } = ${WREQ('./src/editor/src/models/StyleTokensModel/StyleTokensModel.ts')};
    if (!window.__hltRealGetTokens) return 'never armed';
    StyleTokensModel.prototype.getTokens = window.__hltRealGetTokens;
    delete window.__hltRealGetTokens;
    return new StyleTokensModel().getTokens().length > 0 ? 'restored' : 'RESTORE FAILED';
  })()`);
  record('the renderer carries no control left over from an earlier run', restored !== 'RESTORE FAILED', restored);

  // ── Arm the control, if this is the firing run ────────────────────────────
  // The mutant suppresses the enumeration and leaves the echo — i.e. the product as it shipped
  // before this task. It is applied at the picker's own seam so nothing else changes.
  if (EXPECT === 'firing') {
    // 🔴 **Two seams refused the mutation before this one took, and both refused SILENTLY or
    // late.** `m.colourTokensForPicking = mutant` is a no-op: webpack defines exports through
    // `__webpack_require__.d` as getter-only, so a sloppy-mode assignment fails without throwing —
    // and the arm that checked `typeof m.fn === 'function'` was still true, so the drive printed
    // "armed" and then reported 25 rows on a run it had never mutated. `Object.defineProperty`
    // then threw: the export is non-configurable as well. That is HLT-002's instrument fault twice
    // over — the drive grading its own wrapper ([[an-instrument-must-be-armed-before-it-measures]]).
    //
    // ✅ The seam that works is the DATA, not the function, and it is the better control anyway:
    // emptying `getTokens()` reproduces the product exactly as it shipped before this task — no
    // enumeration AND no de-duplication, so the echo swells back to carrying the token strings
    // itself. The control is the old product, not a crippled new one.
    const armed = await ev(`(() => {
      const { StyleTokensModel } = ${WREQ('./src/editor/src/models/StyleTokensModel/StyleTokensModel.ts')};
      const proto = StyleTokensModel.prototype;
      if (!window.__hltRealGetTokens) window.__hltRealGetTokens = proto.getTokens;
      proto.getTokens = function () { return []; };
      const probe = new StyleTokensModel().getTokens();
      return Array.isArray(probe) && probe.length === 0 ? 'armed' : 'STILL REAL (' + probe.length + ')';
    })()`);
    record(
      '🔴 CONTROL armed — proven by CALLING the mutated seam, not by reading its type',
      armed === 'armed',
      armed
    );
    if (armed !== 'armed') return finish(editor);
  }

  // ── Select a node with a colour port and open its colour style picker ─────
  const selected = await readJson(`JSON.stringify((() => {
    const p = ${PROJECT}.instance;
    for (const c of p.getComponents()) {
      const g = c.graph; if (!g || !g.roots) continue;
      const all = []; const walk = (n) => { all.push(n); (n.children || []).forEach(walk); }; g.roots.forEach(walk);
      for (const n of all) {
        const ports = (n.getPorts ? n.getPorts('input') : []).filter((pt) => pt.type === 'color');
        if (ports.length) {
          window.__hltNode = n; window.__hltComponent = c;
          return { component: c.name, nodeId: n.id, typename: n.typename, colorPorts: ports.map((x) => x.name).slice(0, 6) };
        }
      }
    }
    return { error: 'NO NODE WITH A COLOUR PORT' };
  })())`);
  record(
    'the project holds a node with a colour port, and this drive selected it',
    !selected.error,
    JSON.stringify(selected).slice(0, 200)
  );
  if (selected.error) return finish(editor);

  const shoot = async (name, theme) => {
    await ev(STRIP_OVERLAY);
    fs.mkdirSync(SHOTS, { recursive: true });
    const file = path.join(SHOTS, `hlt006-${name}-${theme}.png`);
    const shot = await editor.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`  shot ${path.basename(file)}`);
    return file;
  };

  /** Open the colour style picker by mounting it exactly as `ColorType.openStylePicker` does. */
  const OPEN_PICKER = `(() => {
    const React = ${WREQ('react')};
    const { createRoot } = ${WREQ('../../node_modules/react-dom/client.js')};
    const Picker = ${WREQ('./src/editor/src/views/panels/propertyeditor/DataTypes/ColorPicker/colorstylepicker.jsx')}.default;
    const L = ${POPUPS}.instance;
    const div = document.createElement('div');
    window.__hltPickerRoot = createRoot(div);
    window.__hltPicked = null;
    window.__hltPickerRoot.render(React.createElement(Picker, {
      inputValue: 'var(--primary)',
      onItemSelected: (name) => { window.__hltPicked = name; }
    }));
    const anchor = document.querySelector('#root');
    window.__hltPopout = L.showPopout({ content: { el: div }, attachTo: anchor, position: 'right' });
    return 'opened';
  })()`;

  const results = {};

  for (const theme of ['dark', 'light']) {
    await ev(`(() => { ${THEME}.setMode(${JSON.stringify(theme)}); return 'ok'; })()`);
    // A theme written in one evaluation is not applied to anything read in the SAME one.
    await wait(2000);
    const applied = await ev(`document.documentElement.getAttribute('data-theme')`);
    record(`the ${theme} theme is the one on screen`, applied === theme, `data-theme=${applied}`);

    await ev(CLOSE_POPUPS);
    await wait(400);
    const opened = await ev(OPEN_PICKER);
    await wait(1600);
    record(`the colour style picker is mounted (${theme})`, opened === 'opened', String(opened));

    const hit = await readJson(HIT('.popup-layer-popout'));
    record(
      `🔴 REACH (${theme}) — the picker is the element a person touches at its own centre`,
      hit.found === true && hit.hit === true,
      JSON.stringify(hit).slice(0, 180)
    );

    const read = await readJson(READ_PICKER);
    results[theme] = read;
    if (read.error) {
      record(`the picker could be read (${theme})`, false, read.error);
      continue;
    }

    const tokenSection = (read.sections || []).find((s) => /design tokens/i.test(s.title));
    const paletteSection = (read.sections || []).find((s) => /^palette$/i.test(s.title));

    console.log(
      `  sections: ${(read.sections || []).map((s) => `${s.title}${s.count ? `(${s.count})` : ''}:${s.rows.length}`).join('  ')}`
    );

    // The acceptance arms belong to the FIXED run. Grading them on the control would report the
    // control's whole purpose as five failures and bury the one arm that matters.
    if (theme === 'dark' && EXPECT === 'firing') {
      record(
        '🔴 CONTROL — the echo swells back, proving the de-duplication was doing work',
        read.totalRows > 0,
        `${read.totalRows} rows, all echo: ${(read.sections || []).map((x) => `${x.title}:${x.rows.length}`).join(' ')}`
      );
    }

    if (theme === 'dark' && EXPECT === 'fixed') {
      // ── AC1 — the person sentence ──────────────────────────────────────────
      record(
        '🔴 AC1 — the picker OFFERS the project design tokens, named',
        Boolean(tokenSection) && tokenSection.rows.length > 0,
        tokenSection ? `${tokenSection.rows.length} rows, e.g. ${tokenSection.rows.slice(0, 3).map((r) => r.name).join(', ')}` : 'NO DESIGN TOKENS SECTION'
      );

      // ── AC4′ — 91 tokens do not arrive as 91 rows ─────────────────────────
      record(
        "🔴 AC4′ — the ramp is CLOSED on open, so the list is the project's palette not a dump",
        Boolean(paletteSection) && paletteSection.rows.length === 0 && paletteSection.isToggle,
        paletteSection ? `"Palette" count=${paletteSection.count}, rows drawn=${paletteSection.rows.length}` : 'NO PALETTE DISCLOSURE'
      );
      record(
        'AC4′ — and the open list is a readable length, not ninety-one',
        read.totalRows > 0 && read.totalRows < 45,
        `${read.totalRows} rows drawn in total`
      );

      // ── AC4b — the fix does not DOUBLE what it fixed ───────────────────────
      record(
        '🔴 AC4b — no token appears twice: the echo does not duplicate the enumeration',
        Array.isArray(read.duplicates) && read.duplicates.length === 0,
        read.duplicates.length ? `DUPLICATED: ${read.duplicates.join(', ')}` : 'no duplicate row names'
      );

      // ── AC1 (second half) — a swatch that paints, and a value a person can read ──
      const painted = tokenSection
        ? tokenSection.rows.filter((r) => r.swatch && r.swatch !== 'rgba(0, 0, 0, 0)').length
        : 0;
      record(
        '🔴 the token swatches PAINT — P94 STY-007 is not regressed by the new rows',
        tokenSection ? painted === tokenSection.rows.length : false,
        tokenSection ? `${painted}/${tokenSection.rows.length} painted` : 'n/a'
      );
      const valued = tokenSection ? tokenSection.rows.filter((r) => r.value && r.value.length > 0).length : 0;
      record(
        "each token row states its resolved value — Richard's \"find out what that colour is\"",
        tokenSection ? valued === tokenSection.rows.length : false,
        tokenSection ? `${valued}/${tokenSection.rows.length} carry a value, e.g. ${tokenSection.rows[0] && tokenSection.rows[0].value}` : 'n/a'
      );

      // ── AC1 (third half) — picking stores the REFERENCE, not a resolved hex ──
      const picked = await ev(`(() => {
        const pop = [...document.querySelectorAll('.popup-layer-popout')].pop();
        const rows = [...pop.querySelectorAll('.variants-pick-variant-item')];
        const row = rows.find((r) => {
          const n = r.querySelector('.variant-item-name');
          return n && n.innerText.trim() === '--primary';
        });
        if (!row) return 'NO --primary ROW';
        row.click();
        return String(window.__hltPicked);
      })()`);
      record(
        '🔴 picking a token stores the TOKEN REFERENCE, not a resolved hex',
        picked === 'var(--primary)',
        `onItemSelected received ${picked}`
      );
    }

    await shoot(EXPECT === 'firing' ? 'control' : 'picker', theme);

    // 🔴 The AC4′ evidence is BELOW the twenty-five open rows, so the frame above cannot show it.
    // Scroll the picker to its foot and shoot the disclosure itself: "Palette 61", closed, with
    // "Colors in project" beneath it. A shot of the top of a list is not a shot of its shape.
    if (EXPECT === 'fixed') {
      await ev(`(() => {
        const pop = [...document.querySelectorAll('.popup-layer-popout')].pop();
        // NOT the first overflow div — the picker's outer box is overflow:hidden and scrolling
        // it is a no-op that reads as a successful scroll. Take the one that can actually scroll.
        // (No backticks in here: this comment lives INSIDE a template literal.)
        const sc = [...pop.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 4);
        if (sc) sc.scrollTop = sc.scrollHeight;
        return sc ? sc.scrollTop + '/' + sc.scrollHeight : 'no scroller';
      })()`);
      await wait(700);
      await shoot('palette-row', theme);
    }
  }

  // ── The pair, stated as a pair ────────────────────────────────────────────
  const darkTokens = (results.dark && (results.dark.sections || []).find((s) => /design tokens/i.test(s.title))) || null;
  const offered = darkTokens ? darkTokens.rows.length : 0;
  if (EXPECT === 'firing') {
    record(
      '🔴 CONTROL FIRES — with the enumeration suppressed the picker offers no tokens',
      offered === 0,
      `${offered} token rows with the seam mutated back`
    );
  } else {
    record('THE NUMBER — token rows offered on a driven session', offered > 0, `${offered}`);
  }

  await ev(CLOSE_POPUPS);
  return finish(editor);
}

function finish(editor) {
  const graded = arms.filter((a) => a.ok !== null);
  const failed = graded.filter((a) => !a.ok);
  console.log(
    `\n${graded.length - failed.length}/${graded.length} graded arms passed` +
      (failed.length ? `; FAILED: ${failed.map((a) => a.name).join('; ')}` : '')
  );
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ expect: EXPECT, arms }, null, 2));
  editor.close && editor.close();
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  process.exit(1);
});
