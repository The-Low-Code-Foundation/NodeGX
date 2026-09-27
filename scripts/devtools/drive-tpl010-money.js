/**
 * TPL-010-M — the planner's money, driven as a DEPLOYED demo with real clicks (§7, M-13).
 *
 * `tpl010Template.test.ts` §6 runs the arithmetic with the clock held; this presses what a person
 * presses — the €, a line, Tick it, Change the item, End it, Add money, Record balance, the card's
 * Billing, the drawer's late money — in the build a visitor gets, and reads the result back out of
 * the browser's store. The demo is dated from the visit, so every date here is worked out from today.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planner-demo <site>/templates/planner --base-url /templates/planner/ --allow-development-engine
 *   node scripts/devtools/drive-tpl010-money.js <site> --path /templates/planner/ [--shots <dir>]
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
  console.error('usage: drive-tpl010-money.js <site-dir|https://origin> [--path /templates/planner/] [--shots <dir>]');
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
  const markOf = (s, id, occurs) => (s.MoneyMark || []).find((m) => m.itemId === `seed-money-${id}` && m.occurs === occurs);

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);

  // ── Arrival: the bottom of the week (M14) ──
  const boot = await until(text, (s) => s.includes('Planner') && s.includes('Break-even'));
  check('M-10 — the week ends with the month, might earn and the lowest point', /Break-even €3,308 · target €3,808/.test(boot) && boot.includes('€1,320 more, weighted (€3,800 if all come through):') && boot.includes('Lowest in six weeks:'), boot.slice(-900));
  check('M-6 — the first box is the late Salon bill', /Due \w{3} \d+ · late\s*\+€640/.test(boot), boot.slice(-700));
  check('M-16 — the Billable tile is budgeted at 46 h (fixed bills first)', boot.includes('This month is planned: 46 h billable'), boot.slice(0, 400));
  await shot('m0-arrival');

  // ── M15: the drawer's first concern is the late money, and it opens it in Money ──
  await clickButton('Shut down');
  const drawer = await until(text, (s) => s.includes('Chase it, or tick it.'));
  check('M-6 / M15 — the evening drawer raises the late Salon money first', /One thing: Salon Collective’s €640 was due on .* and is not ticked\. Chase it, or tick it\./.test(drawer), drawer.slice(0, 600));
  await clickButton('Open it in Money');
  const chased = await until(text, (s) => /did it happen\?/i.test(s));
  check('“Open it in Money” opens that repeat, ready to tick', chased.includes('Salon Collective · last month') && /did it happen\?/i.test(chased) && (await modalOpen()), chased.slice(-800));
  await shot('m1-chased');

  // ── M-1: the modal closes with Escape and a click outside, not a click inside ──
  await clickText('Comes from');
  check('M-1 — a click inside the modal leaves it open', await modalOpen(), '');
  await key('Escape');
  check('M-1 — Escape closes it', !(await modalOpen()), '');
  await clickButton('€');
  await until(modalOpen, (v) => v === true);
  const summary = await text();
  check('M-1 — the € opens Money on the month’s target', summary.includes('This month’s target') && summary.includes('Billable this month') && summary.includes('46 h'), summary.slice(-900));
  await shot('m2-summary');
  await press({ x: 6, y: 6 });
  check('M-1 — a click outside closes it', !(await modalOpen()), '');
  await clickButton('⚙');
  const settings = await until(text, (s) => s.includes('lives in Money now'));
  check('M-1 — Settings holds no money list and none of the six retired fields', settings.includes('Your usual hourly rate') && !/household needs|partner brings|Day you invoice|Money coming and going/i.test(settings), settings.slice(-700));
  await key('Escape');

  // ── M-15: part of it, the rest still owed; then the rest ──
  await clickButton('€');
  await until(modalOpen, (v) => v === true);
  await clickText('Salon Collective · last month');
  await until(text, (s) => /did it happen\?/i.test(s));
  await fill('Amount that moved, €', '400');
  const rest = await until(text, (s) => s.includes('less than was due'));
  check('M11a — less than was due asks what the rest is', rest.includes('The other €240 is:') && rest.includes('Still owed'), rest.slice(-800));
  await clickButton('Tick it');
  const part = await until(store, (s) => (markOf(s, 'salon-last', dayKey(plus(-7))) || {}).doneAmount === 400);
  const pm = markOf(part, 'salon-last', dayKey(plus(-7)));
  check('M-15 — €400 is written as a payment, and the €640 due is kept on the mark', !!pm && pm.payments.length === 1 && Number(pm.amount) === 640 && !pm.lostOn, JSON.stringify(pm));
  const partList = await until(text, (s) => s.includes('€400 of €640 paid'));
  check('M-15 — the line reads “€400 of €640 paid” and is still late, for €240', partList.includes('€400 of €640 paid') && partList.includes('+€240'), partList.slice(-1200));
  await shot('m3-part');
  await clickText('Salon Collective · last month');
  await until(text, (s) => /€400 paid so far/i.test(s));
  check('the rest is prefilled: €240', (await valueOf('Amount that moved, €')) === '240', String(await valueOf('Amount that moved, €')));
  await clickButton('Tick it');
  const closed = await until(store, (s) => (markOf(s, 'salon-last', dayKey(plus(-7))) || {}).doneAmount === 640);
  check('M-6 — €240 more closes it', (markOf(closed, 'salon-last', dayKey(plus(-7))) || {}).payments.length === 2, JSON.stringify(markOf(closed, 'salon-last', dayKey(plus(-7)))));
  await clickButton('Past');
  const past = await until(text, (s) => s.includes('days late'));
  check('M-6 — Past has it, paid today, 7 days late', /Salon Collective · last month[\s\S]{0,80}paid \w{3} \d+ · 7 days late/.test(past), past.slice(-1200));
  await clickButton('Upcoming');
  const noLate = await text();
  check('M-6 — nothing is late now', !noLate.includes('not ticked, counted as if today'), noLate.slice(-1200));

  // ── M-4: one repeat changed by hand survives the item changing ──
  const nextMonth28 = dayKey(new Date(today.getFullYear(), today.getMonth() + 1, 28));
  check('M-4 — next month’s partner line reads “usually €1,500”', noLate.includes('usually €1,500'), noLate.slice(-1400));
  await clickButton('Recurring');
  await until(text, (s) => s.includes('every month on the 28th'));
  await clickText('Partner’s contract');
  await until(text, (s) => s.includes('Change Partner’s contract'));
  await shot('m4-editor');
  await fill('Amount, €', '1600');
  await clickButton('Save');
  const raised = await until(store, (s) => Number(item(s, 'partner').amount) === 1600);
  check('M-4 — Change the item writes €1,600 and leaves the hand-changed mark alone', Number(item(raised, 'partner').amount) === 1600 && Number(markOf(raised, 'partner', nextMonth28).amount) === 1380, JSON.stringify(markOf(raised, 'partner', nextMonth28)));
  await clickButton('Upcoming');
  const upAfter = await until(text, (s) => s.includes('+€1,600'));
  check('M-4 — the other months read €1,600, the changed one still €1,380', upAfter.includes('+€1,600') && upAfter.includes('+€1,380'), upAfter.slice(-1400));

  // ── M-5: End it keeps what was ticked ──
  const coworkRows = (s) => (s.match(/Co-working day/g) || []).length;
  await clickText('Co-working day');
  await until(text, (s) => s.includes('Comes from'));
  await clickButton('End it');
  await until(text, (s) => s.includes('The last one that happens'));
  await shot('m5-end');
  await clickButton('End it');
  const ended = await until(store, (s) => !!item(s, 'cowork').until);
  const until5 = item(ended, 'cowork').until;
  check('M-5 — End it sets the last day, and deletes nothing', !!until5 && ended.MoneyItem.length === raised.MoneyItem.length, until5);
  const upEnded = await until(text, (s) => coworkRows(s) === 0);
  check('M-5 — no co-working line comes after it', coworkRows(upEnded) === 0, upEnded.split('\n').map((l, i, all) => (/Co-working/.test(l) ? all.slice(Math.max(0, i - 2), i + 3).join(' | ') : '')).filter(Boolean).join(' || '));
  await clickButton('Past');
  const pastEnded = await text();
  check('M-5 — the ticked ones stay in Past', coworkRows(pastEnded) >= 3, pastEnded.slice(-900));
  await clickButton('Upcoming');

  // ── M-9 / M9: Add money, with three fields and a schedule ──
  await clickButton('+ Add money');
  await until(text, (s) => s.includes('A label, an amount and a date is all it needs.'));
  await fill('Label', 'Accountant');
  await choose('Goes out');
  await fill('Amount, €', '300');
  await choose('Every three months');
  await shot('m6-add');
  const before6 = await store();
  await clickButton('Add it');
  const added = await until(store, (s) => s.MoneyItem.length === before6.MoneyItem.length + 1);
  const acct = added.MoneyItem.find((i) => i.label === 'Accountant');
  check('M9 — Add money writes a −€300 item every three months from today', !!acct && Number(acct.amount) === -300 && acct.repeat === 'quarterly' && acct.date === dayKey(today), JSON.stringify(acct));
  const upAdded = await until(text, (s) => s.includes('Accountant'));
  check('it is in Upcoming at once', upAdded.includes('Accountant') && upAdded.includes('−€300'), '');

  // ── M-9: Record balance ──
  await clickButton('Record balance');
  await until(text, (s) => s.includes('What your bank says.'));
  await fill('Balance, €', '2900');
  await clickButton('Record it');
  const read = await until(store, (s) => s.BalanceReading.length === 2);
  check('M-9 — Record balance writes a reading for today', read.BalanceReading.some((r) => Number(r.amount) === 2900 && r.date === dayKey(today)), JSON.stringify(read.BalanceReading));
  const head = await until(text, (s) => s.includes('Balance €2,900'));
  check('M-9 — the projection starts from it', head.includes('Balance €2,900'), head.slice(0, 300));

  // ── M23: an hourly bill fills from the hours; M11a lost ──
  check('M23 — Salon’s bill this month reads its hours at €18', /h × €18, from your hours/.test(head), head.slice(-1500));
  await clickText('Northline · AI workshop');
  await until(text, (s) => /did it happen\?/i.test(s));
  await clickButton('Mark as lost');
  const lost = await until(store, (s) => (s.MoneyMark || []).some((m) => m.itemId === 'seed-money-northline' && m.lostOn));
  check('M11a — Mark as lost writes lostOn and takes it out of Upcoming', (lost.MoneyMark || []).some((m) => m.itemId === 'seed-money-northline' && m.lostOn === dayKey(today)), '');
  await clickButton('Past');
  const pastLost = await until(text, (s) => s.includes('€1,120 lost'));
  check('M11a — Past reads “€1,120 lost”', pastLost.includes('€1,120 lost'), pastLost.slice(-900));
  await key('Escape');

  // ── §4.2, M-7, M-17: the card's Billing, + Add a bill, and hoped money ──
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickText('Bramble & Co');
  const card = await until(text, (s) => s.includes('Fixed price'));
  check('M-11 / M-17 — Bramble’s card: fixed, terms, agreed hours, “whatever the hours” and €/h', card.includes('Fixed price · payment terms 7 days · agreed 14 h a month') && card.includes('whatever the hours') && card.includes('an hour so far'), card.slice(0, 1200));
  await shot('m7-card');
  await clickButton('+ Add a bill');
  await until(text, (s) => s.includes('A bill for Bramble & Co'));
  const billDates = await dates();
  check('M-7 — + Add a bill opens the editor with the project and a due date 7 days after today', billDates.includes(dayKey(today)) && billDates.includes(dayKey(plus(7))), JSON.stringify(billDates));
  await key('Escape');
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickText('Uplift');
  await until(text, (s) => s.includes('One-off consulting') && s.includes('Add as hoped money'));
  await clickButton('Add as hoped money');
  await until(text, (s) => s.includes('Hoped money from Uplift'));
  check('M16 — Add as hoped money opens the editor at 25%', (await valueOf('Likelihood, %')) === '25', String(await valueOf('Likelihood, %')));
  await fill('Amount, €', '500');
  const before8 = await store();
  await clickButton('Add it');
  const hoped = await until(store, (s) => s.MoneyItem.length === before8.MoneyItem.length + 1);
  const up8 = hoped.MoneyItem.find((i) => i.projectId === 'seed-uplift');
  check('M16 — it is written as hoped money on Uplift', !!up8 && Number(up8.likelihood) === 25 && Number(up8.amount) === 500, JSON.stringify(up8));
  await key('Escape');
  const week8 = await until(text, (s) => s.includes('Uplift') && s.includes('25%'));
  check('M7 — and the week’s Might earn names it', /Uplift\s*25%/.test(week8), week8.slice(-900));

  // ── M-13: the state survives a reload ──
  await page.navigate(BASE);
  const reloaded = await until(text, (s) => s.includes('Break-even'));
  check('M-13 — the state survives a reload under the v3 key', reloaded.includes('Balance €2,900') && !reloaded.includes('· late'), reloaded.slice(-900));

  // ── The phone breakpoint: the list and the pane take turns (drive-page cannot go under 500px; 600 is under 700) ──
  await page.setViewport({ width: 600, height: 900 });
  await wait(600);
  await clickButton('€');
  await until(modalOpen, (v) => v === true);
  await clickText('Accountant');
  await until(text, (s) => /did it happen\?/i.test(s));
  const listHidden = await js(`(() => { const r = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '+ Add money'); return !r || !r.getClientRects().length; })()`);
  check('under the breakpoint, picking a line shows the pane instead of the list', listHidden === true, String(listHidden));
  await shot('m8-phone-pane');
  await clickButton('‹ Money');
  const listBack = await js(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === '+ Add money' && b.getClientRects().length)`);
  check('‹ Money goes back to the list', listBack === true, String(listBack));
  const sw = await js('document.documentElement.scrollWidth');
  check('and nothing scrolls sideways', sw <= 600, String(sw));
  await key('Escape');

  await page.setViewport({ width: 1423, height: 680 });
  await wait(600);
  await shot('m9-1423x680');
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
