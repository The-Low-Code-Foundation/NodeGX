#!/usr/bin/env node
/**
 * P99 HLT-013 — press every "Read docs" button in the node picker, and ask where it goes.
 *
 * The bar this phase ruled: a **driven session**, never a green suite. So this opens a project
 * through the launcher's real "Open project…" button, opens the node picker from the topbar's
 * real "Add node to graph" button, walks both library tabs, and presses each "Read docs" button
 * with a trusted CDP click.
 *
 * ## What it reads
 *
 * `PrimaryButton` has no `href` in the DOM — it calls `platform.openExternal(url)` on press. So
 * the drive replaces `openExternal` with a recorder **before** the first press: the URL a person
 * would have been sent to is captured, and 70 browser tabs are not opened on the machine running
 * this. Every captured URL is then requested and its status recorded. That is the consequence;
 * the button existing is only the mechanism ([[verify-the-consequence-not-just-the-mechanism]]).
 *
 * ## The arms
 *
 *   --expect fixed    this build. Every drawn button's press opens a page that answers 200.
 *   --expect firing   ModuleCard.tsx at HEAD, i.e. before HLT-013. Every press opens a 404.
 *
 * The control swaps ONE file — `git show HEAD:<ModuleCard.tsx>` — waits for the dev server to
 * recompile it, and reloads. It parks the working copy and copies it back; never
 * `git checkout --`, which would take a peer's unstaged edit with it.
 *
 * ## ⚠️ Where the fixed arm's pages are read from
 *
 * The docs site deploys on a merge to `main`, so on this branch the pages are **built, not
 * served**. `--docs-root http://localhost:PORT` rewrites the docs origin in each captured URL to
 * a local `docusaurus serve` of `docs-site/build` — the tree `deploy-docs.yml` uploads. The URL
 * the button produces is recorded unrewritten, and graded against the deployed origin's shape.
 * After a deploy, run without `--docs-root` and the same arm grades the live site.
 *
 * ## The reach arm
 *
 * Counted, and the run fails if they are off: the project that opened, the cards drawn on each
 * tab (46 prefabs + 32 modules in the published index), the buttons drawn, and — per press — that
 * the element under the pointer IS that button ([[a-rendered-surface-can-be-behind-a-blocker]]),
 * and that exactly one URL was recorded for it. A press that records nothing is a press that
 * missed, and a drive that counted only 404s would read a missed press as a pass.
 *
 * Usage (a stack started with `NOODL_USER_DATA_DIR=<scratch>` must already be up):
 *   node scripts/devtools/drive-hlt013-read-docs.js --expect fixed  --project <copy> --docs-root http://localhost:3917
 *   node scripts/devtools/drive-hlt013-read-docs.js --expect firing --project <copy>
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const CDP = path.join(__dirname, 'cdp.js');
const CARD = 'packages/noodl-editor/src/editor/src/views/NodePicker/components/ModuleCard/ModuleCard.tsx';
const DEPLOYED_DOCS = 'https://the-low-code-foundation.github.io/NodeGX/docs';
const CONTENT = 'https://the-low-code-foundation.github.io/nodegx-content/static';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
};
const EXPECT = arg('expect');
const PROJECT = arg('project');
const DOCS_ROOT = arg('docs-root');
const OUT = arg('out', path.join(REPO, 'dev-docs/tasks/phase-99-the-ones-nobody-owned/verdicts/HLT-013', new Date().toISOString().slice(0, 10)));
if (!['fixed', 'firing'].includes(EXPECT) || !PROJECT) {
  console.error('usage: --expect fixed|firing --project <dir> [--docs-root http://localhost:PORT]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function ev(expr) {
  const out = execFileSync('node', [CDP, 'eval', expr], { encoding: 'utf8', timeout: 60000, stdio: 'pipe' });
  const line = out.trim().split('\n').pop();
  try {
    return JSON.parse(line);
  } catch (_e) {
    return line;
  }
}
const click = (sel) => execFileSync('node', [CDP, 'click', sel], { encoding: 'utf8', timeout: 30000, stdio: 'pipe' });

async function until(label, expr, ms = 60000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const v = ev(expr);
    if (v === true || (typeof v === 'number' && v > 0)) return v;
    await wait(1000);
  }
  throw new Error(`timed out waiting for ${label}`);
}

const BOOT = `(() => {
  if (typeof window.__wreq !== 'function') webpackChunknoodl_editor.push([[Symbol()], {}, (r) => { window.__wreq = r; }]);
  const P = window.__wreq('../noodl-platform/src/index.ts');
  window.__hlt013 = { opened: [] };
  P.platform.openExternal = (url) => {
    window.__hlt013.opened.push(String(url));
    (window.__hlt013.stacks = window.__hlt013.stacks || []).push(new Error().stack.split('\\n').slice(1, 9).join(' | '));
  };
  P.filesystem.openDialog = async () => ${JSON.stringify(PROJECT)};
  return typeof P.platform.openExternal;
})()`;

/** Tag the first element matching a predicate so `cdp click` can address it by selector. */
const tagButtonByText = (tag, text) => `(() => {
  document.querySelectorAll('[data-hlt013="${tag}"]').forEach((e) => e.removeAttribute('data-hlt013'));
  const b = [...document.querySelectorAll('button,[role=tab],div')].find((e) => e.children.length < 4 && e.innerText && e.innerText.trim() === ${JSON.stringify(text)});
  if (!b) return false;
  b.setAttribute('data-hlt013', '${tag}');
  return true;
})()`;

