// Round 2, driven as a person would in the installed Chrome (headless), on COPIES: a copy of the app
// and a backend of its own holding the app's whole world (its own setup and deploy tools, run from the
// copy). Look as Marie, follow the Course pathway, look as Jo, then one Conversation row's reach.
//
//   node test/people.test.mjs [out folder for pictures]

import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createEditor, serve } from '../server.mjs';
import { REAL_APP, hashTree, freePort, stop, makeCopy, startBackend, adminClient, seedWorld } from './copies.mjs';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let failures = 0;
const ok = (cond, words) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}`);
  if (!cond) failures++;
};

const realBefore = hashTree(REAL_APP);
const c = makeCopy(REAL_APP, 'people');
const shots = path.resolve(process.argv[2] ?? c.work);
const port = await freePort();
const be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
const admin = adminClient(base, c.token);
seedWorld(c, base);
const copyBefore = hashTree(c.copy);
const editor = createEditor({ project: c.copy, backend: base, token: c.token });
const server = await serve(editor, 0);
const url = `http://127.0.0.1:${server.address().port}/`;
// Keys that still work. Deleting a key revokes it; the backend keeps the revoked record.
const keysNow = async () => {
  const r = await admin('/admin/keys');
  return (Array.isArray(r) ? r : r.keys ?? []).filter((k) => !k.revoked).length;
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__map?.map && window.__map.nodes.some((n) => n.kind === 'person'), { timeout: 20000 });
  const people = await page.evaluate(() => window.__map.people.map((p) => p.name));
  ok(people.length === 12 && people.includes('Marie Dubois'), `the People column has the 12 people from the database (${people.join(', ')})`);

  const marie = await page.evaluate(() => window.__map.people.find((p) => p.name === 'Marie Dubois').id);
  const jo = await page.evaluate(() => window.__map.people.find((p) => p.name === 'Jo Whitfield').id);
  const staff = await page.evaluate(() => window.__map.people.find((p) => p.roles.includes('staff')).id);

  // 1. Round 3: what Marie can reach, row by row. A table lights only when rows of it come back to her.
  const reachDone = () => page.waitForFunction(() => window.__map.reach && !window.__map.reach.loading && window.__map.reachQueue.length === 0, { timeout: 90000 });
  const reachOf = () => page.evaluate(() => { const r = window.__map.reach; return { tables: r.tables, tools: [...r.tools], lit: [...(window.__map.lit ?? [])], overlay: window.__map.overlay.map((o) => [o.from, o.to]) }; });
  const rowsOf = (r) => Object.values(r.tables).reduce((n, t) => n + t.reached, 0);
  await page.select('#personPick', marie);
  await reachDone();
  const m = await reachOf();
  const note = await page.$eval('#lensNote', (e) => e.innerText);
  const total = Object.values(m.tables).reduce((n, t) => n + t.total, 0);
  const litTables = Object.entries(m.tables).filter(([, t]) => t.reached).map(([n]) => n);
  ok(new RegExp(`Marie Dubois can reach ${rowsOf(m)} of ${total} rows, in ${litTables.length} of 27 tables`).test(note), `the lens says, measured: “${note.slice(0, 90)}…”`);
  ok(rowsOf(m) > 0 && rowsOf(m) < total / 4, `Marie reaches a little: ${rowsOf(m)} of ${total} rows`);
  ok(litTables.length < 20 && m.tools.includes('course'), `not every table lights up: ${litTables.length} of 27, though course names 23 of them in its code`);
  ok(m.tables.Conversation.reached === 1 && m.tables.Conversation.total === 2, 'Conversation: her one, not Sam’s (1 of 2)');
  ok(!m.tools.includes('learnerProgramme') && !m.tables.CoachNote.reached, 'no staff function, and no coach note, reaches her');
  const toDark = m.overlay.filter(([, to]) => to.startsWith('t:') && !m.tables[to.slice(2)].reached);
  ok(toDark.length === 0, `no pink wire runs to a table nothing of hers came back from (${toDark.length})`);
  const dark = Object.entries(m.tables).filter(([, t]) => !t.reached).map(([n]) => `t:${n}`);
  ok(dark.every((id) => !m.lit.includes(id)), 'every table with none of her rows stays dark');
  await page.screenshot({ path: path.join(shots, 'people-0-marie-reach.png') });
  ok((await keysNow()) === 0, 'no working key is left behind after looking (deleted keys are revoked)');

  // the table explorer, as Marie: her rows lit, the rest dim
  await page.evaluate(() => { location.hash = ''; });
  const pos0 = await page.evaluate(() => { const s = window.__map, n = s.byId['t:Progress']; return [n.x * s.cam.z + s.cam.x + 30, (n.y + n.h / 2) * s.cam.z + s.cam.y]; });
  await page.mouse.click(pos0[0], pos0[1]);
  await page.waitForSelector('tr.r', { timeout: 15000 });
  const lit = await page.evaluate(() => ({ theirs: document.querySelectorAll('tr.r.theirs').length, not: document.querySelectorAll('tr.r.not-theirs').length }));
  ok(lit.theirs === m.tables.Progress.reached && lit.theirs + lit.not === m.tables.Progress.total, `the Progress rows: ${lit.theirs} hers lit, ${lit.not} dim`);

  // the staff member reaches much more; someone not signed in, nothing
  await page.select('#personPick', staff);
  await reachDone();
  const st = await reachOf();
  ok(rowsOf(st) > 3 * rowsOf(m), `the staff member reaches much more: ${rowsOf(st)} rows against Marie’s ${rowsOf(m)}`);
  await page.click('.lens button[data-lens="anon"]');
  await reachDone();
  const an = await reachOf();
  ok(rowsOf(an) === 0, 'someone not signed in reaches no row at all');

  // who sees how much: everyone, ranked
  await page.click('#compareBtn');
  await page.waitForFunction(() => window.__map.everyone && !window.__map.everyone.loading, { timeout: 180000 });
  const ranked = await page.evaluate(() => [...window.__map.everyone.list].sort((a, b) => b.reachedRows - a.reachedRows).map((e) => [e.person.name, e.reachedRows]));
  ok(ranked.length === 13 && ranked[0][0] === 'Richard Osborne' && ranked[ranked.length - 1][1] === 0, `ranked: ${ranked.map(([n, r]) => `${n} ${r}`).join(', ')}`);
  await page.screenshot({ path: path.join(shots, 'people-0-everyone.png') });

  // back to Marie for the pathway
  await page.select('#personPick', marie);
  await reachDone();

  // 2. Follow the Course pathway
  const clickBlock = async (id) => {
    const pos = await page.evaluate((id) => {
      const s = window.__map, n = s.byId[id];
      return [n.x * s.cam.z + s.cam.x + 30, (n.y + n.h / 2) * s.cam.z + s.cam.y];
    }, id);
    await page.mouse.click(pos[0], pos[1]);
  };
  await clickBlock('s:Pages/Course');
  await page.waitForFunction(() => window.__map.pathway?.data, { timeout: 30000 });
  const course = await page.$eval('#panelBody', (e) => e.innerText);
  ok(/Course, as Marie Dubois/.test(course), 'clicking Course opens “Course, as Marie Dubois”');
  ok(/course\s*ran as them/i.test(course), 'course ran as her');
  ok(/A question for my coach/.test(course) && /Parent evening booking/.test(course), 'her real answer shows: her project “Parent evening booking” and her conversation “A question for my coach”');
  ok(/openThread\s*not run/i.test(course) && /changes data/.test(course), 'openThread was not run, and the page says why (it changes data)');
  ok(/learnerProgramme\s*not allowed/i.test(course), 'learnerProgramme is not allowed for her, as the backend says');
  ok(/real runs/.test(course) && /view-as-marie-dubois-by-backend-map/.test(course), 'the panel says these were real runs, with the key’s name (never its secret)');
  ok(!/ngxk_/.test(await page.evaluate(() => document.documentElement.outerHTML)), 'no key secret anywhere in the page');
  await page.waitForFunction(() => document.querySelector('#runs')?.innerText.includes('run by this map, as Marie Dubois'), { timeout: 15000 });
  ok(true, 'the run shows in “What just ran”, marked “run by this map, as Marie Dubois”');
  await page.screenshot({ path: path.join(shots, 'people-1-marie-course.png') });

  // Jo's Course doesn't have Marie's conversation
  await page.select('#personPick', jo);
  await page.waitForFunction(() => window.__map.person?.reach, { timeout: 30000 });
  await clickBlock('s:Pages/Course');
  await page.waitForFunction(() => window.__map.pathway?.data, { timeout: 30000 });
  const joCourse = await page.$eval('#panelBody', (e) => e.innerText);
  ok(/Course, as Jo Whitfield/.test(joCourse) && !/A question for my coach/.test(joCourse), 'as Jo Whitfield, Course does not contain Marie’s conversation');

  // 3. One Conversation row's reach
  await page.click('.lens button[data-lens="all"]');
  await clickBlock('t:Conversation');
  await page.waitForSelector('tr.r[data-row]', { timeout: 15000 });
  const rowId = await page.evaluate(() => window.__map.rows.Conversation.find((r) => r.key === 'conv-l-marie').objectId);
  await page.click(`[data-row="${rowId}"]`);
  await page.click('#findReach');
  await page.waitForFunction(() => window.__map.record?.data && window.__map.record.shown >= window.__map.record.data.people.length, { timeout: 120000 });
  const reach = await page.$eval('#panelBody', (e) => e.innerText);
  ok(/2 of 12 people can reach this row/.test(reach), `“${reach.match(/\d+ of \d+ people can reach this row[^.]*/)?.[0]}”`);
  ok(/Marie Dubois[^\n]*gets it through course and exportMine/.test(reach), 'Marie gets it through course and exportMine');
  ok(/Richard Osborne[^\n]*gets it through learnerProgramme[^\n]*learnerId = l-marie/.test(reach), 'the staff member gets it through learnerProgramme, asked with this row’s learnerId');
  ok(/Jo Whitfield[^\n]*can’t reach it/.test(reach), 'Jo Whitfield can’t reach it');
  ok(/Nobody can open it directly/.test(reach) && /Someone not signed in can’t/.test(reach), 'nobody can open it directly, someone not signed in included');
  ok(/openThread was not run/.test(reach), 'what wasn’t checked is listed (openThread, …)');
  const recLit = await page.evaluate(() => ({ wires: window.__map.overlay.length, tags: Object.values(window.__map.tags).filter((t) => t.text === 'REACHES IT').length }));
  ok(recLit.tags === 2 && recLit.wires >= 6, `on the map: 2 people tagged REACHES IT, ${recLit.wires} pink pathways`);
  await page.screenshot({ path: path.join(shots, 'people-2-row-reach.png') });

  const text = await page.evaluate(() => document.body.innerText);
  ok(!/[{[]\s*"\w+"\s*:/.test(text), 'no JSON anywhere on screen');
  ok((await keysNow()) === 0, 'every key the map made no longer works');
  ok(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
} finally {
  await browser.close();
  server.close();
  await stop(be);
}
const copyAfter = hashTree(c.copy);
ok(JSON.stringify(copyAfter) === JSON.stringify(copyBefore), 'the copy’s folder is unchanged: looking writes nothing');
ok(JSON.stringify(hashTree(REAL_APP)) === JSON.stringify(realBefore), 'the real app folder is unchanged');
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
