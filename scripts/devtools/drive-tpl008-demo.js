/**
 * TPL-008 AC10 — the todo list demo, driven as a DEPLOYED site (a folder, or the live host).
 *
 * `packages/nodegx-backend/tests/tpl008-todo-demo-drive.test.ts` grades the project through
 * `render-from-disk`. This grades what `nodegx deploy` wrote — the production engine, the
 * `--base-url` rewrite, the host's own headers — which is the thing a visitor gets.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs <demo-project> <site>/templates/todo-list --base-url /templates/todo-list/
 *   node scripts/devtools/drive-tpl008-demo.js <site> --path /templates/todo-list/ [--shots <dir>]
 *   node scripts/devtools/drive-tpl008-demo.js https://nodegx.io --path /templates/todo-list/
 *
 * 🔴 Point the directory at the SITE ROOT and `--path` at the demo, as TPL-006's drive does:
 * served at `/`, a `--base-url` build asks for `/templates/<slug>/index-<hash>.js` and renders
 * blank. Every clause here needs the example list on screen, so a blank page fails all of them.
 *
 * Clicks are real CDP mouse events — the deadline is pressed out of the Date Picker's calendar. Exits 0 when every clause passed, 1 when any did.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = flag('--shots');
const BASE = (flag('--path') || '/').replace(/\/?$/, '/');
if (!DIR) {
  console.error('usage: drive-tpl008-demo.js <site-dir|https://origin> [--path /templates/todo-list/] [--shots <dir>]');
  process.exit(2);
}

/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Demo.ts`. */
const STORAGE_KEY = 'nodegx-todo-list-demo-v1';
const SEEDED = ['Write the release notes', 'Book the van in for its MOT', 'Chase the accountant about VAT'];
const ADDED = 'Try the demo on a phone';
const BACKEND_SHAPE = `performance.getEntriesByType('resource').map(function (e) { return e.name; }).filter(function (n) {
  return /\\/(classes|users|login|logout|functions|__backend|parse)(\\/|\\?|$)/.test(n);
})`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
};

