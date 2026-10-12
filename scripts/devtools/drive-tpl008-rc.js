/**
 * TPL-008-RC — Today and things that repeat, driven on the DEPLOYED demo (a folder, or the live host).
 *
 * `packages/nodegx-backend/tests/tpl008-recurring-demo-drive.test.ts` grades the project through
 * `render-from-disk` (the checkout's engine). This grades what `nodegx deploy` wrote — the production
 * engine a visitor gets — on the clauses that matter most: Today's order, a tick with no note, a new
 * item made Tue + Thu at 09:00, the reminder link, a phone, and no console errors.
 *
 * Usage (as drive-tpl008-demo.js):
 *   node scripts/devtools/drive-tpl008-rc.js <site> --path /templates/todo-list/ [--shots <dir>]
 *   node scripts/devtools/drive-tpl008-rc.js https://nodegx.io --path /templates/todo-list/
 *
 * Exits 0 when every clause passed, 1 when any did not.
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
  console.error('usage: drive-tpl008-rc.js <site-dir|https://origin> [--path /templates/todo-list/] [--shots <dir>]');
  process.exit(2);
}

/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Demo.ts`. */
const STORAGE_KEY = 'nodegx-todo-list-demo-v1';
const TABLETS = 'Take the tablets';
const CLIENT = 'Call the client about the invoice';
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const TODAY = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
const WEEKDAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];

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
  const routine = async (title) => ((await store())?.Routine || []).find((r) => r.title === title);
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
  /** The centre of the first element the expression finds, scrolled into view — or null. */
  const locate = (expr) =>
    page.evaluate(`(() => {
      const e = ${expr};
      if (!e) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
  const pressFound = async (expr) => {
    const at = await locate(expr);
    if (!at) return false;
    await press(at);
    return true;
  };
  /** The last button labelled exactly `label` — a dialog's OK sits after the page's own buttons. */
  const button = (label, first) =>
    `(() => { const b = [...document.querySelectorAll('button')].filter((x) => (x.textContent || '').trim() === ${JSON.stringify(label)}); return b[${first ? 0 : 'b.length - 1'}]; })()`;
  const buttonStarting = (prefix) =>
    `[...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim().startsWith(${JSON.stringify(prefix)}))`;
  /** The one button in the smallest box around a leaf reading `title` that also reads `time`. */
  const todayTick = (time, title) => `(() => {
    const leaves = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(title)});
    for (const leaf of leaves) {
      for (let el = leaf.parentElement; el; el = el.parentElement) {
        const bs = el.querySelectorAll('button');
        if (bs.length === 0) continue;
        if (bs.length !== 1) break;
        if (!(el.innerText || '').split('\\n').map((s) => s.trim()).includes(${JSON.stringify(time)})) break;
        return bs[0];
      }
    }
    return null;
  })()`;
  const type = async (placeholderStart, value) => {
    const found = await pressFound(
      `[...document.querySelectorAll('input, textarea')].find((i) => (i.getAttribute('placeholder') || '').startsWith(${JSON.stringify(placeholderStart)}))`
    );
    if (!found) return false;
    await page.client.send('Input.insertText', { text: value });
    await wait(400);
    return true;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `rc-${name}.png`));
  };

  await page.setViewport({ width: 1280, height: 1100 });
  await page.navigate(BASE);
  // A clean visitor: whatever an earlier run left in this origin's storage is not theirs.
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);
  await until(text, (s) => s.includes('Today ('));

  // ── Today ───────────────────────────────────────────────────────────────
  await pressFound(buttonStarting('Today ('));
  const today = await until(text, (s) => s.includes('Things that repeat'));
  const order = ['Overdue', '08:00', '20:00', 'Next 7 days', 'Things that repeat'].map((w) => today.indexOf(w));
  check('Today: overdue, then what repeats by its time, then the next 7 days, then everything that repeats', order.every((i, k) => i >= 0 && (k === 0 || order[k - 1] < i)), JSON.stringify(order));
  await shot('1-today');

  // ── A tick with no note ─────────────────────────────────────────────────
  await pressFound(todayTick('08:00', TABLETS));
  await until(text, (s) => s.includes('Done. Anything to add?'));
  const enabled = await page.evaluate(`(${button('Done')} || {}).disabled === false`);
  check('the tick asks, and Done works with no note', enabled === true, String(enabled));
  await pressFound(button('Done'));
  const checks = await until(
    async () => ((await store())?.RoutineCheck || []).filter((c) => c.routineId === 'seed-routine-tablets' && c.date === TODAY && c.time === '08:00'),
    (c) => c.length === 1
  );
  check('it logs that one occurrence — that day, that time — in this browser', checks.length === 1 && checks[0].note === '', JSON.stringify(checks));
  const gone = await until(async () => !(await locate(todayTick('08:00', TABLETS))), (v) => v === true);
  check('and it leaves Today', gone === true, String(gone));

  // ── A new one, Tue and Thu at 09:00 ─────────────────────────────────────
  await type('Add something that repeats', CLIENT);
  await pressFound(
    `(() => { const f = [...document.querySelectorAll('input')].find((i) => (i.getAttribute('placeholder') || '').startsWith('Add something that repeats')); for (let el = f && f.parentElement; el; el = el.parentElement) { const b = [...el.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Add'); if (b) return b; } return null; })()`
  );
  const added = await until(() => routine(CLIENT), (r) => !!r);
  check('a new one is every day at 09:00 from today', !!added && added.cadence === 'daily' && added.slots === '09:00' && added.startDate === TODAY, JSON.stringify(added));
  await until(text, (s) => s.includes('Stop it'));
  await pressFound(button('Every week', true));
  await until(() => routine(CLIENT), (r) => r && r.cadence === 'weekly');
  await pressFound(button('Tue', true));
  await pressFound(button('Thu', true));
  await type('A time, like', '9');
  await pressFound(button('Add time', true));
  await until(() => routine(CLIENT), (r) => r && /tue@09:00/.test(r.slots) && /thu@09:00/.test(r.slots));
  if (WEEKDAY !== 'tue' && WEEKDAY !== 'thu') {
    await pressFound(`(() => { const l = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(`${WEEKDAY_NAME} 09:00`)}); const b = l && l.parentElement.querySelector('button'); return b && (b.textContent || '').trim() === '✕' ? b : null; })()`);
  }
  const weekly = await until(() => routine(CLIENT), (r) => r && r.slots === 'tue@09:00,thu@09:00');
  const said = await until(text, (s) => s.includes('Every Tue and Thu at 09:00'));
  check('Every week, Tue and Thu, 9: it is Tuesdays and Thursdays at 09:00, and says so', weekly?.slots === 'tue@09:00,thu@09:00' && said.includes('Every Tue and Thu at 09:00'), JSON.stringify(weekly));
  await shot('2-weekly');

  // ── The reminder's link, after a reload ─────────────────────────────────
  const before = JSON.stringify(await store());
  await page.navigate(`${BASE}?view=today`);
  const linked = await until(text, (s) => s.includes('Things that repeat'));
  check('a reminder’s link (?view=today) opens Today', linked.includes('Things that repeat'), linked.slice(0, 200));
  await wait(800);
  check('and the reload kept everything', JSON.stringify(await store()) === before, 'the store changed');

  // ── A phone ─────────────────────────────────────────────────────────────
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.navigate(`${BASE}?view=today`);
  await until(text, (s) => s.includes('Things that repeat'));
  await wait(800);
  const width = await page.evaluate('document.documentElement.scrollWidth');
  check('on a phone nothing scrolls sideways', width === 390, String(width));
  await shot('3-phone');

  const errors = [...page.consoleErrors];
  check('no console errors', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
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