/** The topbar's add-node button has no text and no test id; its Tooltip's props name it. */
const TAG_ADD_NODE = `(() => {
  for (const el of document.querySelectorAll('button')) {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
    for (let f = el[key]; f; f = f.return) {
      if (f.memoizedProps && f.memoizedProps.content === 'Add node to graph') {
        el.setAttribute('data-hlt013', 'add-node');
        return true;
      }
    }
  }
  return false;
})()`;

const READ_DOCS = `[...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Read docs')`;

async function swapCard(toHead) {
  const parked = path.join(REPO, '.hlt013-ModuleCard.parked');
  if (toHead) {
    fs.copyFileSync(path.join(REPO, CARD), parked);
    fs.writeFileSync(path.join(REPO, CARD), execFileSync('git', ['show', `HEAD:${CARD}`], { cwd: REPO }));
  } else {
    fs.copyFileSync(parked, path.join(REPO, CARD));
    fs.rmSync(parked);
  }
}

async function probe(url) {
  const target = DOCS_ROOT && url.startsWith(DEPLOYED_DOCS) ? DOCS_ROOT + '/NodeGX/docs' + url.slice(DEPLOYED_DOCS.length) : url;
  try {
    const res = await fetch(target, { redirect: 'follow' });
    return { target, status: res.status };
  } catch (e) {
    return { target, status: null, error: e.message };
  }
}

