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

  // 1. Look as Marie
  await page.select('#personPick', marie);
  await page.waitForFunction(() => window.__map.person?.reach, { timeout: 30000 });
  const note = await page.$eval('#lensNote', (e) => e.innerText);
  ok(/As Marie Dubois: the backend lets them run 12 of 27 functions and open 0 tables directly/.test(note), `the lens says, from the backend: “${note.slice(0, 110)}…”`);
  const lit = await page.evaluate(() => window.__map.overlay.length);
  ok(lit === 12, `12 pink pathways light up, one to each function the backend offers her (${lit})`);
  ok((await keysNow()) === 0, 'no working key is left behind after looking (deleted keys are revoked)');

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
  await page.waitForSelector('[data-row]', { timeout: 15000 });
  const rowId = await page.evaluate(() => window.__map.rows.Conversation.find((r) => r.key === 'conv-l-marie').objectId);
  await page.click(`[data-row="${rowId}"]`);
  await page.click('#findReach');
  await page.waitForFunction(() => window.__map.record?.data, { timeout: 120000 });
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
