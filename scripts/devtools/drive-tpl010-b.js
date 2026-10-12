/**
 * TPL-010-B — billing made clear, driven as a DEPLOYED demo with real clicks (§4 of the task).
 *
 * Richard's case, pressed the way he would: + New project, Fixed, One bill, €2,400, the day it goes
 * out, Save — then the card's "Sent the invoice? Mark it", Mark as sent, and "Been paid? Tick it".
 * Then the ways a bill must NOT be added: editing a project that has bills, a Building project, and
 * a second new project that must not inherit the day picked on the first.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planning-demo <site>/templates/planning --base-url /templates/planning/ --allow-development-engine
 *   node scripts/devtools/drive-tpl010-b.js <site> --path /templates/planning/ [--shots <dir>]
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
  console.error('usage: drive-tpl010-money.js <site-dir|https://origin> [--path /templates/planning/] [--shots <dir>]');
  process.exit(2);
}

/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl010Demo.ts`. */
const STORAGE_KEY = 'nodegx-planner-demo-v3';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
};

const LIVE = /^https?:\/\//.test(DIR);
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const js = (expr) => page.evaluate(expr);
  const text = async () => String(await js('document.body.innerText'));
  const store = async () => {
    const raw = await js(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    return typeof raw === 'string' ? JSON.parse(raw) : null;
  };
  const until = async (read, ok, ms = 12000) => {
    const end = Date.now() + ms;
    let last = await read();
    while (!ok(last) && Date.now() < end) {
      await wait(250);
      last = await read();
    }
    return last;
  };
  const press = async (at) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(700);
  };
  const key = async (k) => {
    for (const type of ['keyDown', 'keyUp']) await page.client.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : 13 });
    await wait(600);
  };
  const centre = (finder) =>
    js(`(() => {
      const el = ${finder};
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, reachable: !!hit && (hit === el || el.contains(hit) || hit.contains(el)) };
    })()`);
  const buttonFinder = (label, nth = -1) =>
    `(() => { const all = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === ${JSON.stringify(label)} && b.getClientRects().length); return all.at(${nth}); })()`;
  const clickButton = async (label, nth = -1) => {
    const at = await centre(buttonFinder(label, nth));
    if (!at) return false;
    await press(at);
    return true;
  };
  /** A visible leaf element whose words are exactly `words` — a line in the Money list is a Group, not a button. */
  // The last match: what is over the week (the modal, the card) comes after it in the page.
  const textFinder = (words, nth = -1) =>
    `(() => { const all = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(words)} && e.getClientRects().length); return all.at(${nth}); })()`;
  const clickText = async (words, nth = -1) => {
    const at = await centre(textFinder(words, nth));
    if (!at) return false;
    await press(at);
    return true;
  };
  const boxFinder = (label) =>
    `(() => {
      const labels = [...document.querySelectorAll('label')].filter((l) => (l.textContent || '').trim() === ${JSON.stringify(label)} && l.getClientRects().length);
      const l = labels.at(-1);
      if (!l) return null;
      return (l.htmlFor && document.getElementById(l.htmlFor)) || l.parentElement.querySelector('input, textarea');
    })()`;
  const fill = async (label, value) => {
    const at = await centre(boxFinder(label));
    if (!at) return false;
    await press(at);
    await js(`(() => { const el = ${boxFinder(label)}; el.select && el.select(); })()`);
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    if (value !== '') await page.client.send('Input.insertText', { text: String(value) });
    await wait(400);
    return true;
  };
  const valueOf = (label) => js(`(() => { const el = ${boxFinder(label)}; return el ? el.value : null; })()`);
  const choose = (label) =>
    js(`(() => {
      const selects = [...document.querySelectorAll('select')].filter((s) => s.getClientRects().length && [...s.options].some((o) => o.textContent.trim() === ${JSON.stringify(label)}));
      const s = selects.at(-1);
      if (!s) return false;
      const o = [...s.options].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value);
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  const dates = () => js(`[...document.querySelectorAll('input[type=date]')].filter((i) => i.getClientRects().length).map((i) => i.value)`);
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const modalOpen = () => js(`[...document.querySelectorAll('*')].some((e) => e.children.length === 0 && (e.textContent || '').trim() === 'Recurring' && e.getClientRects().length)`);

  const pad = (n) => (n < 10 ? '0' : '') + n;
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plus = (n) => {
    const d = new Date(today);
    d.setDate(today.getDate() + n);
    return d;
  };
  const item = (s, id) => (s.MoneyItem || []).find((r) => r.id === `seed-money-${id}`);
  /** Set a Date picker by its label (the picker names its field with it), and commit it with Enter. */
  const pickDateNamed = async (label, iso) => {
    const find = `[...document.querySelectorAll('input[type=date]')].filter((i) => i.getClientRects().length && i.getAttribute('aria-label') === ${JSON.stringify(label)}).at(-1)`;
    const at = await centre(find);
    if (!at) return false;
    await js(`(() => {
      const i = ${find};
      i.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(iso)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await key('Enter');
    await js('document.activeElement && document.activeElement.blur()');
    await wait(400);
    return true;
  };
  const dateNamed = (label) =>
    js(`(() => { const i = [...document.querySelectorAll('input[type=date]')].filter((x) => x.getClientRects().length && x.getAttribute('aria-label') === ${JSON.stringify(label)}).at(-1); return i ? i.value : null; })()`);
  const seen = (words) => js(`[...document.querySelectorAll('*')].some((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(words)} && e.getClientRects().length)`);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const words = (d) => `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const billsOf = (s, pid) => (s.MoneyItem || []).filter((m) => m.projectId === pid);
  const projectNamed = (s, name) => (s.Project || []).find((p) => p.name === name);

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);
  await until(text, (s) => s.includes('Planning') && s.includes('Break-even'));
  const itemsAtStart = ((await store()).MoneyItem || []).length;

  // ── B1 / B2: a new project asks for its bill, and says what Save will do ──
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickButton('+ New project');
  const blank = await until(text, (s) => /when do you bill\?/i.test(s));
  check('B1 — a new project has Billing with When do you bill?, on One bill', /billing/i.test(blank) && /when do you bill\?/i.test(blank) && blank.includes('One bill, when the work is done'), blank.slice(-1500));
  check('B2 — hourly, no day yet: the form asks for the day', blank.includes('Pick the day the bill goes out, and saving adds the bill.'), blank.slice(-1500));
  check('B9 — no Slot and no Rung boxes', !(await seen('Slot')) && !(await seen('Rung')), '');
  await fill('Name', 'Linguaid Training');
  await choose('Fixed: a set price, whatever the hours');
  const fixed = await until(text, (s) => s.includes('Type the amount and pick the day'));
  check('B1 — Fixed swaps the hourly rate for the agreed hours, and asks for the amount', !(await seen('Rate, per hour')) && (await seen('Agreed hours (optional)')) && (await seen('Amount, €')), fixed.slice(-1500));
  await fill('Payment terms, days', '14');
  await fill('Amount, €', '2400');
  const out = new Date(today);
  out.setDate(today.getDate() + 23);
  const due = new Date(out);
  due.setDate(out.getDate() + 14);
  await pickDateNamed('Bill goes out', dayKey(out));
  const said = `Saving adds the bill: €2,400, goes out ${words(out)}, due ${words(due)}.`;
  const ready = await until(text, (s) => s.includes(said));
  check('B2 — the sentence says the bill Save will add', ready.includes(said) && ready.includes('The hours you log are a record and never change it.'), ready.slice(-1500));
  await shot('b1-new-fixed');

  // ── B-1: Save writes the project and exactly one bill ──
  await clickButton('Save');
  const saved = await until(store, (s) => !!projectNamed(s, 'Linguaid Training') && billsOf(s, projectNamed(s, 'Linguaid Training').id).length > 0);
  const lx = projectNamed(saved, 'Linguaid Training');
  const lxBills = lx ? billsOf(saved, lx.id) : [];
  const b = lxBills[0] || {};
  check('B-1 — Save writes the project (fixed, 14 days) and ONE bill: +€2,400, once, its day, due 14 days later',
    !!lx && lx.billing === 'fixed' && Number(lx.termsDays) === 14 && lxBills.length === 1 && Number(b.amount) === 2400 && b.repeat === 'once' && b.billDate === dayKey(out) && b.date === dayKey(due) && Number(b.likelihood) === 100,
    JSON.stringify({ lx, lxBills }));
  check('B-1 — the project keeps no bill fields of its own', !!lx && !('billAmount' in lx) && !('billWhen' in lx) && !('slot' in lx && lx.slot !== ''), JSON.stringify(lx));
  const logged = (saved.PlanEvent || []).find((e) => lx && e.projectId === lx.id && e.kind === 'created');
  check('B-1 — its history says it started with its bill', !!logged && logged.summary === `Project started as “Linguaid Training”, with its bill: €2,400, goes out ${words(out)}`, JSON.stringify(logged));
  const card = await until(text, (s) => s.includes('Sent the invoice? Mark it'));
  check('B5 — the card shows the bill, the invoice words once, and “Sent the invoice? Mark it”',
    card.includes(`one bill, €2,400, goes out ${words(out)}, due ${words(due)}`) && card.includes('Planning doesn’t make the invoice. Send yours as usual, then mark the bill sent.') && card.includes('Sent the invoice? Mark it') &&
    !card.includes('Add a project and it appears here.'),
    card.slice(-1800));
  await shot('b2-card');

  // ── B-6: the button opens the bill in Money; Mark as sent; then the payment ──
  await clickButton('Sent the invoice? Mark it');
  const pane = await until(text, (s) => s.includes('Planning doesn’t make the invoice: send yours as usual'));
  check('B6 — it opens Money on the bill, with Mark as sent', (await modalOpen()) && (await seen('Mark as sent')) && pane.includes(`The payment is its own tick, due ${words(due)}.`), pane.slice(-1200));
  await shot('b3-money-bill');
  await clickButton('Mark as sent');
  const marked = await until(store, (s) => (s.MoneyMark || []).some((m) => m.itemId === b.id && m.sentOn));
  check('B-6 — Mark as sent records the day it went out', (marked.MoneyMark || []).some((m) => m.itemId === b.id && m.sentOn === dayKey(today)), JSON.stringify((marked.MoneyMark || []).filter((m) => m.itemId === b.id)));
  await key('Escape');
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickText('Linguaid Training');
  const after = await until(text, (s) => s.includes('Been paid? Tick it'));
  check('B-6 — once sent, the card offers “Been paid? Tick it”, and the invoice words are gone', after.includes('Been paid? Tick it') && !after.includes('Planning doesn’t make the invoice. Send yours'), after.slice(-1500));
  await clickButton('Been paid? Tick it');
  const tick = await until(text, (s) => /did it happen\?/i.test(s));
  check('B-6 — it opens the payment, ready to tick', /did it happen\?/i.test(tick) && (await modalOpen()), tick.slice(-900));
  await key('Escape');

  // ── B-4: editing a project with bills never adds one ──
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickText('Linguaid Training');
  await until(text, (s) => s.includes('Been paid? Tick it'));
  await clickButton('Edit');
  const edit = await until(text, (s) => s.includes('Its bills are on the card, under Billing:'));
  check('B3 — the form lists its bills instead of offering one', edit.includes(`Its bills are on the card, under Billing: one bill, €2,400, goes out ${words(out)}, due ${words(due)}. Change them there.`) && !(await seen('When do you bill?')), edit.slice(-1500));
  await fill('Name', 'Linguaid LX campus');
  await clickButton('Save');
  const renamed = await until(store, (s) => !!projectNamed(s, 'Linguaid LX campus'));
  check('B-4 — saving the rename writes no second bill', billsOf(renamed, lx.id).length === 1, JSON.stringify(billsOf(renamed, lx.id)));

  // ── B-5 and the trap: a Building project has no Billing; a new form does not keep the last day ──
  await until(text, (s) => s.includes('+ New project'));
  await clickButton('+ New project');
  await until(text, (s) => /when do you bill\?/i.test(s));
  check('🔴 a new form does not keep the day picked on the last one', (await dateNamed('Bill goes out')) === '', String(await dateNamed('Bill goes out')));
  await choose('Building: pays later, if it lands');
  await wait(500);
  const building = await text();
  check('B4 — Building work has no rate, no terms and no bill', !(await seen('When do you bill?')) && !(await seen('Payment terms, days')) && !(await seen('Rate, per hour')) &&
    building.includes('The next thing to do on it, and what it could lead to, in words.'), building.slice(-1200));
  await fill('Name', 'Course idea');
  await clickButton('Save');
  const built = await until(store, (s) => !!projectNamed(s, 'Course idea'));
  check('B-5 — saving it writes no bill', billsOf(built, projectNamed(built, 'Course idea').id).length === 0 && (built.MoneyItem || []).length === itemsAtStart + 1, `${(built.MoneyItem || []).length} items, ${itemsAtStart} at start`);
  await shot('b4-building');
  await key('Escape');

  // ── The phone and the laptop window ──
  await page.setViewport({ width: 390, height: 844 });
  await wait(600);
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickButton('+ New project');
  await until(text, (s) => /when do you bill\?/i.test(s));
  await choose('Fixed: a set price, whatever the hours');
  await wait(500);
  await shot('b5-phone-form');
  const sw = await js('document.documentElement.scrollWidth');
  check('390 wide: nothing scrolls sideways with the form open', sw <= 390, String(sw));
  await key('Escape');
  await page.setViewport({ width: 1423, height: 680 });
  await wait(600);
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickButton('+ New project');
  await until(text, (s) => /when do you bill\?/i.test(s));
  await choose('Fixed: a set price, whatever the hours');
  await wait(500);
  await shot('b6-1423x680-form');
  await key('Escape');

  const errors = [...page.consoleErrors];
  check('logs no console errors', errors.length === 0, JSON.stringify(errors));
})
  .then(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} clauses`);
    process.exit(failed ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
