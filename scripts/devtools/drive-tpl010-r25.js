/**
 * TPL-010-R2.5 — the settings sheet, driven as a DEPLOYED demo with real clicks (R2.5-1…R2.5-4).
 *
 * `tpl010Template.test.ts` §4 runs the arithmetic with the clock held; this presses what a person
 * presses — ⚙, the seven day ticks, *Use the recommendation*, *Plan this month*, every box, Save —
 * in the build a visitor gets, and reads the result back out of the browser's store. The demo is
 * dated from the visit, so every figure here is worked out from today rather than written down.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planner-demo <site>/templates/planner --base-url /templates/planner/ --allow-development-engine
 *   node scripts/devtools/drive-tpl010-r25.js <site> --path /templates/planner/ [--shots <dir>]
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
  console.error('usage: drive-tpl010-r25.js <site-dir|https://origin> [--path /templates/planner/] [--shots <dir>]');
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
  /** The centre of an element found by `finder` (a JS expression returning an element), scrolled into view. */
  const centre = (finder) =>
    js(`(() => {
      const el = ${finder};
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, reachable: !!hit && (hit === el || el.contains(hit) || hit.contains(el)) };
    })()`);
  /** A visible button by its exact words, the last one on the page when several match (the sheets sit last). */
  const buttonFinder = (label, nth = -1) =>
    `(() => { const all = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === ${JSON.stringify(label)} && b.getClientRects().length); return all.at(${nth}); })()`;
  const clickButton = async (label, nth = -1) => {
    const at = await centre(buttonFinder(label, nth));
    if (!at) return false;
    await press(at);
    return true;
  };
  /** A block's tick: the first button of the block whose words are `what`. */
  const tickOf = (what) =>
    `(() => {
      const words = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === ${JSON.stringify(what)} && b.getClientRects().length);
      for (let el = words && words.parentElement; el; el = el.parentElement) {
        const bs = el.querySelectorAll('button');
        if (bs.length >= 4) return bs[0];
      }
      return null;
    })()`;
  /** The box whose label reads `label`, in the last sheet that has one. */
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
  /** Pick in the last visible Dropdown whose options include `label`. React hears the native setter and a change event. */
  const choose = (label) =>
    js(`(() => {
      const selects = [...document.querySelectorAll('select')].filter((s) => [...s.options].some((o) => o.textContent.trim() === ${JSON.stringify(label)}));
      const s = selects.at(-1);
      if (!s) return false;
      const o = [...s.options].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value);
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  /** Type a date into the last visible date field and commit it the way a person does: Enter. */
  const pickDate = async (iso) => {
    const at = await centre(`[...document.querySelectorAll('input[type=date]')].filter((i) => i.getClientRects().length).at(-1)`);
    if (!at) return false;
    await js(`(() => {
      const i = [...document.querySelectorAll('input[type=date]')].filter((x) => x.getClientRects().length).at(-1);
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
  const tickBox = async (label) => {
    const at = await centre(`[...document.querySelectorAll('label')].filter((l) => (l.textContent || '').trim() === ${JSON.stringify(label)} && l.getClientRects().length).at(-1)`);
    if (!at) return false;
    await press(at);
    return true;
  };
  const checked = (label) =>
    js(`(() => {
      const l = [...document.querySelectorAll('label')].filter((x) => (x.textContent || '').trim() === ${JSON.stringify(label)} && x.getClientRects().length).at(-1);
      const box = l && ((l.htmlFor && document.getElementById(l.htmlFor)) || l.parentElement.querySelector('input'));
      return box ? box.checked : null;
    })()`);
  const valueOf = (label) => js(`(() => { const el = ${boxFinder(label)}; return el ? el.value : null; })()`);
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const envTile = async (name) => {
    const t = await text();
    const i = t.indexOf(name);
    return i < 0 ? '' : t.slice(i, i + 60).replace(/\s+/g, ' ');
  };
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dayOf = (i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  };
  const THU = dayOf(3);
  const FRI = dayOf(4);
  const byId = (s, coll, id) => (s[coll] || []).find((r) => r.id === id);

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);

  /** A button whose words START with `prefix` — the recommendation button names its figures. */
  const buttonStarting = (prefix) =>
    `(() => [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim().startsWith(${JSON.stringify(prefix)}) && b.getClientRects().length).at(-1))()`;
  const labelStarting = async (prefix) =>
    js(`(() => { const b = ${buttonStarting(prefix)}; return b ? b.textContent.trim() : null; })()`);
  const clickStarting = async (prefix) => {
    const at = await centre(buttonStarting(prefix));
    if (!at) return false;
    await press(at);
    return true;
  };
  /** The one line of a tile, so a sentence can be read without the whole page. */
  const tileSay = async (name) => {
    const t = await text();
    const i = t.indexOf(name);
    return i < 0 ? '' : t.slice(i, i + 200).split('\n').slice(0, 6).join(' | ');
  };
  const settingsRow = async () => ((await store()) || {}).Settings?.[0] ?? {};
  const openSettings = async () => {
    await clickButton('⚙');
    return until(text, (s) => s.includes('The days you work'));
  };
  /** Working days left in this month, counted the way Logic/Envelopes counts them. */
  const daysLeftFor = (set) => {
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let n = 0;
    for (const d = new Date(today); d.getTime() <= monthEnd.getTime(); d.setDate(d.getDate() + 1)) if (set.includes(d.getDay())) n++;
    return n;
  };
  const daysInMonthFor = (set) => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let n = 0;
    for (const d = new Date(monthStart); d.getTime() <= monthEnd.getTime(); d.setDate(d.getDate() + 1)) if (set.includes(d.getDay())) n++;
    return n;
  };
  const MON_SAT = [1, 2, 3, 4, 5, 6];
  const MON_FRI = [1, 2, 3, 4, 5];

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);

  // ── Arrival: the bar has no Todo link while the address is empty (L6) ──
  const boot = await until(text, (s) => s.includes('Planner') && s.includes('Billable'));
  check('L6 — no Todo link in the bar while Settings.todoUrl is empty', !boot.includes('Todo ↗'), boot.slice(0, 300));
  const billableBefore = await tileSay('Billable');

  // ── R2.5-1: the four sections, the seven ticks, and Saturday ──
  const sheet = await openSettings();
  // A section heading is drawn in the label face, which is uppercased by CSS — so that is what
  // the page actually reads, and what a person actually sees.
  check('R24 — the sheet has all four sections and the link', ['CAPACITY', 'MONEY', 'THE SPLIT', 'GUARDRAILS', 'LINKS'].every((s) => sheet.includes(s)), sheet.slice(0, 900));
  const ticks = await Promise.all(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => checked(d)));
  check('R24 — seven day ticks, Monday to Saturday on and Sunday off', JSON.stringify(ticks) === JSON.stringify([true, true, true, true, true, true, false]), JSON.stringify(ticks));
  check('the capacity line says what the ticks come to', sheet.includes('6 days a week at 6 h is 36 h.'), sheet.slice(0, 700));
  const firstCapacity = daysInMonthFor(MON_SAT) * 6;
  const firstAdmin = Math.round(firstCapacity * 0.1 * 4) / 4;
  const firstLine = await until(
    async () => ((await text()).match(/Recommended ([\d.]+) h — ([\d.]+) h of capacity, less ([\d.]+) h billable and ([\d.]+) h admin\./) || []),
    (m) => m.length > 0
  );
  const firstBuilding = await until(() => valueOf('Building, hours this month'), (v) => v === firstLine[1]);
  check(
    `R2.5-2 — nothing is stored yet, so the boxes hold the recommendation itself (${firstLine[1]} h of ${firstCapacity} h)`,
    Number(firstLine[2]) === firstCapacity && Number(firstLine[4]) === firstAdmin && firstBuilding === firstLine[1] && (await valueOf('Hobby, hours this month')) === '0',
    `${JSON.stringify(firstLine.slice(1))} box=${firstBuilding}`
  );
  await shot('0-settings');

  await tickBox('Sat');
  const unticked = await until(text, (s) => s.includes('5 days a week at 6 h is 30 h.'));
  check('R2.5-1 — unticking Saturday changes the line as it is pressed, before anything is saved', unticked.includes('5 days a week at 6 h is 30 h.') && (await checked('Sat')) === false, unticked.slice(0, 700));

  await clickButton('Save');
  const savedDays = await until(settingsRow, (r) => Array.isArray(r.workingDays) && r.workingDays.length === 5);
  check('R2.5-1 — Save writes workingDays as [1,2,3,4,5]', JSON.stringify(savedDays.workingDays) === JSON.stringify(MON_FRI), JSON.stringify(savedDays.workingDays));
  await key('Escape');
  const billableAfter = await until(tileSay.bind(null, 'Billable'), (s) => s !== billableBefore, 8000);
  const expectDays = daysLeftFor(MON_FRI);
  check(
    `R2.5-1 — the Billable tile now plans over ${expectDays} days, not ${daysLeftFor(MON_SAT)}`,
    new RegExp(`for the ${expectDays} days? left`).test(billableAfter) && billableAfter !== billableBefore,
    `before: ${billableBefore}\n        after: ${billableAfter}`
  );

  // ── R2.5-4, half of it: the ticks come back as they were saved ──
  await page.navigate(BASE);
  await until(text, (s) => s.includes('Planner'));
  const reopened = await openSettings();
  check('R2.5-4 — the ticks survive a reload', (await checked('Sat')) === false && (await checked('Fri')) === true && reopened.includes('5 days a week'), reopened.slice(0, 700));

  // ── R2.5-2 / R25: the recommendations, and the button that takes them ──
  // The capacity is counted here, independently, from the days that are now ticked: 22 Monday-to-
  // Friday days in this month at the 6 h ceiling. Everything else is read off the app's own line,
  // and the check is that its arithmetic closes — capacity, less billable, less a tenth of capacity.
  const capacity = daysInMonthFor(MON_FRI) * 6;
  const recAdmin = Math.round(capacity * 0.1 * 4) / 4;
  const recLine = await until(
    async () => ((await text()).match(/Recommended ([\d.]+) h — ([\d.]+) h of capacity, less ([\d.]+) h billable and ([\d.]+) h admin\./) || []),
    (m) => m.length > 0
  );
  const recBuilding = Number(recLine[1]);
  const billable = Number(recLine[3]);
  check(
    `R2.5-2 — capacity is ${capacity} h (the month's working days at the ceiling), admin a tenth of it, building the rest`,
    Number(recLine[2]) === capacity && Number(recLine[4]) === recAdmin && recBuilding === Math.round((capacity - billable - recAdmin) * 4) / 4,
    JSON.stringify(recLine.slice(1))
  );
  const recSheet = await text();
  check('R25 — the other two recommendations say what rule they come from', recSheet.includes(`Recommended ${recAdmin} h — a tenth of capacity`) && recSheet.includes('Recommended 0 h — hobby is not budgeted'), recSheet.slice(recSheet.indexOf('THE SPLIT'), recSheet.indexOf('THE SPLIT') + 700));
  const useLabel = await labelStarting('Use ');
  check('R25 — the button names the three figures it would write', useLabel === `Use ${recBuilding} / ${recAdmin} / 0 h`, String(useLabel));
  // 🔴 **A figure that has been saved is not quietly replaced by a moving recommendation.** Saving
  // the sheet a moment ago stored the split it was showing (the old six-day one), so that is what
  // the boxes hold now, while the line recommends the five-day figure. R25: the rules advise, the
  // person decides, and the button below is how they take the advice.
  const stored = await valueOf('Building, hours this month');
  check(
    `R25 — the stored split (${firstLine[1]} h) stands while the recommendation moves to ${recBuilding} h`,
    stored === firstLine[1] && recBuilding !== Number(firstLine[1]),
    `box=${stored} recommended=${recBuilding}`
  );

  // Type over one of them, then press Use: the stored figure must be the recommendation.
  await fill('Building, hours this month', '80');
  await clickStarting('Use ');
  const used = await until(settingsRow, (r) => Number(r.buildingHours) === recBuilding);
  check('R2.5-2 — Use the recommendation writes all three, over what was typed', Number(used.buildingHours) === recBuilding && Number(used.adminHours) === recAdmin && Number(used.hobbyHours) === 0, JSON.stringify([used.buildingHours, used.adminHours, used.hobbyHours]));
  const refilled = await until(() => valueOf('Building, hours this month'), (v) => v === String(recBuilding));
  check('R2.5-2 — and the box shows what was saved rather than what was typed', refilled === String(recBuilding), String(refilled));
  await shot('1-recommendation');

  // ── R2.5-2: Plan this month writes the split, and the tiles show it ──
  const plansBefore = ((await store()) || {}).MonthPlan.length;
  await clickButton('Plan this month');
  const planned = await until(store, (s) => s.MonthPlan.length === plansBefore + 1);
  const plan = planned.MonthPlan[planned.MonthPlan.length - 1];
  check(
    `R2.5-2 — Plan this month writes the split and the month's ${daysInMonthFor(MON_FRI)} working days`,
    Number(plan.building) === recBuilding && Number(plan.admin) === recAdmin && Number(plan.hobby) === 0 && Number(plan.workingDays) === daysInMonthFor(MON_FRI),
    JSON.stringify(plan)
  );
  const planLine = await until(text, (s) => s.includes(`${recBuilding} h building.`), 8000);
  check('R2.5-2 — and the sheet says the month is planned at that split', new RegExp(`This month is planned: ${billable} h billable, ${recBuilding} h building\\.`).test(planLine), (planLine.match(/This month is planned[^\n]*/) || [''])[0]);
  await key('Escape');

  // ── R2.5-3: a guardrail is a sentence on its tile, and nothing is red ──
  const before3 = await store();
  await clickButton('+ Add', 0);
  await until(text, (s) => s.includes('New block ·'));
  await choose('The Jazz Room');
  await fill('What it is', 'Guardrail: four hours of the fun stuff');
  await fill('Hours planned', '4');
  await clickButton('Put it in the day');
  const withBlock = await until(store, (s) => s.Block.length === before3.Block.length + 1);
  const hobbyBlock = withBlock.Block.find((b) => !before3.Block.some((x) => x.id === b.id));
  await press(await centre(tickOf('Guardrail: four hours of the fun stuff')));
  await until(text, (s) => s.includes('Time logged'));
  await clickButton('Save');
  await until(store, (s) => (s.Block.find((b) => b.id === hobbyBlock.id) || {}).done === true);
  const hobbyTile = await until(() => tileSay('Hobby'), (s) => s.includes('against your 3 h line'), 8000);
  check('R2.5-3 — four logged hours of hobby against a 3 h line is one sentence on the Hobby tile', /Hobby is at [\d.]+ h this week against your 3 h line\. Fine if it was a Saturday\./.test(hobbyTile), hobbyTile);
  const red = await js(`(() => {
    const t = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === 'Hobby');
    let tile = t;
    for (let el = t && t.parentElement; el; el = el.parentElement) if (el.querySelectorAll('*').length > 6) { tile = el; break; }
    const bad = [...tile.querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundColor).filter((c) => /rgb\\(2[0-9][0-9], (2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9])/.test(c));
    return bad.length;
  })()`);
  check('R2.5-3 — and nothing on that tile is red (R4: reported, never flagged)', red === 0, String(red));
  await shot('2-guardrail');

  // ── R2.5-4: every box round-trips, and every one is a column ──
  const typed = [
    ['Focused hours a day', '7'],
    ['Your usual hourly rate, €', '55'],
    ['Savings target, € a month', '600'],
    ['Lowest balance before red, €', '100'],
    ['Building, hours this month', '50'],
    ['Admin and asks, hours this month', '9'],
    ['Hobby, hours this month', '2'],
    ['Hobby: hours a week before it is mentioned', '3'],
    ['Building: hours a week before it is mentioned', '10'],
    ['Billable: the least % of the week it should be', '40'],
    ['Your todo list’s address', 'https://todo.digitalbricks.io']
  ];
  await openSettings();
  for (const [label, value] of typed) await fill(label, value);
  await clickButton('Save');
  const round = await until(settingsRow, (r) => Number(r.focusHours) === 7 && String(r.todoUrl).includes('todo.digitalbricks.io'));
  check(
    'R2.5-4 — Save writes every field as its own column',
    Number(round.rate) === 55 && Number(round.savingsTarget) === 600 && Number(round.lowWaterMark) === 100 &&
      Number(round.buildingHours) === 50 && Number(round.adminHours) === 9 && Number(round.hobbyHours) === 2 &&
      Number(round.hobbyWeekCeiling) === 3 && Number(round.buildingWeekCeiling) === 10 && Number(round.billableFloorPct) === 40,
    JSON.stringify(round)
  );
  await key('Escape');
  await page.navigate(BASE);
  await until(text, (s) => s.includes('Planner'));
  await openSettings();
  const read = [];
  for (const [label, value] of typed) read.push([label, await valueOf(label), value]);
  const wrong = read.filter(([, saw, want]) => String(saw) !== String(want));
  check('R2.5-4 — and every box reads back the same after a reload', wrong.length === 0, JSON.stringify(wrong));
  await shot('3-round-trip');
  await key('Escape');

  // ── L6: the address fills in, so the bar offers the link ──
  const withLink = await until(text, (s) => s.includes('Todo ↗'), 8000);
  check('L6 — the bar offers Todo ↗ once the address is set', withLink.includes('Todo ↗'), withLink.slice(0, 300));

  // ── The look, at his window and at 1280 ──
  const sw = await js('document.documentElement.scrollWidth');
  check('nothing scrolls sideways at 1280', sw <= 1280, String(sw));
  await page.setViewport({ width: 1423, height: 680 });
  await wait(600);
  await openSettings();
  const reach = await js(`(() => {
    const l = [...document.querySelectorAll('label')].find((x) => (x.textContent || '').trim() === 'Your todo list’s address');
    if (!l) return 'no box';
    l.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = l.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight ? 'reachable' : 'off screen';
  })()`);
  check('R5b — the last box on the sheet can be scrolled to at 1423×680', reach === 'reachable', String(reach));
  await shot('4-1423x680');
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
