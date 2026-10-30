// P127 BKO-007 — the hands, driven in Chrome the way a person does it: real mouse drags on the canvas, the chooser's
// buttons, a click on a wire and the Delete key, the toast's Undo. A copy of the training app with its whole world on a
// backend of its own. Every check of what changed reads the backend or the files.
//
//   node test/hands-ui.test.mjs [folder for pictures]

import fs from 'node:fs';
import path from 'node:path';
import { createEditor, serve } from '../server.mjs';
import { REAL_APP, freePort, stop, makeCopy, startBackend, seedWorld, hashTree } from './copies.mjs';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let failures = 0;
const ok = (cond, words, detail) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}${!cond && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ''}`);
  if (!cond) failures++;
};
const has = (rule, who) => (Array.isArray(rule) ? rule : [rule]).includes(who);

const { default: puppeteer } = await import('puppeteer-core');
const c = makeCopy(REAL_APP, 'hands-ui');
const shots = path.resolve(process.argv[2] ?? c.work);
fs.mkdirSync(shots, { recursive: true });
const port = await freePort();
const be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
const admin = async (p, init) => {
  for (let i = 0; ; i++) {
    const r = await fetch(base + p, { ...(init ?? {}), headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' } });
    if (r.status !== 429 || i >= 8) return r.json();
    await new Promise((res) => setTimeout(res, (Number(r.headers.get('retry-after')) || 1) * 1000 + 50));
  }
};
const SEC = path.join(c.copy, 'nodegx.security.json');
const AUTO = path.join(c.copy, 'nodegx.automations.json');
const fileEntry = (table) => JSON.parse(fs.readFileSync(SEC, 'utf8')).collections?.[table] ?? null;
const liveEntry = async (table) => (await admin('/admin/permissions')).config.collections?.[table] ?? null;

let server, browser;
try {
  seedWorld(c, base);
  const before = hashTree(c.copy);
  server = await serve(createEditor({ project: c.copy, backend: base, token: c.token }), 0);
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-mock-keychain'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__map?.map && window.__map.nodes.length > 0, { timeout: 30000 });
  // the panel and the safety card sit over the canvas: start from a map with nothing selected
  const centre = (id) =>
    page.evaluate((id) => {
      const s = window.__map, n = s.byId[id];
      return n ? [n.x * s.cam.z + s.cam.x + (n.w * s.cam.z) / 2, (n.y + n.h / 2) * s.cam.z + s.cam.y] : null;
    }, id);
  // a block may sit under a card: move the map so both ends are in the open middle of the screen
  const bringIn = (a, b) =>
    page.evaluate((a, b) => {
      const s = window.__map, A = s.byId[a], B = s.byId[b];
      const z = Math.min(0.55, 1100 / Math.abs(B.x - A.x + B.w));
      s.cam.z = z;
      s.cam.x = 420 - A.x * z;
      s.cam.y = 480 - ((A.y + B.y) / 2 + A.h / 2) * z;
    }, a, b);
  const dragFrom = async (from, to) => {
    await page.mouse.move(...from);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(from[0] + ((to[0] - from[0]) * k) / 12, from[1] + ((to[1] - from[1]) * k) / 12);
    await page.mouse.up();
  };
  const drag = async (a, b) => {
    await bringIn(a, b);
    await dragFrom(await centre(a), await centre(b));
  };
  const handShown = () => page.waitForFunction(() => !document.getElementById('hand').classList.contains('hidden'), { timeout: 5000 }).then(() => true, () => false);
  const handText = () => page.$eval('#hand', (e) => e.innerText);
  // a toast stays up 12 s: each wait first hides the last one, so it can only be satisfied by the gesture's own
  const clearToast = () => page.evaluate(() => (document.getElementById('toast').classList.add('hidden'), document.getElementById('undoLast')?.remove()));
  const toastUndo = () => page.waitForFunction(() => !!document.getElementById('undoLast') && !document.getElementById('toast').classList.contains('hidden'), { timeout: 15000 }).then(() => true, () => false);

  const whos = await page.evaluate(() => window.__map.nodes.filter((n) => n.kind === 'who').map((n) => n.key));
  ok(['public', 'authenticated', 'role:staff', 'maker'].every((w) => whos.includes(w)), 'a WHO column: anyone at all, anyone signed in, the staff group, whoever made the row', whos);
  ok(await page.$eval('#hands', (e) => !e.hidden && /Change it by dragging/.test(e.innerText)), 'the hint bar says what dragging does');
  await page.screenshot({ path: path.join(shots, 'bko-007-01-the-who-column.png') });

  // 1. drag "Anyone signed in" onto Progress
  await drag('w:authenticated', 't:Progress');
  ok(await handShown(), 'dropping it on Progress opens the chooser');
  const t1 = await handText();
  ok(/Anyone signed in may see the rows of Progress\./.test(t1) && /After this: reading directly — Anyone signed in/.test(t1), 'it says what it will do before it does it', t1);
  await page.screenshot({ path: path.join(shots, 'bko-007-02-the-chooser.png') });
  ok((await liveEntry('Progress')) === null && fileEntry('Progress') === null, 'nothing has changed yet, in either place');
  await clearToast();
  await page.click('#handGo');
  ok(await toastUndo(), 'Make it so: the toast says it, with Undo');
  const e1 = await liveEntry('Progress');
  ok(has(e1?.permissions.find, 'authenticated') && JSON.stringify(e1) === JSON.stringify(fileEntry('Progress')), 'the backend and nodegx.security.json both let anyone signed in see Progress', { e1, file: fileEntry('Progress') });
  await page.screenshot({ path: path.join(shots, 'bko-007-03-granted.png') });

  // 2. the wire, shown with the who selected; clicked; cut with Delete
  const whoAt = await centre('w:authenticated');
  await page.mouse.click(...whoAt);
  await page.waitForFunction(() => document.getElementById('panelBody').dataset.node === 'w:authenticated', { timeout: 5000 }).catch(() => {});
  const panel = await page.$eval('#panelBody', (e) => e.innerText);
  ok(/Progress: see/.test(panel) && /✂ cut/.test(panel), 'its panel lists Progress, with a cut', panel);
  // near the table's end the wire runs through the gap between functions and tables, where no block is; the table is
  // moved left of the side panel first
  const wire = await page.evaluate(() => {
    const s = window.__map, t = s.byId['t:Progress'];
    s.cam.z = 0.5;
    s.cam.x = 1000 - t.x * 0.5;
    s.cam.y = 480 - t.y * 0.5;
    // the first point along the wire, from the table back, with no block under it and nothing over the canvas there
    for (let k = 98; k > 40; k--) {
      const at = window.__wirePoint('w:authenticated>t:Progress', k / 100);
      const [wx, wy] = [(at[0] - s.cam.x) / s.cam.z, (at[1] - s.cam.y) / s.cam.z];
      const onBlock = s.nodes.some((n) => wx >= n.x - 4 && wx <= n.x + n.w + 4 && wy >= n.y - 4 && wy <= n.y + n.h + 4);
      if (!onBlock && document.elementFromPoint(at[0], at[1])?.id === 'map') return at;
    }
    return null;
  });
  ok(!!wire, 'the wire from “Anyone signed in” to Progress is drawn');
  await page.mouse.click(...wire);
  ok(await handShown(), 'a click on the wire offers to cut it');
  ok(/Cut it/.test(await handText()), 'with the cut said in words', await handText());
  await page.screenshot({ path: path.join(shots, 'bko-007-04-cut-offered.png') });
  await clearToast();
  await page.keyboard.press('Delete');
  ok(await toastUndo(), 'Delete cuts it, and the toast offers Undo');
  ok((await liveEntry('Progress')) === null && fileEntry('Progress') === null, 'cut: both places are back on the standard rule');

  // 3. Undo, from the toast
  await page.click('#undoLast');
  await page.waitForFunction(() => /Undone/.test(document.getElementById('toast').innerText), { timeout: 10000 }).catch(() => {});
  const e3 = await liveEntry('Progress');
  ok(has(e3?.permissions.find, 'authenticated') && JSON.stringify(e3) === JSON.stringify(fileEntry('Progress')), 'Undo puts the grant back, in both places', e3);

  // 4. a real person dragged: the chooser says it means their kind
  const plain = await page.evaluate(() => window.__map.nodes.find((n) => n.kind === 'person' && !n.person.roles.length)?.id);
  await drag(plain, 't:Lesson');
  ok(await handShown(), 'a real person dropped on Lesson opens the chooser');
  const t4 = await handText();
  ok(/is in no group/.test(t4) && /not one person/.test(t4) && /Anyone signed in may see the rows of Lesson/.test(t4), 'it says the rule is for their kind, not for them', t4);
  await page.keyboard.press('Escape');
  ok(await page.$eval('#hand', (e) => e.classList.contains('hidden')) && (await liveEntry('Lesson')) === null, 'Escape: never mind, nothing changed');

  // 5. a function dropped on a table
  const fn = await page.evaluate(() => window.__map.nodes.find((n) => n.kind === 'fn' && n.fn.deployed)?.id);
  await drag(fn, 't:Signal');
  ok(await handShown() && /whenever a row of Signal is/.test(await handText()), 'a function dropped on Signal asks which change starts it', await handText());
  await page.screenshot({ path: path.join(shots, 'bko-007-05-row-trigger.png') });
  await clearToast();
  await page.click('#handGo');
  ok(await toastUndo(), 'made, with Undo');
  const trs = (await admin('/admin/triggers')).triggers ?? [];
  const tr = trs.find((t) => t.type === 'db-change' && t.dbChange.collection === 'Signal');
  const inFile = fs.existsSync(AUTO) && JSON.parse(fs.readFileSync(AUTO, 'utf8')).triggers.some((t) => t.id === tr?.id);
  ok(!!tr && inFile, 'the backend has the row-change trigger and nodegx.automations.json keeps it', trs);
  ok(await page.evaluate((id) => !!window.__map.byId[`g:${id}`], tr?.id), 'the map draws it as a block under the screens');

  // 6. the clock dropped on a function
  await page.evaluate((fn) => {
    const s = window.__map, n = s.byId[fn];
    s.cam.z = 0.6;
    s.cam.x = 900 - n.x * 0.6;
    s.cam.y = 420 - n.y * 0.6;
  }, fn);
  const clock = await page.$eval('#clock', (e) => {
    const r = e.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  });
  await dragFrom(clock, await centre(fn));
  ok(await handShown(), 'the clock dropped on the function opens the schedule chooser');
  await page.waitForFunction(() => /Every day at 09:00/.test(document.getElementById('cronWords')?.innerText ?? ''), { timeout: 8000 }).catch(() => {});
  ok(/Every day at 09:00\. Next:/.test(await handText()), 'the backend’s own words for it, and the next runs', await handText());
  await page.$eval('#cronText', (e) => e.focus());
  await page.keyboard.type('x');
  await page.waitForFunction(() => document.getElementById('handGo').disabled, { timeout: 8000 }).catch(() => {});
  ok(await page.$eval('#handGo', (e) => e.disabled), 'a schedule the backend can’t read can’t be made');
  await page.keyboard.press('Backspace');
  await page.waitForFunction(() => !document.getElementById('handGo').disabled, { timeout: 8000 }).catch(() => {});
  await page.screenshot({ path: path.join(shots, 'bko-007-06-schedule.png') });
  await clearToast();
  await page.click('#handGo');
  ok(await toastUndo(), 'made, with Undo');
  const sc = ((await admin('/admin/triggers')).triggers ?? []).find((t) => t.type === 'schedule');
  ok(sc?.schedule.cron === '0 9 * * *' && JSON.parse(fs.readFileSync(AUTO, 'utf8')).triggers.some((t) => t.id === sc.id), 'on the backend and in the file', sc);

  // 7. its block, and "Stop it running by itself"
  await page.evaluate((id) => {
    const s = window.__map;
    s.selected = null;
    document.getElementById('panelBody').dataset.node = '';
  }, sc?.id);
  const scAt = await page.evaluate((id) => {
    const s = window.__map, n = s.byId[`g:${id}`];
    s.cam.z = 0.7;
    s.cam.x = 700 - n.x * 0.7;
    s.cam.y = 480 - n.y * 0.7;
    return [700 + 40, 480 + (n.h / 2) * 0.7];
  }, sc?.id);
  await page.mouse.click(...scAt);
  await page.waitForFunction((id) => document.getElementById('panelBody').dataset.node === `g:${id}`, { timeout: 5000 }, sc?.id).catch(() => {});
  ok(!!(await page.$('#removeTrigger')), 'its panel offers to stop it');
  await clearToast();
  await page.click('#removeTrigger');
  ok(await toastUndo(), 'stopped, with Undo');
  ok(!((await admin('/admin/triggers')).triggers ?? []).some((t) => t.id === sc?.id) && !JSON.parse(fs.readFileSync(AUTO, 'utf8')).triggers.some((t) => t.id === sc?.id), 'gone from the backend and the file');
  await page.screenshot({ path: path.join(shots, 'bko-007-07-stopped.png') });

  ok(!errors.length, 'no page error', errors);
  const changed = Object.keys({ ...before, ...hashTree(c.copy) }).filter((k) => before[k] !== hashTree(c.copy)[k]).sort();
  ok(changed.join() === 'nodegx.automations.json,nodegx.security.json', 'the drive changed exactly the two files the gestures write, nothing else in the folder', changed);
} catch (e) {
  ok(false, 'the drive ran to the end', e.stack);
} finally {
  await browser?.close();
  server?.close();
  await stop(be);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
