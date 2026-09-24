#!/usr/bin/env node
/**
 * P103 CMG-004 — reset says what it resets, driven (AC1–AC7).
 *
 *   npm run dev:debug -- --quiet      (wait for "launching Electron")
 *   node scripts/devtools/drive-cmg004-reset.js [--dir <copy>] [--shots <dir>]
 *
 * On a copy of *Landing page test V2* as it was before Richard's drive (142 stored tokens, 46
 * real changes). Every arm is a reading off the RUNNING editor: the number the strip says, the
 * rows behind it, what one *Put back* changes (the model, the undo queue, the preview's `:root`),
 * what a section reset leaves alone, that Cancel on the confirm writes nothing (the project file's
 * bytes), that an added token survives *Put all back*, and that a reset is on disk and survives
 * a reopen.
 *
 * 🔴 Drives a COPY (`--dir`) and LEAVES IT RESET at the end (AC7): copy it again before a re-run.
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
const PROJECT_FILE = path.join(PROJECT_DIR, 'nodegx.project.json');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const arms = [];
const record = (name, ok, detail) => {
  arms.push({ name, ok, detail });
  console.log(`${ok === null ? 'UNGRADED' : ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const WREQ = (p) => `window.__wreq(${JSON.stringify(p)})`;
const PROJECT = `${WREQ('./src/editor/src/models/projectmodel.ts')}.ProjectModel`;
const UNDO = `${WREQ('./src/editor/src/models/undo-queue-model.ts')}.UndoQueue.instance`;
const SIDEBAR = `${WREQ('./src/editor/src/models/sidebar/sidebarmodel.tsx')}.SidebarModel.instance`;
const TOKENS_MODEL = `${WREQ('./src/editor/src/models/StyleTokensModel/StyleTokensModel.ts')}.StyleTokensModel`;
const CHANGES = WREQ('./src/editor/src/models/StyleTokensModel/TokenChanges.ts');

const CLICK = (selector) => `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'NO ' + ${JSON.stringify(selector)}; el.click(); return 'ok'; })()`;

async function shot(editor, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const { data } = await editor.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name), Buffer.from(data, 'base64'));
  console.log(`      shot ${name}`);
}

/** The stored token block on disk, as the editor wrote it. */
function storedOnDisk() {
  const p = JSON.parse(fs.readFileSync(PROJECT_FILE, 'utf8'));
  return (p.metadata && p.metadata.designTokens && p.metadata.designTokens.customTokens) || [];
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
  await ev(`(() => { ${WREQ('./src/editor/src/views/popuplayer.ts')}.default.instance.hidePopouts(true); return 'ok'; })()`);
  await wait(300);

  // ── 0. Open the copy ─────────────────────────────────────────────────────
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
  const opened = await openProject(PROJECT_DIR);
  record('the driven project is the copy this drive names', opened === 'ok', opened);
  if (opened !== 'ok') return finish();

  // A fresh model on the live project: the same reading the panel makes.
  const MODEL_READ = (expr) => `(() => { const m = new (${TOKENS_MODEL})(); try { return ${expr}; } finally { m.dispose(); } })()`;
  const changed = () => readJson(MODEL_READ(`JSON.stringify(${CHANGES}.tokenChanges(m.getTokens()).changed.map((c) => [c.token.name, c.token.value, c.defaultValue]))`));
  const tokenValue = (name) => ev(MODEL_READ(`(m.getToken(${JSON.stringify(name)}) || {}).value || 'NONE'`));
  const undoLength = () => readJson(`JSON.stringify(${UNDO}.getHistoryLocation())`);

  const addedCount = () => readJson(MODEL_READ(`JSON.stringify(${CHANGES}.tokenChanges(m.getTokens()).added.length)`));

  const start = await changed();
  const added0 = await addedCount();
  // The copy was 142 stored rows on disk. Opening it runs the 0.3 upgrade, which turns its two
  // text styles into typography tokens with no shipped default — the "150, not 142" Richard saw,
  // and the 8 his Reset all deleted. They are "added" here and are never reset.
  record(
    'control — 46 real changes and 8 added (the upgrade\'s typography tokens) before anything is pressed',
    Array.isArray(start) && start.length === 46 && added0 === 8 && storedOnDisk().length >= 142,
    `changed=${start.length} added=${added0} stored=${storedOnDisk().length}`
  );

  await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(1000);

  // ── 1. AC1: the count ────────────────────────────────────────────────────
  const strip = await readJson(`JSON.stringify((() => { const s = document.querySelector('[data-token-changes]'); return s ? { n: s.getAttribute('data-token-changes'), text: s.innerText.trim().slice(0, 80) } : null; })())`);
  record('AC1 — the strip says 46 changed, not 142 stored', strip && strip.n === '46' && /46 tokens changed from the defaults/.test(strip.text), JSON.stringify(strip));

  // ── 2. AC2: the list ─────────────────────────────────────────────────────
  await ev(CLICK('[data-test="token-changes-toggle"]'));
  await wait(500);
  const list = await readJson(`JSON.stringify((() => {
    const rows = Array.from(document.querySelectorAll('[data-token-change]'));
    const primary = document.querySelector('[data-token-change="--primary"]');
    const groups = Array.from(document.querySelectorAll('[data-changes-group]')).map((g) => g.getAttribute('data-changes-group') + ':' + g.querySelectorAll('[data-token-change]').length);
    const sw = primary ? Array.from(primary.querySelectorAll('span[style*="background"]')).map((s) => getComputedStyle(s).backgroundColor) : [];
    return { rows: rows.length, primaryText: primary ? primary.innerText.replace(/\\s+/g, ' ') : null, swatches: sw, groups };
  })())`);
  record(
    'AC2 — 46 rows, grouped by section; --primary shows #c2410c → #2563eb with two swatches, orange then blue',
    list && list.rows === 46 && /#c2410c/.test(list.primaryText) && /#2563eb/.test(list.primaryText) && list.swatches.length === 2 && list.swatches[0] === 'rgb(194, 65, 12)' && list.swatches[1] === 'rgb(37, 99, 235)' && list.groups.includes('effects:7') && list.groups.includes('colours:9'),
    JSON.stringify(list)
  );
  await shot(editor, 'cmg004-ac2-the-list.png');

  // ── 3. AC3: one token, one undo step, the canvas goes blue ───────────────
  let viewer = null;
  try {
    viewer = await connect(await appTarget('viewer'));
  } catch {
    viewer = null;
  }
  const previewPrimary = async () => (viewer ? String(await evaluate(viewer, `getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()`)) : 'NO VIEWER');
  const undoBefore = await undoLength();
  const previewBefore = await previewPrimary();
  await ev(CLICK('[data-test="token-change-reset---primary"]'));
  await wait(700);
  const afterOne = await changed();
  const undoAfter = await undoLength();
  const previewAfter = await previewPrimary();
  record(
    'AC3 — Put back on --primary: it is blue, 45 others still differ, the undo queue grew by one',
    (await tokenValue('--primary')) === '#2563eb' && afterOne.length === 45 && undoAfter === undoBefore + 1,
    `primary=${await tokenValue('--primary')} changed=${afterOne.length} undo ${undoBefore}→${undoAfter}`
  );
  record('… and the preview\'s :root --primary went from orange to blue', previewBefore === '#c2410c' && previewAfter === '#2563eb', `${previewBefore} → ${previewAfter}`);
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(700);
  record('… ⌘Z brings the orange back in one step', (await tokenValue('--primary')) === '#c2410c' && (await changed()).length === 46 && (await previewPrimary()) === '#c2410c', `primary=${await tokenValue('--primary')} preview=${await previewPrimary()}`);

  // ── 4. AC4: one section ──────────────────────────────────────────────────
  const effectsLabel = await ev(`(() => { const b = document.querySelector('[data-test="section-reset-effects"]'); return b ? b.textContent.trim() : 'NO BUTTON'; })()`);
  record('the Effects header offers Reset 7', effectsLabel === 'Reset 7', effectsLabel);
  await ev(CLICK('[data-test="section-reset-effects"]'));
  await wait(500);
  const modal = await readJson(`JSON.stringify((() => { const m = document.querySelector('.confirm-modal'); return m ? { text: m.innerText.replace(/\\s+/g, ' ').slice(0, 300) } : null; })())`);
  record('AC5 — a section reset asks first, naming the section and the count', modal && /Put 7 tokens in Effects back to their defaults\\?/.test(modal.text.replace('?', '\\?')) || (modal && /7 tokens in Effects/.test(modal.text)), JSON.stringify(modal));
  await shot(editor, 'cmg004-ac4-confirm-effects.png');
  await ev(CLICK('.confirm-modal [data-test="confirm-button"]'));
  await wait(800);
  const afterEffects = await changed();
  const effectsLeft = afterEffects.filter(([n]) => /^--(shadow|gradient)/.test(n)).length;
  const coloursLeft = afterEffects.filter(([n]) => ['--primary', '--primary-hover', '--ring', '--surface-raised', '--muted-foreground', '--secondary', '--secondary-hover', '--border-control', '--border-glass'].includes(n)).length;
  record('AC4 — Effects reset: the 7 are back at default, the 9 colour changes untouched, 39 remain', effectsLeft === 0 && coloursLeft === 9 && afterEffects.length === 39, `effects=${effectsLeft} colours=${coloursLeft} total=${afterEffects.length}`);
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(700);
  record('… one ⌘Z brings all 7 back', (await changed()).length === 46, `changed=${(await changed()).length}`);

  // ── 5. AC5: Cancel writes nothing ────────────────────────────────────────
  // The undo above armed an autosave (1 s after setMetaData); let it land before the baseline is
  // read, or the baseline is a file about to change for a reason that is not the Cancel.
  await wait(3000);
  const metaBefore = await ev(`JSON.stringify(${PROJECT}.instance.getMetaData('designTokens'))`);
  const bytesBefore = fs.readFileSync(PROJECT_FILE);
  await ev(CLICK('[data-test="token-changes-reset-all"]'));
  await wait(500);
  const allModal = await readJson(`JSON.stringify((() => { const m = document.querySelector('.confirm-modal'); return m ? { text: m.innerText.replace(/\\s+/g, ' ').slice(0, 400) } : null; })())`);
  record('AC5 — Put all back asks first: 46 tokens, --primary named, orange → blue, "and 44 more"', allModal && /46 tokens/.test(allModal.text) && /--primary goes from/.test(allModal.text) && /#c2410c/.test(allModal.text) && /#2563eb/.test(allModal.text) && /and 44 more/.test(allModal.text), JSON.stringify(allModal));
  await shot(editor, 'cmg004-ac5-confirm-all.png');
  await ev(CLICK('.confirm-modal .cancel-button'));
  await wait(2500);
  const metaAfter = await ev(`JSON.stringify(${PROJECT}.instance.getMetaData('designTokens'))`);
  const bytesAfter = fs.readFileSync(PROJECT_FILE);
  record('AC5 — Cancel writes nothing: metadata and the file\'s bytes are identical, still 46', metaBefore === metaAfter && bytesBefore.equals(bytesAfter) && (await changed()).length === 46, `meta same=${metaBefore === metaAfter} bytes same=${bytesBefore.equals(bytesAfter)}`);

  // ── 6. AC6: an added token survives Put all back ─────────────────────────
  await ev(`(() => { const m = new (${TOKENS_MODEL})(); m.addCustomToken({ name: '--space-huge', value: '96px', category: 'spacing' }); m.dispose(); return 'ok'; })()`);
  await wait(500);
  await ev(CLICK('[data-test="token-changes-reset-all"]'));
  await wait(500);
  const addedModal = await readJson(`JSON.stringify((() => { const m = document.querySelector('.confirm-modal'); return m ? { text: m.innerText.replace(/\\s+/g, ' ') } : null; })())`);
  const addedNow = added0 + 1;
  record(`AC6 — the confirm says the ${addedNow} added tokens are kept`, addedModal && new RegExp(`The ${addedNow} tokens you added are kept`).test(addedModal.text), JSON.stringify(addedModal).slice(0, 200));
  await ev(CLICK('.confirm-modal [data-test="confirm-button"]'));
  await wait(1000);
  const afterAll = await changed();
  const stripAfter = await readJson(`JSON.stringify((() => { const s = document.querySelector('[data-token-changes]'); return s ? { n: s.getAttribute('data-token-changes'), text: s.innerText.trim() } : null; })())`);
  record(
    `AC6 — after Put all back: 0 changed, --space-huge and the upgrade's tokens still there, the strip says "plus ${addedNow} you added"`,
    afterAll.length === 0 && (await tokenValue('--space-huge')) === '96px' && (await addedCount()) === addedNow && stripAfter && stripAfter.n === '0' && new RegExp(`plus ${addedNow} you added`).test(stripAfter.text),
    `changed=${afterAll.length} huge=${await tokenValue('--space-huge')} added=${await addedCount()} strip=${JSON.stringify(stripAfter)}`
  );
  await ev(`(() => { ${UNDO}.undo(); return 'ok'; })()`);
  await wait(800);
  record('… one ⌘Z brings all 46 back and keeps --space-huge', (await changed()).length === 46 && (await tokenValue('--space-huge')) === '96px', `changed=${(await changed()).length}`);
  await ev(`(() => { const m = new (${TOKENS_MODEL})(); m.deleteCustomToken('--space-huge'); m.dispose(); return 'ok'; })()`);
  await wait(300);

  // ── 7. AC7: a reset is SAVED and survives a reopen ───────────────────────
  await ev(CLICK('[data-test="token-change-reset---primary"]'));
  await wait(3000); // autosave arms at 1s after setMetaData
  const onDisk = storedOnDisk();
  const diskPrimary = onDisk.find((t) => t.name === '--primary');
  record('AC7 — the file on disk no longer stores an orange --primary', !diskPrimary || diskPrimary.value === '#2563eb', `stored=${onDisk.length} primary=${diskPrimary ? diskPrimary.value : 'absent (default)'}`);
  await ev(`(() => { window.__cmgRouter.route({ to: 'projects' }); return 'ok'; })()`);
  await wait(1500);
  const reopened = await openProject(PROJECT_DIR);
  record('AC7 — reopened the copy', reopened === 'ok', reopened);
  const primaryAfterReopen = await tokenValue('--primary');
  const changedAfterReopen = await changed();
  record('AC7 — after the reopen --primary is blue and 45 remain changed: the reset was saved, not only applied', primaryAfterReopen === '#2563eb' && changedAfterReopen.length === 45, `primary=${primaryAfterReopen} changed=${changedAfterReopen.length}`);
  await ev(`(() => { ${SIDEBAR}.switch('styles'); return 'ok'; })()`);
  await wait(800);
  await shot(editor, 'cmg004-end.png');

  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