const LIVE = /^https?:\/\//.test(DIR);
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const text = async () => String(await page.evaluate('document.body.innerText'));
  const store = async () => {
    const raw = await page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    return typeof raw === 'string' ? JSON.parse(raw) : null;
  };
  const openTitles = async () =>
    ((await store())?.Task || [])
      .filter((t) => t.status !== 'done')
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((t) => t.title);
  const until = async (read, ok, ms = 15000) => {
    const end = Date.now() + ms;
    let last = await read();
    while (!ok(last) && Date.now() < end) {
      await wait(300);
      last = await read();
    }
    return last;
  };
  const press = async (at) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(900);
  };
  /** A button by its visible label (or its hidden name, for icon buttons), optionally inside the row that holds `within`. */
  const clickButton = async (label, within) => {
    const at = await page.evaluate(`(() => {
      const want = ${JSON.stringify(label)}, who = ${JSON.stringify(within || '')};
      const hits = [...document.querySelectorAll('button')].filter((b) => {
        if ((b.textContent || '').trim() !== want) return false;
        if (!who) return true;
        for (let el = b.parentElement; el; el = el.parentElement) {
          if ((el.innerText || '').includes(who)) return el.querySelectorAll('button').length <= 3;
        }
        return false;
      });
      const b = hits[0];
      if (!b) return null;
      b.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!at) return false;
    await press(at);
    return true;
  };
  const type = async (placeholderStart, value) => {
    const at = await page.evaluate(`(() => {
      const f = [...document.querySelectorAll('input, textarea')].find((i) => (i.getAttribute('placeholder') || '').startsWith(${JSON.stringify(placeholderStart)}));
      if (!f) return null;
      f.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = f.getBoundingClientRect();
      return { x: r.left + 20, y: r.top + r.height / 2 };
    })()`);
    if (!at) return false;
    await press(at);
    await page.client.send('Input.insertText', { text: value });
    await wait(400);
    return true;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };

  await page.setViewport({ width: 1280, height: 1100 });
  await page.navigate(BASE);
  // A clean visitor: whatever an earlier run left in this origin's storage is not theirs.
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);

  // ── The first visit ──────────────────────────────────────────────────────
  const boot = await until(text, (s) => s.includes(SEEDED[2]));
  const at = SEEDED.map((t) => boot.indexOf(t));
  check('opens on the example list, in order', at.every((i, k) => i >= 0 && (k === 0 || at[k - 1] < i)), JSON.stringify(at));
  check('says it is a demo and offers Reset demo, with no sign in', boot.includes('This is a demo.') && boot.includes('Reset demo') && !/Sign (in|out)/.test(boot), boot.slice(0, 300));
  check('draws the overdue task in words', boot.includes('Overdue by 1 day'), boot.slice(0, 300));
  const seeded = await store();
  check('puts the example list in this browser', !!seeded && seeded.Task.length === 4 && seeded.Event.length === 13, JSON.stringify(seeded && [seeded.Task.length, seeded.Event.length]));
  await shot('1-first-visit');

  // ── A change ─────────────────────────────────────────────────────────────
  const typed = await type('Add a task', ADDED);
  const added = typed && (await clickButton('Add', null)) && (await until(openTitles, (t) => t.includes(ADDED)));
  check('a task typed and added is written at the bottom', Array.isArray(added) && added[added.length - 1] === ADDED, JSON.stringify(added));
  await until(text, (s) => s.includes(ADDED));
  await clickButton('Move up', ADDED);
  const moved = await until(openTitles, (t) => t[2] === ADDED);
  check('Move up moves it', moved[2] === ADDED, JSON.stringify(moved));
  await wait(1200);
  const lines = ((await store())?.Event || []).filter((e) => e.kind === 'moved' && !String(e.taskId).startsWith('seed')).map((e) => e.summary);
  check('and writes the line saying so', JSON.stringify(lines) === JSON.stringify(['Moved #4 → #3']), JSON.stringify(lines));

  // ── It is still there ────────────────────────────────────────────────────
  const before = JSON.stringify(await store());
  await page.navigate(BASE);
  const again = await until(text, (s) => s.includes(ADDED));
  check('a reload keeps it', again.includes(ADDED) && JSON.stringify(await store()) === before, again.slice(0, 200));
  await shot('2-after-reload');

  // ── Reset ────────────────────────────────────────────────────────────────
  await clickButton('Reset demo', null);
  const reset = await until(openTitles, (t) => t.length === 3 && !t.includes(ADDED));
  const resetText = await until(text, (s) => !s.includes(ADDED));
  check('Reset demo puts the example list back', JSON.stringify(reset) === JSON.stringify(SEEDED) && !resetText.includes(ADDED), JSON.stringify(reset));

  // ── A deadline, from the calendar (2026-09-16: the field became the Date Picker) ─
  // Five days out: always in the future, at most one calendar page away, and inside "Due in N days".
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  const SOON = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;
  const centre = (selector) =>
    page.evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(selector)});
      if (!e) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
  const titleAt = await page.evaluate(`(() => {
    const leaf = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(SEEDED[0])});
    if (!leaf) return null;
    const r = leaf.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (titleAt) await press(titleAt);
  const fieldAt = await until(() => centre('.ndg-dp-input'), (v) => !!v, 5000);
  const inputType = await page.evaluate(`(document.querySelector('.ndg-dp-input') || {}).type || 'absent'`);
  if (fieldAt) await press(fieldAt);
  const calendar = await until(() => page.evaluate(`!!document.querySelector('.ndg-dp-pop')`), (v) => v === true, 5000);
  await shot('2b-calendar');
  for (let i = 0; calendar && i < 3; i++) {
    const day = await centre(`.ndg-dp-pop [data-day="${SOON}"]`);
    if (day) {
      await press(day);
      break;
    }
    const next = await centre('.ndg-dp-pop [data-nav="1"]');
    if (next) await press(next);
  }
  const written = await until(async () => ((await store())?.Task || []).find((t) => t.title === SEEDED[0])?.deadline, (d) => d === SOON);
  const said = await until(text, (s) => s.includes('Due in 5 days'));
  check(
    'a deadline is picked from a calendar, stored, and said in words',
    inputType === 'date' && calendar === true && written === SOON && said.includes('Due in 5 days'),
    JSON.stringify({ inputType, calendar, written, wanted: SOON, said: said.includes('Due in 5 days') })
  );
  await clickButton('Reset demo', null);
  await until(openTitles, (t) => JSON.stringify(t) === JSON.stringify(SEEDED));

  // ── Light and dark (the system decides, the switch at the top right overrides) ─
  // `THEME_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Theme.ts`; the grounds are `--background` of each palette.
  const THEME_KEY = 'nodegx-todo-list-theme';
  const LIGHT = 'rgb(245, 245, 243)';
  const DARK = 'rgb(22, 23, 24)';
  const system = (value) => page.client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
  const look = async () =>
    JSON.parse(
      String(
        await page.evaluate(`JSON.stringify({
          ground: getComputedStyle(document.body).backgroundColor,
          stored: localStorage.getItem(${JSON.stringify(THEME_KEY)}),
          inDom: [...document.querySelectorAll('button')].filter((b) => /^Use (dark|light) theme$/.test((b.textContent || '').trim())).length,
          shown: [...document.querySelectorAll('button')]
            .filter((b) => /^Use (dark|light) theme$/.test((b.textContent || '').trim()) && b.getBoundingClientRect().width > 0)
            .map((b) => b.textContent.trim())
        })`)
      )
    );
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`);
  await system('light');
  const light = await until(look, (l) => l.ground === LIGHT);
  check('a light system draws light, with only the moon showing', light.ground === LIGHT && light.inDom === 2 && JSON.stringify(light.shown) === '["Use dark theme"]', JSON.stringify(light));
  await system('dark');
  const dark = await until(look, (l) => l.ground === DARK);
  check('a dark system draws dark, with only the sun showing, and nothing remembered', dark.ground === DARK && dark.inDom === 2 && JSON.stringify(dark.shown) === '["Use light theme"]' && dark.stored === null, JSON.stringify(dark));
  await clickButton('Use light theme', null);
  const chosen = await until(look, (l) => l.ground === LIGHT);
  check('the switch picks light on a dark system, and remembers it', chosen.ground === LIGHT && chosen.stored === 'light', JSON.stringify(chosen));
  await page.navigate(BASE);
  await until(text, (s) => s.includes(SEEDED[2]));
  const kept = await until(look, (l) => l.ground === LIGHT, 5000);
  check('a reload keeps the choice', kept.ground === LIGHT && kept.stored === 'light', JSON.stringify(kept));
  await shot('3-light-chosen-on-dark');
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`);
  await system('light');

  // ── Nothing else was asked ───────────────────────────────────────────────
  const errors = [...page.consoleErrors];
  const netErrors = [...page.networkErrors];
  check('logs no console errors', errors.length === 0, JSON.stringify(errors));
  check('no request failed', netErrors.length === 0, JSON.stringify(netErrors));
  const asked = JSON.parse(String(await page.evaluate(`JSON.stringify(${BACKEND_SHAPE})`)));
  await page.evaluate("fetch('classes/Probe').then(() => 1, () => 0)");
  await wait(1200);
  const probe = JSON.parse(String(await page.evaluate(`JSON.stringify(${BACKEND_SHAPE})`)));
  check('asks no backend anything (beside a control request the same reading sees)', asked.length === 0 && probe.some((n) => n.includes('/classes/Probe')), JSON.stringify({ asked, probe }));
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
})
  .then(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} clauses`);
    process.exit(failed === 0 && results.length > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