async function main() {
  const t0 = new Date().toISOString();
  if (EXPECT === 'firing') {
    await swapCard(true);
    await wait(15000); // the dev server recompiles one module
  }

  try {
    execFileSync('node', [CDP, 'reload'], { stdio: 'pipe', timeout: 60000 });
    await wait(8000);
    await until('launcher Open button', `[...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Open project…')`, 90000);
    ev(BOOT);

    // The bundle must be the arm: HLT-013's card calls hasLibraryDocsPage, HEAD's does not.
    // ⚠️ Graded IN the renderer, returning a boolean. The first version returned the module's
    // source and tested it here — but `ev` keeps the LAST LINE of the CLI's output, so a 25 KB
    // multi-line string was graded on its final line and a fixed build read as HEAD.
    const cardIsFixed = ev(`/hasLibraryDocsPage/.test(String(window.__wreq.m['./src/editor/src/views/NodePicker/components/ModuleCard/ModuleCard.tsx']))`) === true;

    if (!ev(tagButtonByText('open', 'Open project…'))) throw new Error('no "Open project…" button');
    click('[data-hlt013="open"]');
    await until('the project to open', `(() => { const p = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance; return !!(p && p._retainedProjectDirectory); })()`, 120000);
    const openedDir = ev(`window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance._retainedProjectDirectory`);
    await wait(4000);

    await until('the add-node button', TAG_ADD_NODE, 60000);
    click('[data-hlt013="add-node"]');
    await wait(1500);

    const tabs = {};
    for (const tab of ['Prefabs', 'Modules']) {
      await until(`the ${tab} tab`, tagButtonByText('tab', tab), 30000);
      click('[data-hlt013="tab"]');
      // Cards arrive when the index fetch resolves. Wait for the count to stop moving.
      let last = -1;
      let cards = 0;
      for (let i = 0; i < 30; i++) {
        await wait(1000);
        cards = ev(`[...document.querySelectorAll('button')].filter((b) => /^(Install|Clone)$/.test(b.innerText.trim())).length`);
        if (cards > 0 && cards === last) break;
        last = cards;
      }
      const buttons = ev(`${READ_DOCS}.length`);

      const presses = [];
      for (let i = 0; i < buttons; i++) {
        const before = ev(`window.__hlt013.opened.length`);
        const reach = ev(`(() => {
          document.querySelectorAll('[data-hlt013="press"]').forEach((e) => e.removeAttribute('data-hlt013'));
          const b = ${READ_DOCS}[${i}];
          b.scrollIntoView({ block: 'center' });
          b.setAttribute('data-hlt013', 'press');
          const card = b.closest('[class*="Root"]');
          const label = card ? (card.querySelector('h1,h2,h3,[class*="Title"]') || {}).innerText : null;
          return { label: label || null };
        })()`);
        click('[data-hlt013="press"]');
        await wait(150);
        const after = ev(`window.__hlt013.opened.length`);
        const hit = ev(`(() => { const b = document.querySelector('[data-hlt013="press"]'); if (!b) return false; const r = b.getBoundingClientRect(); const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!at && b.contains(at); })()`);
        const url = after > before ? ev(`window.__hlt013.opened[${after - 1}]`) : null;
        presses.push({ label: reach.label, hit, recorded: after - before, url });
      }
      tabs[tab] = { cards, buttons, presses };
    }

    // The consequence: where each press would have sent a person.
    for (const tab of Object.values(tabs)) {
      for (const p of tab.presses) if (p.url) Object.assign(p, await probe(p.url));
    }

    const all = Object.values(tabs).flatMap((t) => t.presses);
    const cards = Object.values(tabs).reduce((n, t) => n + t.cards, 0);
    const summary = {
      arm: EXPECT,
      at: t0,
      cardIsFixed,
      openedDir,
      cards,
      buttons: all.length,
      pressesThatMissed: all.filter((p) => !p.hit || p.recorded !== 1).length,
      toDocsOrigin: all.filter((p) => p.url && p.url.startsWith(DEPLOYED_DOCS)).length,
      toContentOrigin: all.filter((p) => p.url && p.url.startsWith(CONTENT)).length,
      answered200: all.filter((p) => p.status === 200).length,
      answered404: all.filter((p) => p.status === 404).length,
      other: all.filter((p) => p.status !== 200 && p.status !== 404).map((p) => ({ url: p.url, status: p.status }))
    };

    const reached = summary.openedDir === PROJECT && cards >= 78 && summary.pressesThatMissed === 0;
    const armIsRight = EXPECT === 'fixed' ? cardIsFixed : !cardIsFixed;
    const verdict =
      EXPECT === 'fixed'
        ? reached && armIsRight && summary.buttons === 70 && summary.answered200 === 70 && summary.toContentOrigin === 0
        : reached && armIsRight && summary.buttons === 78 && summary.answered404 === 78;

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `drive-${EXPECT === 'firing' ? 'control' : 'fixed'}.json`), JSON.stringify({ summary, tabs }, null, 2) + '\n');
    console.log(JSON.stringify(summary, null, 2));
    console.log(`\nREACHED: ${reached}  ARM: ${armIsRight}  VERDICT (${EXPECT}): ${verdict ? 'PASS' : 'FAIL'}`);
    process.exitCode = verdict ? 0 : 1;
  } finally {
    if (EXPECT === 'firing') await swapCard(false);
  }
}

main().catch((e) => {
  console.error(e.message);
  if (EXPECT === 'firing' && fs.existsSync(path.join(REPO, '.hlt013-ModuleCard.parked'))) {
    fs.copyFileSync(path.join(REPO, '.hlt013-ModuleCard.parked'), path.join(REPO, CARD));
    fs.rmSync(path.join(REPO, '.hlt013-ModuleCard.parked'));
  }
  process.exit(1);
});
