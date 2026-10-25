// The page, driven as a person would, in the installed Chrome (headless), on COPIES: open the map,
// click the Progress table, choose "The staff group" for looking, press "Make it so", read what the
// page says, and check the copy's backend and folder. Then switch the lens and look as a stranger.
//
//   node test/ui.test.mjs [out folder for pictures]

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createEditor, serve } from '../server.mjs';
import { REAL_APP, hashTree, freePort, stop, makeCopy, startBackend, adminClient, applySchema } from './copies.mjs';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let failures = 0;
const ok = (cond, words) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${words}`);
  if (!cond) failures++;
};

const realBefore = hashTree(REAL_APP);
const c = makeCopy(REAL_APP, 'ui');
const shots = path.resolve(process.argv[2] ?? c.work);
const port = await freePort();
const be = await startBackend(c, port);
const base = `http://127.0.0.1:${port}`;
const admin = adminClient(base, c.token);
await applySchema(admin, c.copy);
const server = await serve(createEditor({ project: c.copy, backend: base, token: c.token }), 0);
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__map?.map && window.__map.nodes.length > 0, { timeout: 20000 });
  const counts = await page.evaluate(() => ({ tables: window.__map.nodes.filter((n) => n.kind === 'table').length, fns: window.__map.nodes.filter((n) => n.kind === 'fn').length }));
  ok(counts.tables > 20 && counts.fns === 27, `the map draws ${counts.tables} tables and ${counts.fns} functions`);
  ok(/No table can be opened directly/.test(await page.$eval('#secure', (e) => e.textContent)), 'the safety card (folded to its headline until clicked) says no table can be opened directly');

  const clickBlock = async (id) => {
    const pos = await page.evaluate((id) => {
      const s = window.__map, n = s.byId[id];
      return [n.x * s.cam.z + s.cam.x + 30, (n.y + n.h / 2) * s.cam.z + s.cam.y];
    }, id);
    await page.mouse.click(pos[0], pos[1]);
  };
  await clickBlock('t:Progress');
  await page.waitForSelector('#ruleEditor .pill');
  ok(/Sealed/.test(await page.$eval('#panelBody', (e) => e.innerText)), 'clicking Progress opens its panel, which says it is sealed');
  ok(!(await page.$eval('#applyRule', (b) => !b.disabled)), '“Make it so” waits until something is chosen');

  await page.click('.pill[data-field="read"][data-value="role:staff"]');
  const preview = await page.$eval('#ruleEditor', (e) => e.innerText);
  ok(/After this: reading directly — The staff group/.test(preview), 'choosing shows, before anything happens, what it will mean');
  await page.screenshot({ path: path.join(shots, 'ui-1-chosen.png') });

  await page.click('#applyRule');
  await page.waitForFunction(() => /obeying it now/.test(document.querySelector('#ruleEditor')?.innerText ?? ''), { timeout: 15000 });
  const said = await page.$eval('#ruleEditor', (e) => e.innerText);
  ok(/The backend is obeying it now/.test(said) && /Saved in the app’s folder/.test(said), 'after “Make it so” the page says the backend obeys it and it is saved');
  ok(/Someone not signed in: looking turned away/.test(said), 'and shows the backend’s own dry run in words');
  await page.screenshot({ path: path.join(shots, 'ui-2-saved.png') });

  const live = (await admin('/admin/permissions')).config.collections.Progress;
  ok(live?.permissions?.find === 'role:staff' && live.permissions.create === 'nobody', 'the copy backend has the rule the button set');
  const file = JSON.parse(fs.readFileSync(path.join(c.copy, 'nodegx.security.json'), 'utf8'));
  ok(file.collections.Progress?.permissions?.get === 'role:staff', 'the copy’s nodegx.security.json has it too');

  // The lens: look as someone not signed in.
  // P124-UILENSNOTE: the lens measures now — it runs the backend's functions as that visitor and says what came back,
  // as people.test.mjs reads it for a named person. Read the note once the run is done, not while it is running.
  await page.click('.lens button[data-lens="anon"]');
  await page.waitForFunction(() => window.__map.reach && !window.__map.reach.loading && window.__map.reachQueue.length === 0, { timeout: 90000 });
  const reach = await page.evaluate(() => Object.values(window.__map.reach.tables));
  const note = await page.$eval('#lensNote', (e) => e.innerText);
  const reached = reach.reduce((n, t) => n + t.reached, 0);
  const total = reach.reduce((n, t) => n + (t.total ?? 0), 0);
  const lit = reach.filter((t) => t.reached).length;
  ok(
    new RegExp(`Someone not signed in can reach ${reached} of ${total} rows, in ${lit} of ${reach.length} tables\\. Dark tables: nothing of them reaches anyone not signed in`).test(note),
    `the lens says, measured: “${note.slice(0, 120)}…”`
  );

  // No JSON on screen.
  const text = await page.evaluate(() => document.body.innerText);
  ok(!/[{[]\s*"/.test(text), 'no JSON anywhere on screen');
  ok(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
} finally {
  await browser.close();
  server.close();
  await stop(be);
}
ok(JSON.stringify(hashTree(REAL_APP)) === JSON.stringify(realBefore), 'the real app folder is unchanged');
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
